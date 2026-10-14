# frozen_string_literal: true

module Auth
  class ConfirmationsController < Devise::ConfirmationsController
    respond_to :json

    def show
      self.resource = resource_class.confirm_by_token(params[:confirmation_token])

      if resource.errors.empty?
        render json: {
          message: 'Your account has been confirmed successfully.',
          user: UserSerializer.new(resource).serializable_hash[:data]
        }, status: :ok
      else
        render json: {
          error: 'Confirmation failed.',
          details: resource.errors.full_messages
        }, status: :unprocessable_entity
      end
    end

    def create
      self.resource = resource_class.send_confirmation_instructions(resource_params)

      if successfully_sent?(resource)
        render json: { message: 'Confirmation instructions sent.' }, status: :ok
      else
        render json: {
          error: 'Failed to send confirmation.',
          details: resource.errors.full_messages
        }, status: :unprocessable_entity
      end
    end
  end
end
