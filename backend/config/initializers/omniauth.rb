# frozen_string_literal: true

if ENV['OIDC_ENABLED'] == 'true'
  Rails.application.config.middleware.use OmniAuth::Builder do
    provider :openid_connect,
      name: :openid_connect,
      scope: [:openid, :email, :profile],
      response_type: :code,
      discovery: true,
      issuer: ENV.fetch('OIDC_ISSUER'),
      client_auth_method: :basic,
      client_options: {
        identifier: ENV.fetch('OIDC_CLIENT_ID'),
        secret: ENV.fetch('OIDC_CLIENT_SECRET'),
        redirect_uri: ENV.fetch('OIDC_REDIRECT_URI', "#{ENV.fetch('APP_URL', 'http://localhost:3000')}/auth/openid_connect/callback")
      }
  end
end

OmniAuth.config.logger = Rails.logger
OmniAuth.config.allowed_request_methods = [:post, :get]
