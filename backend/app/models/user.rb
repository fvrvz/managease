# frozen_string_literal: true

class User < ApplicationRecord
  oidc_cfg = Rails.application.config.try(:auth)&.dig(:oidc) || {}
  oidc_enabled = oidc_cfg[:enabled] == true || ENV['OIDC_ENABLED'] == 'true'

  devise_modules = [
    :database_authenticatable,
    :registerable,
    :recoverable,
    :rememberable,
    :validatable,
    :jwt_authenticatable
  ]
  if oidc_enabled
    devise_modules << :omniauthable
    devise *devise_modules, jwt_revocation_strategy: JwtDenylist, omniauth_providers: [:openid_connect]
  else
    devise *devise_modules, jwt_revocation_strategy: JwtDenylist
  end

  # ── Associations ──────────────────────────────────────────────────────────────
  has_many :project_members, dependent: :destroy
  has_many :projects, through: :project_members
  has_many :owned_projects, class_name: 'Project', foreign_key: :owner_id, dependent: :destroy
  has_many :assigned_issues, class_name: 'Issue', foreign_key: :assignee_id, dependent: :nullify
  has_many :reported_issues, class_name: 'Issue', foreign_key: :reporter_id, dependent: :nullify
  has_many :comments, dependent: :destroy
  has_one_attached :avatar

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :name, presence: true, length: { maximum: 100 }
  validates :email, presence: true, uniqueness: { case_sensitive: false }

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :active, -> { where(locked_at: nil) }
  scope :by_email, ->(email) { where('email ILIKE ?', "%#{email}%") }

  # ── OmniAuth ──────────────────────────────────────────────────────────────────
  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
      user.email = auth.info.email
      user.name = auth.info.name || auth.info.email.split('@').first
      user.password = Devise.friendly_token[0, 20]
      user.skip_confirmation!
    end
  end

  # ── JWT payload ───────────────────────────────────────────────────────────────
  def jwt_payload
    {
      'sub' => id,
      'email' => email,
      'name' => name,
      'role' => role
    }
  end

  # ── Instance methods ──────────────────────────────────────────────────────────
  def display_name
    name.presence || email.split('@').first
  end

  def avatar_url
    return nil unless avatar.attached?

    Rails.application.routes.url_helpers.rails_blob_url(avatar, only_path: true)
  end

  # ── Global role (admin vs user) ───────────────────────────────────────────────
  enum :role, { user: 0, admin: 1 }, default: :user
end
