# frozen_string_literal: true

module Api
  module V1
    class UsersController < BaseController
      def index
        users = User.all.order(created_at: :desc)
        if params[:q].present?
          q = "%#{params[:q]}%"
          users = users.where('name ILIKE :q OR email ILIKE :q', q: q)
        end
        render_serialized(UserSerializer, users)
      end

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

      def create
        user = User.new(
          name: params[:name],
          email: params[:email],
          role: params[:role] || :member,
          password: params[:password].presence || 'Password123!'
        )

        if user.save
          render_created(UserSerializer, user)
        else
          render json: { error: 'Failed to create user', details: user.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        user = User.find(params[:id])
        attrs = params.permit(:name, :email, :role).to_h
        attrs.delete(:role) if attrs[:role].blank?

        if user.update(attrs)
          render_serialized(UserSerializer, user)
        else
          render json: { error: 'Failed to update user', details: user.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        user = User.find(params[:id])
        if user.id == current_user.id
          render json: { error: 'Cannot delete yourself' }, status: :forbidden
          return
        end
        user.destroy!
        head :no_content
      end

      private

      def user_params
        params.permit(:name)
      end
    end
  end
end
