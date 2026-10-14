# frozen_string_literal: true

class ApplicationController < ActionController::API
  include Pundit::Authorization

  before_action :configure_permitted_parameters, if: :devise_controller?

  rescue_from Pundit::NotAuthorizedError, with: :render_forbidden
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActionController::ParameterMissing, with: :render_unprocessable

  private

  def render_forbidden(exception)
    render json: { error: 'You are not authorized to perform this action.' }, status: :forbidden
  end

  def render_not_found(exception)
    render json: { error: "#{exception.model} not found." }, status: :not_found
  end

  def render_unprocessable(exception)
    render json: { error: exception.message }, status: :unprocessable_entity
  end

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name])
    devise_parameter_sanitizer.permit(:account_update, keys: [:name])
  end
end
