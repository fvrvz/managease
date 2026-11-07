# frozen_string_literal: true

# AI-assisted Excel import service.
#
# Accepts a spreadsheet file, converts all sheets into a compact text
# representation, sends it to an LLM provider, and returns a structured
# JSON preview of epics / sprints / issues ready for the user to confirm
# before the actual database commit.
#
# Supported providers:  openai  |  gemini  |  ollama
# Config is stored per-project in projects.ai_import_settings (jsonb):
#   {
#     "provider"   => "openai",          # openai | gemini | ollama
#     "api_key"    => "<secret>",        # for openai / gemini
#     "model"      => "gpt-4o-mini",     # optional model override
#     "base_url"   => "http://...",      # for ollama
#     "enabled"    => true,
#     "hint"       => "..."              # optional free-text project context
#   }

require 'roo'
require 'net/http'
require 'json'

class AiImportService
  class ConfigError    < StandardError; end
  class LlmError       < StandardError; end
  class InvalidFormat  < StandardError; end

  MAX_SHEET_ROWS   = 200  # rows per sheet sent to LLM
  MAX_CELL_LENGTH  = 120  # truncate long cell text
  MAX_PROMPT_CHARS = 28_000

  SYSTEM_PROMPT = <<~PROMPT.freeze
    You are a project management assistant. The user will provide spreadsheet data.
    Your job is to extract project tasks from it regardless of its format, terminology,
    or structure.

    Return ONLY a valid JSON object with this exact schema (no markdown, no code fences):
    {
      "summary": {
        "epics_count": <integer>,
        "sprints_count": <integer>,
        "issues_count": <integer>,
        "sheets_analysed": [<sheet name strings>],
        "notes": "<brief human-readable description of what was detected>"
      },
      "epics": [
        { "name": "...", "description": "...", "color": "#6366F1" }
      ],
      "sprints": [
        { "name": "...", "goal": "...", "start_date": "YYYY-MM-DD or null", "end_date": "YYYY-MM-DD or null" }
      ],
      "issues": [
        {
          "title": "...",
          "description": "...",
          "issue_type": "task|story|bug|subtask",
          "priority": "lowest|low|medium|high|highest",
          "status": "todo|in_progress|in_review|done",
          "story_points": <integer or null>,
          "epic": "<epic name or null>",
          "sprint": "<sprint name or null>",
          "assignee": "<email or name or null>",
          "due_date": "YYYY-MM-DD or null",
          "labels": ["label1", "label2"]
        }
      ]
    }

    Rules:
    - Infer issue_type from context (deliverable → story, defect → bug, sub-item → subtask, etc.)
    - Infer priority from wording (critical/urgent/blocker → highest, low/minor → low, default → medium)
    - Treat hierarchical numbering (1.0, 1.1, 1.1.1) as Epic → Story → Subtask nesting
    - Map Gantt-style horizontal date headers into sprint start/end dates where possible
    - If a column's purpose is ambiguous, use context to make the best guess
    - Skip purely decorative or empty rows
    - Do NOT include any text outside the JSON object
  PROMPT

  attr_reader :project, :current_user, :file, :settings

  def initialize(project, current_user, file)
    @project      = project
    @current_user = current_user
    @file         = file
    @settings     = (project.ai_import_settings || {}).with_indifferent_access
  end

  # Returns { success: true, preview: <structured hash> } or raises
  def analyze
    validate_config!

    spreadsheet_text = extract_spreadsheet_text
    llm_response     = call_llm(spreadsheet_text)
    parsed           = parse_llm_response(llm_response)

    { success: true, preview: parsed }
  end

  # Commits the confirmed preview payload to the database.
  # `payload` is the same hash returned by `analyze`.preview after any
  # user edits on the frontend.
  def commit(payload)
    payload = payload.with_indifferent_access
    imported = { epics: 0, sprints: 0, issues: 0 }
    errors   = []

    ActiveRecord::Base.transaction do
      # 1. Epics
      epic_map = {}
      Array(payload[:epics]).each do |ep|
        name = ep[:name].to_s.strip
        next if name.blank?

        epic = project.epics.find_or_create_by!(name: name) do |e|
          e.color  = ep[:color].presence || '#6366F1'
          e.status = :todo
          e.description = ep[:description].to_s
        end
        epic_map[name] = epic
        imported[:epics] += 1
      rescue StandardError => e
        errors << "Epic '#{name}': #{e.message}"
      end

      # 2. Sprints
      sprint_map = {}
      Array(payload[:sprints]).each do |sp|
        name = sp[:name].to_s.strip
        next if name.blank?

        sprint = project.sprints.find_or_create_by!(name: name) do |s|
          s.status     = :planning
          s.goal       = sp[:goal].to_s
          s.start_date = parse_date(sp[:start_date])
          s.end_date   = parse_date(sp[:end_date])
        end
        sprint_map[name] = sprint
        imported[:sprints] += 1
      rescue StandardError => e
        errors << "Sprint '#{name}': #{e.message}"
      end

      # 3. Issues
      Array(payload[:issues]).each do |iss|
        title = iss[:title].to_s.strip
        next if title.blank?

        issue = project.issues.build(
          title:        title,
          description:  iss[:description].to_s,
          issue_type:   safe_enum(iss[:issue_type], %w[task story bug subtask], 'task'),
          priority:     safe_enum(iss[:priority],   %w[lowest low medium high highest], 'medium'),
          status:       safe_enum(iss[:status],      %w[todo in_progress in_review done], 'todo'),
          story_points: iss[:story_points].presence&.to_i,
          due_date:     parse_date(iss[:due_date]),
          sprint:       sprint_map[iss[:sprint].to_s],
          epic:         epic_map[iss[:epic].to_s],
          assignee:     find_user(iss[:assignee]),
          reporter:     current_user
        )

        if issue.save
          attach_labels(issue, Array(iss[:labels]))
          imported[:issues] += 1
        else
          errors << "Issue '#{title}': #{issue.errors.full_messages.join(', ')}"
        end
      end

      raise ActiveRecord::Rollback if errors.any? && imported[:issues].zero?
    end

    {
      success: errors.empty? || imported[:issues].positive?,
      imported: imported,
      errors:   errors
    }
  end

  private

  # ── Config validation ──────────────────────────────────────────────────────

  def validate_config!
    raise ConfigError, 'AI import is not enabled for this project' unless settings[:enabled]

    provider = settings[:provider].to_s
    raise ConfigError, "Unknown provider '#{provider}'" unless %w[openai gemini ollama].include?(provider)

    if %w[openai gemini].include?(provider)
      raise ConfigError, "API key is required for provider '#{provider}'" if settings[:api_key].blank?
    end
  end

  # ── Spreadsheet → text ────────────────────────────────────────────────────

  def extract_spreadsheet_text
    spreadsheet = open_spreadsheet
    sheets_text = []

    spreadsheet.sheets.each_with_index do |sheet_name, idx|
      next if idx > 4  # limit to first 5 sheets

      spreadsheet.default_sheet = sheet_name
      next if spreadsheet.last_row.nil?

      rows = []
      max_row = [spreadsheet.last_row, MAX_SHEET_ROWS].min
      (spreadsheet.first_row..max_row).each do |r|
        row = spreadsheet.row(r)
        next if row.all?(&:blank?)

        cells = row.map { |c| truncate_cell(c) }
        rows << cells.join(' | ')
      end

      next if rows.empty?

      sheets_text << "=== Sheet: #{sheet_name} ===\n#{rows.join("\n")}"
    end

    full_text = sheets_text.join("\n\n")
    # Hard truncate to avoid exceeding LLM context limits
    full_text[0, MAX_PROMPT_CHARS]
  end

  def open_spreadsheet
    original_filename = file.respond_to?(:original_filename) ? file.original_filename : File.basename(file.to_s)
    ext = File.extname(original_filename).downcase

    case ext
    when '.xlsx' then Roo::Excelx.new(file.path)
    when '.xls'  then Roo::Excel.new(file.path)
    when '.csv'  then Roo::CSV.new(file.path)
    else
      raise InvalidFormat, "Unsupported file format: #{ext}"
    end
  rescue StandardError => e
    raise InvalidFormat, e.message
  end

  def truncate_cell(cell)
    return '' if cell.nil?
    cell.to_s.strip.truncate(MAX_CELL_LENGTH)
  end

  # ── LLM dispatch ──────────────────────────────────────────────────────────

  def call_llm(spreadsheet_text)
    user_message = build_user_message(spreadsheet_text)

    case settings[:provider].to_s
    when 'openai'  then call_openai(user_message)
    when 'gemini'  then call_gemini(user_message)
    when 'ollama'  then call_ollama(user_message)
    end
  end

  def build_user_message(spreadsheet_text)
    hint = settings[:hint].to_s.strip
    msg  = "Analyse this project spreadsheet and extract all tasks:\n\n#{spreadsheet_text}"
    msg += "\n\nAdditional context from the project owner: #{hint}" if hint.present?
    msg
  end

  # ── OpenAI ────────────────────────────────────────────────────────────────

  def call_openai(user_message)
    model = settings[:model].presence || 'gpt-4o-mini'
    uri   = URI('https://api.openai.com/v1/chat/completions')

    body = {
      model:    model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: user_message }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    }

    response = post_json(uri, body, {
      'Authorization' => "Bearer #{settings[:api_key]}",
      'Content-Type'  => 'application/json'
    })

    data = JSON.parse(response)
    data.dig('choices', 0, 'message', 'content') or
      raise LlmError, "Unexpected OpenAI response: #{response[0, 300]}"
  end

  # ── Gemini ────────────────────────────────────────────────────────────────

  def call_gemini(user_message)
    model = settings[:model].presence || 'gemini-1.5-flash'
    api_key = settings[:api_key]
    uri = URI("https://generativelanguage.googleapis.com/v1beta/models/#{model}:generateContent?key=#{api_key}")

    body = {
      contents: [
        {
          parts: [
            { text: "#{SYSTEM_PROMPT}\n\n#{user_message}" }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    }

    response = post_json(uri, body, { 'Content-Type' => 'application/json' })
    data = JSON.parse(response)
    data.dig('candidates', 0, 'content', 'parts', 0, 'text') or
      raise LlmError, "Unexpected Gemini response: #{response[0, 300]}"
  end

  # ── Ollama ────────────────────────────────────────────────────────────────

  def call_ollama(user_message)
    base_url = settings[:base_url].presence || 'http://localhost:11434'
    model    = settings[:model].presence || 'llama3'
    uri      = URI("#{base_url}/api/chat")

    body = {
      model:    model,
      stream:   false,
      format:   'json',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: user_message }
      ]
    }

    response = post_json(uri, body, { 'Content-Type' => 'application/json' })
    data = JSON.parse(response)
    data.dig('message', 'content') or
      raise LlmError, "Unexpected Ollama response: #{response[0, 300]}"
  end

  # ── HTTP helper ───────────────────────────────────────────────────────────

  def post_json(uri, body, headers, timeout: 120)
    http              = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl      = uri.scheme == 'https'
    http.read_timeout = timeout
    http.open_timeout = 15

    request = Net::HTTP::Post.new(uri.request_uri)
    headers.each { |k, v| request[k] = v }
    request.body = body.to_json

    response = http.request(request)
    raise LlmError, "LLM request failed (HTTP #{response.code}): #{response.body[0, 400]}" unless response.is_a?(Net::HTTPSuccess)

    response.body
  rescue Net::ReadTimeout, Net::OpenTimeout => e
    raise LlmError, "LLM request timed out: #{e.message}"
  rescue SocketError, Errno::ECONNREFUSED => e
    raise LlmError, "Cannot reach LLM provider: #{e.message}"
  end

  # ── Parse LLM JSON response ───────────────────────────────────────────────

  def parse_llm_response(raw)
    # Strip markdown code fences if the model wrapped the JSON
    cleaned = raw.to_s.strip.gsub(/\A```(?:json)?\s*/i, '').gsub(/\s*```\z/, '')
    parsed  = JSON.parse(cleaned)

    # Basic structure validation
    unless parsed.is_a?(Hash) && parsed.key?('issues')
      raise LlmError, "LLM returned unexpected structure: #{cleaned[0, 200]}"
    end

    parsed.with_indifferent_access
  rescue JSON::ParserError => e
    raise LlmError, "LLM returned invalid JSON: #{e.message}"
  end

  # ── Helpers ───────────────────────────────────────────────────────────────

  def safe_enum(value, allowed, default)
    v = value.to_s.downcase.strip
    allowed.include?(v) ? v : default
  end

  def parse_date(val)
    return nil if val.blank?
    val.is_a?(Date) || val.is_a?(Time) ? val.to_date : Date.parse(val.to_s)
  rescue StandardError
    nil
  end

  def find_user(identifier)
    return nil if identifier.blank?
    str = identifier.to_s.strip.downcase
    User.find_by('LOWER(email) = ? OR LOWER(name) = ?', str, str) ||
      project.members.find { |m| m.email.downcase == str || m.name.downcase == str }
  end

  def attach_labels(issue, label_names)
    label_names.each do |name|
      next if name.blank?
      label = project.labels.find_or_create_by!(name: name.to_s.strip) do |l|
        l.color = '#64748B'
      end
      issue.labels << label unless issue.labels.include?(label)
    rescue StandardError => e
      Rails.logger.warn "AiImportService label error: #{e.message}"
    end
  end
end
