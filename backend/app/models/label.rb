# frozen_string_literal: true

class Label < ApplicationRecord
  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :project
  has_many :issue_labels, dependent: :destroy
  has_many :issues, through: :issue_labels

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :name, presence: true,
                   length: { maximum: 50 },
                   uniqueness: { scope: :project_id, case_sensitive: false }
  validates :color, presence: true,
                    format: { with: /\A#[0-9A-Fa-f]{6}\z/, message: 'must be a valid hex color' }

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :for_project, ->(project) { where(project: project) }
  scope :alphabetical, -> { order(name: :asc) }
end
