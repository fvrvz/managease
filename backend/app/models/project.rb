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

  DEFAULT_WORKFLOW = [
    { id: 'todo', title: 'To Do', category: 'todo', color: '#94a3b8' },
    { id: 'in_progress', title: 'In Progress', category: 'in_progress', color: '#3b82f6' },
    { id: 'in_review', title: 'In Review', category: 'in_progress', color: '#8b5cf6' },
    { id: 'done', title: 'Done', category: 'done', color: '#22c55e' }
  ].freeze

  def configured_workflow
    if has_attribute?(:workflow_statuses) && workflow_statuses.present?
      workflow_statuses.is_a?(String) ? JSON.parse(workflow_statuses) : workflow_statuses
    else
      DEFAULT_WORKFLOW
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
