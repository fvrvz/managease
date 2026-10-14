# frozen_string_literal: true

require 'yaml'
require 'erb'

auth_config_file = Rails.root.join('config/auth.yml')

if File.exist?(auth_config_file)
  raw_config = ERB.new(File.read(auth_config_file)).result
  loaded_config = YAML.safe_load(raw_config, aliases: true)
  env_config = loaded_config[Rails.env] || loaded_config['default'] || {}
  Rails.application.config.auth = ActiveSupport::HashWithIndifferentAccess.new(env_config)
else
  Rails.application.config.auth = ActiveSupport::HashWithIndifferentAccess.new({
    local: {
      enabled: true,
      jwt_secret: ENV['JWT_SECRET'] || Rails.application.secret_key_base,
      jwt_expiry_hours: (ENV['JWT_EXPIRY_HOURS'] || 24).to_i,
      password_min_length: 6
    },
    oidc: {
      enabled: ENV['OIDC_ENABLED'] == 'true',
      client_id: ENV['OIDC_CLIENT_ID'],
      client_secret: ENV['OIDC_CLIENT_SECRET'],
      issuer: ENV['OIDC_ISSUER'],
      redirect_uri: ENV['OIDC_REDIRECT_URI'] || 'http://localhost:3000/auth/oidc/callback'
    }
  })
end

