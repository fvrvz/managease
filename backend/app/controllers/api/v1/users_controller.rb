# frozen_string_literal: true

module Api
  module V1
    class UsersController < BaseController
      def me
        render_serialized(UserSerializer, current_user)
      end

      def update_me
        current_user.avatar.attach(params[:avatar]) if params[:avatar].present?

        if current_user.update(user_params)
          render_serialized(UserSerializer, current_user)
        else
          render json: { error: 'Update failed', details: current_user.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      private

      def user_params
        params.permit(:name)
      end
    end
  end
end
