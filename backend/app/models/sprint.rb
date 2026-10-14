# frozen_string_literal: true

class Sprint < ApplicationRecord
  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :project
  has_many :issues, dependent: :nullify

  # ── Enums ─────────────────────────────────────────────────────────────────────
  enum :status, { planning: 0, active: 1, completed: 2 }, default: :planning

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :name, presence: true, length: { maximum: 200 }
  validates :start_date, presence: true, if: :active?
  validates :end_date, presence: true, if: :active?
  validate :end_date_after_start_date
  validate :only_one_active_sprint, on: :update, if: :will_save_change_to_status?

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :for_project, ->(project) { where(project: project) }
  scope :active, -> { where(status: :active) }
  scope :planning, -> { where(status: :planning) }
  scope :completed, -> { where(status: :completed) }
  scope :ordered, -> { order(start_date: :asc, created_at: :asc) }

  # ── Instance methods ──────────────────────────────────────────────────────────
  def start!(s_date: nil, e_date: nil)
    raise 'Sprint already active or completed' unless planning?
    raise 'Another sprint is already active' if project.sprints.active.where.not(id: id).exists?

    final_start = s_date || start_date || Date.today
    final_end = e_date || end_date || (final_start + 14.days)
    update!(status: :active, start_date: final_start, end_date: final_end)
  end

  def complete!(move_incomplete_to: nil)
    raise 'Sprint is not active' unless active?

    transaction do
      if move_incomplete_to
        incomplete_issues = issues.where.not(status: :done)
        incomplete_issues.update_all(sprint_id: move_incomplete_to.id)
      end
      update!(status: :completed, end_date: end_date || Date.today)
    end
  end

  def story_points_total
    issues.sum(:story_points) || 0
  end

  def story_points_completed
    issues.done.sum(:story_points) || 0
  end

  def story_points_remaining
    story_points_total - story_points_completed
  end

  private

  def end_date_after_start_date
    return unless start_date && end_date

    errors.add(:end_date, 'must be after the start date') if end_date <= start_date
  end

  def only_one_active_sprint
    return unless active?

    existing = project.sprints.active.where.not(id: id)
    errors.add(:status, 'only one sprint can be active at a time') if existing.exists?
  end
end
