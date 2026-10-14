# frozen_string_literal: true

class IssueLabel < ApplicationRecord
  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :issue
  belongs_to :label

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :issue_id, uniqueness: { scope: :label_id }
end
