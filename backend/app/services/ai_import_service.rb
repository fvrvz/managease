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

  # Returns { success: true, preview: <structured hash>, usage: <hash> } or raises
  def analyze
    validate_config!

    spreadsheet_text = extract_spreadsheet_text
    llm_response     = call_llm(spreadsheet_text)
    parsed           = parse_llm_response(llm_response)

    {
      success: true,
      preview: parsed,
      usage:   @last_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated_cost_usd: 0.0 }
    }
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

        epic = project.epics.find_by('LOWER(name) = ?', name.downcase) ||
               project.epics.create!(name: name) do |e|
                 e.color  = ep[:color].presence || '#6366F1'
                 e.status = :todo
                 e.description = ep[:description].to_s
               end
        epic_map[name.downcase] = epic
        imported[:epics] += 1
      rescue StandardError => e
        errors << "Epic '#{name}': #{e.message}"
      end

      # 2. Sprints
      sprint_map = {}
      Array(payload[:sprints]).each do |sp|
        name = sp[:name].to_s.strip
        next if name.blank?

        sprint = project.sprints.find_by('LOWER(name) = ?', name.downcase) ||
                 project.sprints.create!(name: name) do |s|
                   s.status     = :planning
                   s.goal       = sp[:goal].to_s
                   s.start_date = parse_date(sp[:start_date])
                   s.end_date   = parse_date(sp[:end_date])
                 end
        sprint_map[name.downcase] = sprint
        imported[:sprints] += 1
      rescue StandardError => e
        errors << "Sprint '#{name}': #{e.message}"
      end

      # 3. Issues
      Array(payload[:issues]).each do |iss|
        title = iss[:title].to_s.strip
        next if title.blank?

        sprint_name = iss[:sprint].to_s.strip
        epic_name   = iss[:epic].to_s.strip

        assigned_sprint = sprint_name.present? ? (sprint_map[sprint_name.downcase] || project.sprints.find_by('LOWER(name) = ?', sprint_name.downcase)) : nil
        assigned_epic   = epic_name.present? ? (epic_map[epic_name.downcase] || project.epics.find_by('LOWER(name) = ?', epic_name.downcase)) : nil

        default_status = assigned_sprint ? 'todo' : 'backlog'

        issue = project.issues.build(
          title:        title,
          description:  iss[:description].to_s,
          issue_type:   safe_enum(iss[:issue_type], %w[task story bug subtask], 'task'),
          priority:     safe_enum(iss[:priority],   %w[lowest low medium high highest], 'medium'),
          status:       safe_enum(iss[:status],     %w[todo in_progress in_review done backlog], default_status),
          story_points: iss[:story_points].presence&.to_i,
          due_date:     parse_date(iss[:due_date]),
          sprint:       assigned_sprint,
          epic:         assigned_epic,
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

  # ── Model Discovery & Token Limits ──────────────────────────────────────────

  def self.fetch_available_models(provider:, api_key:, base_url: nil)
    case provider.to_s
    when 'gemini'
      fetch_gemini_models(api_key)
    when 'openai'
      fetch_openai_models(api_key)
    when 'ollama'
      fetch_ollama_models(base_url)
    else
      raise LlmError, "Unknown provider: #{provider}"
    end
  end

  def self.fetch_gemini_models(api_key)
    raise LlmError, 'Gemini API key is required' if api_key.blank?

    uri = URI("https://generativelanguage.googleapis.com/v1beta/models?key=#{api_key}")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 10
    http.read_timeout = 15

    req = Net::HTTP::Get.new(uri.request_uri)
    res = http.request(req)

    if res.code == '400' || res.code == '403'
      raise LlmError, "Invalid API key or access denied (HTTP #{res.code})"
    elsif !res.is_a?(Net::HTTPSuccess)
      raise LlmError, "Failed to list Gemini models (HTTP #{res.code}): #{res.body[0, 200]}"
    end

    data = JSON.parse(res.body)
    raw_models = data['models'] || []

    raw_models.select do |m|
      Array(m['supportedGenerationMethods']).include?('generateContent')
    end.map do |m|
      id = m['name'].to_s.sub(%r{\Amodels/}, '')
      {
        id: id,
        name: m['displayName'].presence || id,
        description: m['description'].to_s.truncate(150),
        input_token_limit: m['inputTokenLimit'],
        output_token_limit: m['outputTokenLimit']
      }
    end.sort_by { |m| m[:id].include?('flash') ? 0 : 1 }
  rescue JSON::ParserError
    raise LlmError, 'Failed to parse Gemini models list'
  end

  def self.fetch_openai_models(api_key)
    raise LlmError, 'OpenAI API key is required' if api_key.blank?

    uri = URI('https://api.openai.com/v1/models')
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 10
    http.read_timeout = 15

    req = Net::HTTP::Get.new(uri.request_uri)
    req['Authorization'] = "Bearer #{api_key}"
    res = http.request(req)

    if res.code == '401'
      raise LlmError, 'Invalid OpenAI API key (HTTP 401)'
    elsif !res.is_a?(Net::HTTPSuccess)
      raise LlmError, "Failed to list OpenAI models (HTTP #{res.code}): #{res.body[0, 200]}"
    end

    data = JSON.parse(res.body)
    raw_models = data['data'] || []

    raw_models.select do |m|
      id = m['id'].to_s
      id.start_with?('gpt-4o', 'gpt-4-turbo', 'gpt-3.5', 'o1', 'o3')
    end.map do |m|
      id = m['id'].to_s
      {
        id: id,
        name: id,
        description: "OpenAI #{id}",
        input_token_limit: id.include?('mini') ? 128_000 : 128_000,
        output_token_limit: 16_384
      }
    end.sort_by { |m| m[:id] }
  rescue JSON::ParserError
    raise LlmError, 'Failed to parse OpenAI models list'
  end

  def self.fetch_ollama_models(base_url)
    base = base_url.presence || 'http://localhost:11434'
    uri = URI("#{base}/api/tags")
    http = Net::HTTP.new(uri.host, uri.port)
    http.open_timeout = 5
    http.read_timeout = 10

    req = Net::HTTP::Get.new(uri.request_uri)
    res = http.request(req)

    unless res.is_a?(Net::HTTPSuccess)
      raise LlmError, "Cannot reach Ollama at #{base} (HTTP #{res.code})"
    end

    data = JSON.parse(res.body)
    raw_models = data['models'] || []

    raw_models.map do |m|
      name = m['name'].to_s
      size_mb = (m['size'].to_f / 1_048_576.0).round(1)
      {
        id: name,
        name: name,
        description: "Local model (#{size_mb} MB)",
        input_token_limit: 8192,
        output_token_limit: 4096
      }
    end
  rescue StandardError => e
    raise LlmError, "Cannot connect to Ollama at #{base}: #{e.message}"
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
    usage = data['usage'] || {}
    pt = usage['prompt_tokens'].to_i
    ct = usage['completion_tokens'].to_i
    tt = usage['total_tokens'].to_i
    @last_usage = {
      provider: 'openai',
      model: model,
      prompt_tokens: pt,
      completion_tokens: ct,
      total_tokens: tt,
      estimated_cost_usd: estimate_cost('openai', model, pt, ct).round(6)
    }

    data.dig('choices', 0, 'message', 'content') or
      raise LlmError, "Unexpected OpenAI response: #{response[0, 300]}"
  end

  # ── Gemini ────────────────────────────────────────────────────────────────

  def call_gemini(user_message, model_override: nil)
    clean_model = (model_override || settings[:model].presence || 'gemini-1.5-flash').to_s.strip.sub(%r{\Amodels/}, '')
    api_key     = settings[:api_key]
    uri         = URI("https://generativelanguage.googleapis.com/v1beta/models/#{clean_model}:generateContent?key=#{api_key}")

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

    begin
      response = post_json(uri, body, { 'Content-Type' => 'application/json' })
    rescue LlmError => e
      # If experimental/preview model (e.g. gemini-3.8-flash) hit the 20-requests/day Free Tier quota,
      # automatically fall back to gemini-1.5-flash (which offers 1,500 requests/day).
      if clean_model != 'gemini-1.5-flash' && e.message.include?('Quota exceeded')
        Rails.logger.warn "Gemini model #{clean_model} hit daily quota. Falling back to gemini-1.5-flash..."
        return call_gemini(user_message, model_override: 'gemini-1.5-flash')
      end

      raise e
    end

    data = JSON.parse(response)

    usage = data['usageMetadata'] || {}
    pt = usage['promptTokenCount'].to_i
    ct = usage['candidatesTokenCount'].to_i
    tt = usage['totalTokenCount'].to_i
    @last_usage = {
      provider: 'gemini',
      model: model_override ? "#{clean_model} (auto-fallback)" : clean_model,
      prompt_tokens: pt,
      completion_tokens: ct,
      total_tokens: tt,
      estimated_cost_usd: estimate_cost('gemini', clean_model, pt, ct).round(6)
    }

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

    pt = data['prompt_eval_count'].to_i
    ct = data['eval_count'].to_i
    tt = pt + ct
    @last_usage = {
      provider: 'ollama',
      model: model,
      prompt_tokens: pt,
      completion_tokens: ct,
      total_tokens: tt,
      estimated_cost_usd: 0.0
    }

    data.dig('message', 'content') or
      raise LlmError, "Unexpected Ollama response: #{response[0, 300]}"
  end

  # ── Cost Estimation ───────────────────────────────────────────────────────

  def estimate_cost(provider, model, prompt_tokens, completion_tokens)
    return 0.0 if provider.to_s == 'ollama'

    case provider.to_s
    when 'gemini'
      if model.to_s.include?('pro')
        (prompt_tokens * 1.25 / 1_000_000.0) + (completion_tokens * 5.00 / 1_000_000.0)
      else
        (prompt_tokens * 0.075 / 1_000_000.0) + (completion_tokens * 0.30 / 1_000_000.0)
      end
    when 'openai'
      if model.to_s.include?('mini')
        (prompt_tokens * 0.15 / 1_000_000.0) + (completion_tokens * 0.60 / 1_000_000.0)
      else
        (prompt_tokens * 2.50 / 1_000_000.0) + (completion_tokens * 10.00 / 1_000_000.0)
      end
    else
      0.0
    end
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

    unless response.is_a?(Net::HTTPSuccess)
      if response.code == '429'
        err_json = (JSON.parse(response.body) rescue {})
        msg = err_json.dig('error', 'message') || err_json.dig('message') || response.body[0, 250]
        raise LlmError, "Rate limit / Quota exceeded (HTTP 429): #{msg}. Note: Free-tier Gemini keys have strict per-minute limits (15 RPM). Please switch model to 'gemini-1.5-flash' or verify quota in Google AI Studio."
      elsif response.code == '404'
        err_json = (JSON.parse(response.body) rescue {})
        msg = err_json.dig('error', 'message') || response.body[0, 200]
        raise LlmError, "Model not found (HTTP 404): #{msg}. Please choose an active model via 'Fetch Available Models'."
      else
        raise LlmError, "LLM request failed (HTTP #{response.code}): #{response.body[0, 400]}"
      end
    end

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
