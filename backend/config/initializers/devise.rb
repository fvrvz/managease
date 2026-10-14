# frozen_string_literal: true

Devise.setup do |config|
  # The secret key used by Devise. Devise uses this key to generate
  # random tokens. Changing this key will render invalid all existing
  # confirmation, reset password and unlock tokens in the database.
  config.secret_key = ENV.fetch('DEVISE_SECRET_KEY', Rails.application.secret_key_base)

  # ==> Mailer Configuration
  config.mailer_sender = ENV.fetch('MAILER_FROM', 'noreply@managease.io')

  # ==> ORM configuration
  require 'devise/orm/active_record'

  # ==> Configuration for any authentication mechanism
  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]

  # ==> Configuration for :database_authenticatable
  config.stretches = Rails.env.test? ? 1 : 12

  # ==> Configuration for :confirmable
  config.reconfirmable = true
  config.confirm_within = 3.days

  # ==> Configuration for :rememberable
  config.remember_for = 2.weeks

  # ==> Configuration for :validatable
  config.password_length = 8..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/

  # ==> Configuration for :lockable
  config.lock_strategy = :failed_attempts
  config.unlock_strategy = :email
  config.maximum_attempts = 10
  config.unlock_in = 1.hour

  # ==> JWT Configuration
  local_cfg = Rails.application.config.try(:auth)&.dig(:local) || {}
  config.jwt do |jwt|
    jwt.secret = local_cfg[:jwt_secret] || ENV['JWT_SECRET_KEY'] || ENV['JWT_SECRET'] || Rails.application.secret_key_base
    jwt.dispatch_requests = [
      ['POST', %r{^/auth/login$}],
      ['POST', %r{^/auth/register$}]
    ]
    jwt.revocation_requests = [
      ['DELETE', %r{^/auth/logout$}]
    ]
    expiry_hours = (local_cfg[:jwt_expiry_hours] || ENV['JWT_EXPIRY_HOURS'] || 24).to_i
    jwt.expiration_time = expiry_hours.hours.to_i
  end

  # ==> Navigational formats
  config.navigational_formats = []

  # ==> Skip session storage
  config.skip_session_storage = [:http_auth, :token_auth]
end
