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
                  format: { with: /\A[A-Z][A-Z0-9]{1,9}\z/, message: 'must be 2-10 uppercase letters/digits, starting with a letter' },
                  length: { minimum: 2, maximum: 10 }
  validates :description, length: { maximum: 2000 }

  # ── Callbacks ─────────────────────────────────────────────────────────────────
  before_validation :upcase_key
  after_create :add_owner_as_member

  # ── Enums ─────────────────────────────────────────────────────────────────────
  enum :status, { active: 0, archived: 1 }, default: :active

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :active, -> { where(status: :active) }
  scope :archived, -> { where(status: :archived) }
  scope :for_user, ->(user) { joins(:project_members).where(project_members: { user_id: user.id }) }

  # ── Instance methods ──────────────────────────────────────────────────────────
  def next_issue_number
    issues.maximum(:number).to_i + 1
  end

  def member?(user)
    project_members.exists?(user: user)
  end

  def role_for(user)
    project_members.find_by(user: user)&.role
  end

  private

  def upcase_key
    self.key = key&.upcase
  end

  def add_owner_as_member
    project_members.find_or_create_by(user: owner) do |pm|
      pm.role = :owner
    end
  end
end
