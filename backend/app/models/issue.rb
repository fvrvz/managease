# frozen_string_literal: true

class Issue < ApplicationRecord
  self.inheritance_column = nil # Disable Rails STI so 'type' is not reserved

  acts_as_list scope: [:sprint_id, :status]

  def type=(val)
    self.issue_type = val
  end

  def type
    issue_type
  end

  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :project
  belongs_to :sprint, optional: true
  belongs_to :epic, optional: true
  belongs_to :assignee, class_name: 'User', optional: true
  belongs_to :reporter, class_name: 'User', optional: true
  belongs_to :parent, class_name: 'Issue', optional: true
  has_many :subtasks, class_name: 'Issue', foreign_key: :parent_id, dependent: :destroy
  has_many :comments, dependent: :destroy
  has_many :attachments, dependent: :destroy
  has_many :issue_labels, dependent: :destroy
  has_many :labels, through: :issue_labels
  has_many :outward_links, class_name: 'IssueLink', foreign_key: :source_id, dependent: :destroy
  has_many :inward_links, class_name: 'IssueLink', foreign_key: :target_id, dependent: :destroy
  has_many :work_logs, dependent: :destroy

  # ── Enums ─────────────────────────────────────────────────────────────────────
  enum :issue_type, { story: 0, bug: 1, task: 2, subtask: 3 }, default: :task
  enum :status, { backlog: 0, todo: 1, in_progress: 2, in_review: 3, done: 4 }, default: :backlog
  enum :priority, { lowest: 0, low: 1, medium: 2, high: 3, highest: 4 }, default: :medium

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :title, presence: true, length: { maximum: 500 }
  validates :description, length: { maximum: 10_000 }
  validates :story_points, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }, allow_nil: true
  validates :number, uniqueness: { scope: :project_id }
  validates :issue_type, presence: true
  validates :status, presence: true
  validates :priority, presence: true

  # ── Callbacks ─────────────────────────────────────────────────────────────────
  before_validation :set_issue_number, on: :create
  before_save :set_resolved_at

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :for_project, ->(project) { where(project: project) }
  scope :for_sprint, ->(sprint) { where(sprint: sprint) }
  scope :backlog, -> { where(sprint: nil).or(where(status: :backlog)) }
  scope :open, -> { where.not(status: :done) }
  scope :done, -> { where(status: :done) }
  scope :by_priority, -> { order(priority: :desc) }
  scope :by_position, -> { order(position: :asc) }
  scope :assigned_to, ->(user) { where(assignee: user) }
  scope :search, ->(query) { where('title ILIKE ? OR description ILIKE ?', "%#{query}%", "%#{query}%") }

  # ── Instance methods ──────────────────────────────────────────────────────────
  def issue_key
    "#{project.key}-#{number}"
  end

  def move_to_sprint(sprint, status: nil)
    transaction do
      self.sprint = sprint
      self.status = status if status.present?
      save!
    end
  end

  private

  def set_issue_number
    self.number = project.next_issue_number if project && number.blank?
  end

  def set_resolved_at
    if status_changed? && done?
      self.resolved_at = Time.current
    elsif status_changed? && !done?
      self.resolved_at = nil
    end
  end
end
