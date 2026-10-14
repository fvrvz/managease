# frozen_string_literal: true

class Project < ApplicationRecord
  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :owner, class_name: 'User'
  has_many :project_members, dependent: :destroy
  has_many :members, through: :project_members, source: :user
  has_many :sprints, dependent: :destroy
  has_many :epics, dependent: :destroy
  has_many :issues, dependent: :destroy
  has_many :labels, dependent: :destroy
  has_many :comments, through: :issues

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :name, presence: true, length: { maximum: 200 }
  validates :key, presence: true,
                  uniqueness: { case_sensitive: false },
                  format: { with: /\A[A-Za-z0-9_\-]{2,10}\z/, message: 'must be 2-10 letters, numbers, hyphens or underscores' }
  validates :description, length: { maximum: 2000 }

  # ── Callbacks ─────────────────────────────────────────────────────────────────
  before_validation :upcase_key
  after_create :setup_defaults

  # ── Enums ─────────────────────────────────────────────────────────────────────
  enum :status, { active: 0, archived: 1 }, default: :active

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :active, -> { where(status: :active) }
  scope :archived, -> { where(status: :archived) }
  scope :for_user, ->(user) {
    left_outer_joins(:project_members)
      .where('projects.owner_id = :uid OR project_members.user_id = :uid', uid: user.id)
      .distinct
  }

  # ── Instance methods ──────────────────────────────────────────────────────────
  def next_issue_number
    issues.maximum(:number).to_i + 1
  end

  def member?(user)
    owner_id == user.id || project_members.exists?(user: user)
  end

  def role_for(user)
    return :owner if owner_id == user.id
    project_members.find_by(user: user)&.role
  end

  def active_sprint
    sprints.find_by(status: :active)
  end

  DEFAULT_WORKFLOW_STATUSES = [
    { id: 'todo', title: 'To Do', category: 'todo', color: '#94a3b8', x: 80, y: 140 },
    { id: 'in_progress', title: 'In Progress', category: 'in_progress', color: '#3b82f6', x: 380, y: 140 },
    { id: 'in_review', title: 'In Review', category: 'in_progress', color: '#8b5cf6', x: 680, y: 140 },
    { id: 'done', title: 'Done', category: 'done', color: '#22c55e', x: 980, y: 140 }
  ].freeze

  DEFAULT_TRANSITIONS = [
    { id: 't1', from: 'todo', to: 'in_progress', name: 'Start Work' },
    { id: 't2', from: 'in_progress', to: 'in_review', name: 'Submit for Review' },
    { id: 't3', from: 'in_review', to: 'done', name: 'Approve & Complete' },
    { id: 't4', from: 'in_review', to: 'in_progress', name: 'Request Changes' },
    { id: 't5', from: 'in_progress', to: 'todo', name: 'Stop Work' },
    { id: 't6', from: 'done', to: 'todo', name: 'Reopen' }
  ].freeze

  DEFAULT_WORKFLOW = DEFAULT_WORKFLOW_STATUSES

  def workflow_data
    raw = has_attribute?(:workflow_statuses) && workflow_statuses.present? ? workflow_statuses : nil
    raw = JSON.parse(raw) if raw.is_a?(String)

    if raw.is_a?(Hash)
      data = raw.with_indifferent_access
      data[:statuses] ||= DEFAULT_WORKFLOW_STATUSES
      data[:transitions] ||= DEFAULT_TRANSITIONS
      data[:strict] = data[:strict] != false
      data
    elsif raw.is_a?(Array)
      {
        statuses: raw,
        transitions: DEFAULT_TRANSITIONS,
        strict: true
      }.with_indifferent_access
    else
      {
        statuses: DEFAULT_WORKFLOW_STATUSES,
        transitions: DEFAULT_TRANSITIONS,
        strict: true
      }.with_indifferent_access
    end
  end

  def configured_workflow
    workflow_data[:statuses]
  end

  def workflow_transitions
    workflow_data[:transitions] || []
  end

  def strict_workflow?
    workflow_data[:strict] != false
  end

  def allowed_transition?(from_status, to_status)
    return true if from_status.to_s == to_status.to_s
    return true unless strict_workflow?

    transitions = workflow_transitions
    return true if transitions.blank?

    transitions.any? do |t|
      (t[:from].to_s == from_status.to_s || t['from'].to_s == from_status.to_s) &&
        (t[:to].to_s == to_status.to_s || t['to'].to_s == to_status.to_s)
    end
  end

  private

  def upcase_key
    self.key = key&.to_s&.strip&.upcase
  end

  def setup_defaults
    # Ensure owner is registered as owner in project_members
    project_members.find_or_create_by(user: owner) do |pm|
      pm.role = :owner
    end

    # Default agile labels
    [
      { name: 'frontend', color: '#3B82F6' },
      { name: 'backend', color: '#10B981' },
      { name: 'bug', color: '#EF4444' },
      { name: 'feature', color: '#8B5CF6' },
      { name: 'design', color: '#EC4899' },
      { name: 'devops', color: '#F59E0B' }
    ].each do |lbl|
      labels.find_or_create_by(name: lbl[:name]) do |l|
        l.color = lbl[:color]
      end
    end

    # Default initial sprint
    sprints.find_or_create_by(name: 'Sprint 1') do |s|
      s.goal = "Initial sprint for #{name}"
      s.status = :planning
    end
  end
end
