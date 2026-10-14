# frozen_string_literal: true

oidc_cfg = Rails.application.config.try(:auth)&.dig(:oidc) || {}
oidc_enabled = oidc_cfg[:enabled] == true || ENV['OIDC_ENABLED'] == 'true'

if oidc_enabled
  require 'omniauth/openid_connect'
  Rails.application.config.middleware.use OmniAuth::Builder do
    provider :openid_connect,
      name: :openid_connect,
      scope: oidc_cfg[:scopes] || [:openid, :email, :profile],
      response_type: :code,
      discovery: true,
      issuer: oidc_cfg[:issuer] || ENV['OIDC_ISSUER'],
      client_auth_method: :basic,
      client_options: {
        identifier: oidc_cfg[:client_id] || ENV['OIDC_CLIENT_ID'],
        secret: oidc_cfg[:client_secret] || ENV['OIDC_CLIENT_SECRET'],
        redirect_uri: oidc_cfg[:redirect_uri] || ENV.fetch('OIDC_REDIRECT_URI', "#{ENV.fetch('APP_URL', 'http://localhost:3000')}/auth/oidc/callback")
      }
  end
end

OmniAuth.config.logger = Rails.logger
OmniAuth.config.allowed_request_methods = [:post, :get]
