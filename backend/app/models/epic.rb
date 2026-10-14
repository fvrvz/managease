# frozen_string_literal: true

class Epic < ApplicationRecord
  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :project
  belongs_to :assignee, class_name: 'User', optional: true
  has_many :issues, dependent: :nullify

  # ── Enums ─────────────────────────────────────────────────────────────────────
  enum :status, { todo: 0, in_progress: 1, done: 2 }, default: :todo

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :name, presence: true, length: { maximum: 200 }
  validates :description, length: { maximum: 5000 }
  validates :color, format: { with: /\A#[0-9A-Fa-f]{6}\z/, message: 'must be a valid hex color' }, allow_blank: true
  validate :end_date_after_start_date

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :for_project, ->(project) { where(project: project) }
  scope :open, -> { where.not(status: :done) }
  scope :ordered, -> { order(start_date: :asc, created_at: :asc) }

  # ── Instance methods ──────────────────────────────────────────────────────────
  def completion_percentage
    total = issues.count
    return 0 if total.zero?

    (issues.where(status: 'done').count.to_f / total * 100).round
  end

  def story_points_total
    issues.sum(:story_points)
  end

  def story_points_completed
    issues.where(status: 'done').sum(:story_points)
  end

  private

  def end_date_after_start_date
    return unless start_date && end_date

    errors.add(:end_date, 'must be after the start date') if end_date <= start_date
  end
end
