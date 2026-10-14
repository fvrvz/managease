# frozen_string_literal: true

module Auth
  class SessionsController < Devise::SessionsController
    respond_to :json

    private

    def respond_with(resource, _opts = {})
      if resource.persisted?
        render json: {
          message: 'Logged in successfully.',
          user: UserSerializer.new(resource).serializable_hash[:data]
        }, status: :ok
      else
        render json: { error: 'Invalid email or password.' }, status: :unauthorized
      end
    end

    def respond_to_on_destroy
      if request.headers['Authorization'].present?
        jwt_payload = JWT.decode(
          request.headers['Authorization'].split.last,
          Rails.application.secret_key_base
        ).first

        current_user = User.find(jwt_payload['sub'])
        render json: { message: 'Logged out successfully.' }, status: :ok
      else
        render json: { message: 'No active session.' }, status: :ok
      end
    rescue JWT::DecodeError
      render json: { message: 'Logged out successfully.' }, status: :ok
    end
  end
end
