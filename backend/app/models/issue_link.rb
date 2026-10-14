# frozen_string_literal: true

class IssueLink < ApplicationRecord
  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :source, class_name: 'Issue'
  belongs_to :target, class_name: 'Issue'
  belongs_to :created_by, class_name: 'User'

  # ── Enums ─────────────────────────────────────────────────────────────────────
  enum :link_type, {
    blocks: 0,       # source blocks target
    is_blocked_by: 1, # source is blocked by target
    duplicates: 2,   # source duplicates target
    is_duplicated_by: 3, # source is duplicated by target
    relates_to: 4    # generic relation
  }, default: :relates_to

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :link_type, presence: true
  validates :source_id, presence: true
  validates :target_id, presence: true
  validates :source_id, uniqueness: { scope: [:target_id, :link_type] }
  validate :cannot_link_to_self

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :for_issue, ->(issue) { where(source: issue).or(where(target: issue)) }

  private

  def cannot_link_to_self
    errors.add(:target_id, 'cannot link an issue to itself') if source_id == target_id
  end
end
