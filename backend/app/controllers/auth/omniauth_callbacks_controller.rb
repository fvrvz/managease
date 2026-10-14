# frozen_string_literal: true

module Auth
  class OmniauthCallbacksController < Devise::OmniauthCallbacksController
    skip_before_action :verify_authenticity_token

    def openid_connect
      @user = User.from_omniauth(request.env['omniauth.auth'])

      if @user.persisted?
        token = @user.generate_jwt
        redirect_to "#{ENV.fetch('FRONTEND_URL', 'http://localhost:5173')}/auth/callback?token=#{token}"
      else
        redirect_to "#{ENV.fetch('FRONTEND_URL', 'http://localhost:5173')}/auth/login?error=oidc_failed"
      end
    end

    def failure
      redirect_to "#{ENV.fetch('FRONTEND_URL', 'http://localhost:5173')}/auth/login?error=#{failure_message}"
    end

    private

    def failure_message
      exception = env['omniauth.error']
      exception.present? ? CGI.escape(exception.message) : 'auth_failed'
    end
  end
end
