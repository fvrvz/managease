# frozen_string_literal: true

class Comment < ApplicationRecord
  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :issue
  belongs_to :author, class_name: 'User'

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :body, presence: true, length: { maximum: 5000 }

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :for_issue, ->(issue) { where(issue: issue) }
  scope :ordered, -> { order(created_at: :asc) }

  # ── Instance methods ──────────────────────────────────────────────────────────
  def editable_by?(user)
    author == user || user.admin?
  end
end
