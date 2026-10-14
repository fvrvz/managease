# frozen_string_literal: true

module Auth
  class RegistrationsController < Devise::RegistrationsController
    respond_to :json

    before_action :configure_sign_up_params, only: [:create]
    before_action :configure_account_update_params, only: [:update]

    private

    def respond_with(resource, _opts = {})
      if resource.persisted?
        token = request.env['warden-jwt_auth.token']
        render json: {
          message: 'Signed up successfully.',
          token: token,
          tokens: {
            accessToken: token
          },
          user: UserSerializer.new(resource).serializable_hash[:data]
        }, status: :created
      else
        render json: {
          error: 'Registration failed.',
          details: resource.errors.full_messages
        }, status: :unprocessable_entity
      end
    end

    def configure_sign_up_params
      devise_parameter_sanitizer.permit(:sign_up, keys: [:name, :email, :password, :password_confirmation])
    end

    def configure_account_update_params
      devise_parameter_sanitizer.permit(:account_update, keys: [:name, :email, :password, :password_confirmation, :current_password])
    end
  end
end
