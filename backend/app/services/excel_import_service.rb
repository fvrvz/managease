# frozen_string_literal: true

require 'roo'

class ExcelImportService
  class InvalidFormatError < StandardError; end

  attr_reader :project, :current_user, :file, :imported_count, :errors

  def initialize(project, current_user, file)
    @project = project
    @current_user = current_user
    @file = file
    @imported_count = 0
    @errors = []
  end

  def call
    spreadsheet = open_spreadsheet
    sheet = spreadsheet.sheet(0)

    return { success: false, errors: ['Spreadsheet is empty'] } if sheet.last_row.nil? || sheet.last_row < 2

    headers = extract_headers(sheet.row(1))
    validate_headers!(headers)

    ActiveRecord::Base.transaction do
      (2..sheet.last_row).each do |row_idx|
        row_data = map_row(headers, sheet.row(row_idx))
        next if row_data[:title].blank?

        process_row(row_data, row_idx)
      end

      if errors.any? && imported_count.zero?
        raise ActiveRecord::Rollback
      end
    end

    {
      success: errors.empty? || imported_count.positive?,
      imported: { issues_count: imported_count },
      errors: errors
    }
  end

  private

  def open_spreadsheet
    original_filename = file.respond_to?(:original_filename) ? file.original_filename : File.basename(file.to_s)
    ext = File.extname(original_filename).downcase

    case ext
    when '.xlsx' then Roo::Excelx.new(file.path)
    when '.xls'  then Roo::Excel.new(file.path)
    when '.csv'  then Roo::CSV.new(file.path)
    else
      raise InvalidFormatError, "Unsupported file format #{ext}. Use .xlsx, .xls, or .csv"
    end
  rescue StandardError => e
    raise InvalidFormatError, e.message
  end

  def extract_headers(header_row)
    header_row.map do |cell|
      val = cell.to_s.strip.downcase.tr(' _-', '')
      normalize_header(val)
    end
  end

  def normalize_header(header)
    case header
    when /title|summary|issuename|task|name/ then :title
    when /description|desc|details/ then :description
    when /type|issuetype/ then :issue_type
    when /status|state/ then :status
    when /priority|severity/ then :priority
    when /points|storypoints|estimate/ then :story_points
    when /sprint|sprintname/ then :sprint
    when /epic|epicname/ then :epic
    when /assignee|assignedto|email/ then :assignee
    when /due|duedate/ then :due_date
    when /label|labels|tags/ then :labels
    else :unknown
    end
  end

  def validate_headers!(headers)
    unless headers.include?(:title)
      raise InvalidFormatError, "Spreadsheet must contain a 'Title' or 'Summary' column"
    end
  end

  def map_row(headers, row)
    data = {}
    headers.each_with_index do |header, idx|
      next if header == :unknown

      data[header] = row[idx]
    end
    data
  end

  def process_row(data, row_idx)
    sprint = find_or_create_sprint(data[:sprint])
    epic = find_or_create_epic(data[:epic])
    assignee = find_assignee(data[:assignee])

    issue_type = parse_issue_type(data[:issue_type])
    status = parse_status(data[:status])
    priority = parse_priority(data[:priority])
    story_points = data[:story_points].to_f if data[:story_points].present? && data[:story_points].to_f >= 0

    issue = project.issues.build(
      title: data[:title].to_s.strip,
      description: data[:description].to_s.strip,
      issue_type: issue_type,
      status: status,
      priority: priority,
      story_points: story_points,
      sprint: sprint,
      epic: epic,
      assignee: assignee,
      reporter: current_user,
      due_date: parse_date(data[:due_date])
    )

    if issue.save
      attach_labels(issue, data[:labels]) if data[:labels].present?
      @imported_count += 1
    else
      @errors << "Row #{row_idx}: #{issue.errors.full_messages.join(', ')}"
    end
  end

  def find_or_create_sprint(name)
    return nil if name.blank?

    name_str = name.to_s.strip
    project.sprints.find_or_create_by!(name: name_str) do |s|
      s.status = :planning
    end
  rescue StandardError => e
    @errors << "Sprint creation failed for '#{name}': #{e.message}"
    nil
  end

  def find_or_create_epic(name)
    return nil if name.blank?

    name_str = name.to_s.strip
    project.epics.find_or_create_by!(name: name_str) do |e|
      e.color = '#3B82F6'
      e.status = :todo
    end
  rescue StandardError => e
    @errors << "Epic creation failed for '#{name}': #{e.message}"
    nil
  end

  def find_assignee(identifier)
    return nil if identifier.blank?

    str = identifier.to_s.strip.downcase
    user = User.find_by('LOWER(email) = ? OR LOWER(name) = ?', str, str)
    return user if user

    # Or match project members
    project.members.find { |m| m.email.downcase == str || m.name.downcase == str }
  end

  def parse_issue_type(val)
    return :task if val.blank?

    case val.to_s.downcase.strip
    when /bug|defect|issue/ then :bug
    when /story|feature|user story/ then :story
    when /subtask|sub-task/ then :subtask
    else :task
    end
  end

  def parse_status(val)
    return :todo if val.blank?

    case val.to_s.downcase.strip
    when /backlog/ then :backlog
    when /progress|doing|dev/ then :in_progress
    when /review|qa|testing/ then :in_review
    when /done|complete|resolved|closed/ then :done
    else :todo
    end
  end

  def parse_priority(val)
    return :medium if val.blank?

    case val.to_s.downcase.strip
    when /lowest/ then :lowest
    when /low/ then :low
    when /high/ then :high
    when /highest|critical|blocker/ then :highest
    else :medium
    end
  end

  def parse_date(val)
    return nil if val.blank?

    val.is_a?(Date) || val.is_a?(Time) ? val.to_date : Date.parse(val.to_s)
  rescue StandardError
    nil
  end

  def attach_labels(issue, label_str)
    names = label_str.to_s.split(/[,;]/).map(&:strip).reject(&:blank?)
    names.each do |label_name|
      label = project.labels.find_or_create_by!(name: label_name) do |l|
        l.color = '#64748B'
      end
      issue.labels << label unless issue.labels.include?(label)
    end
  rescue StandardError => e
    @errors << "Label assignment failed: #{e.message}"
  end
end
