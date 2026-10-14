# frozen_string_literal: true

class ProjectMember < ApplicationRecord
  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :project
  belongs_to :user

  # ── Enums ─────────────────────────────────────────────────────────────────────
  enum :role, { viewer: 0, member: 1, admin: 2, owner: 3 }, default: :member

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :user_id, uniqueness: { scope: :project_id, message: 'is already a member of this project' }
  validates :role, presence: true

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :owners, -> { where(role: :owner) }
  scope :admins, -> { where(role: :admin) }
  scope :active_members, -> { where(role: [:member, :admin, :owner]) }

  # ── Instance methods ──────────────────────────────────────────────────────────
  def can_manage?
    admin? || owner?
  end

  def can_edit?
    member? || admin? || owner?
  end
end
