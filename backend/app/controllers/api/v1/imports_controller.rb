# frozen_string_literal: true

module Api
  module V1
    class ImportsController < BaseController
      before_action :set_project

      # POST /api/v1/projects/:project_id/imports
      # Standard programmatic import (original behaviour, unchanged)
      def create
        unless params[:file].present?
          render json: { error: 'No file provided' }, status: :unprocessable_entity
          return
        end

        result = ExcelImportService.new(@project, current_user, params[:file]).call

        if result[:success]
          render json: {
            message: 'Import completed successfully',
            imported: result[:imported],
            errors: result[:errors]
          }, status: :created
        else
          render json: {
            error: 'Import failed',
            details: result[:errors]
          }, status: :unprocessable_entity
        end
      rescue ExcelImportService::InvalidFormatError => e
        render json: { error: "Invalid file format: #{e.message}" }, status: :unprocessable_entity
      end

      # POST /api/v1/projects/:project_id/imports/ai_analyze
      # Phase 1 — send spreadsheet to LLM and return structured preview JSON.
      # The frontend shows the preview for user confirmation before committing.
      def ai_analyze
        unless params[:file].present?
          render json: { error: 'No file provided' }, status: :unprocessable_entity
          return
        end

        service = AiImportService.new(@project, current_user, params[:file])
        result  = service.analyze

        render json: result, status: :ok
      rescue AiImportService::ConfigError => e
        render json: { error: "AI import not configured: #{e.message}" }, status: :unprocessable_entity
      rescue AiImportService::LlmError => e
        render json: { error: "LLM analysis failed: #{e.message}" }, status: :unprocessable_entity
      rescue AiImportService::InvalidFormat => e
        render json: { error: "Invalid file: #{e.message}" }, status: :unprocessable_entity
      rescue StandardError => e
        Rails.logger.error "AiImportService unexpected error: #{e.class}: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}"
        render json: { error: 'An unexpected error occurred during AI analysis' }, status: :internal_server_error
      end

      # POST /api/v1/projects/:project_id/imports/ai_commit
      # Phase 2 — user has reviewed the preview and confirmed; commit to DB.
      def ai_commit
        payload = params.require(:preview).permit!.to_h

        if payload.blank?
          render json: { error: 'No preview payload provided' }, status: :unprocessable_entity
          return
        end

        service = AiImportService.new(@project, current_user, nil)
        result  = service.commit(payload)

        if result[:success]
          render json: {
            message: 'AI import committed successfully',
            imported: result[:imported],
            errors: result[:errors]
          }, status: :created
        else
          render json: {
            error: 'AI import commit failed',
            details: result[:errors]
          }, status: :unprocessable_entity
        end
      rescue AiImportService::ConfigError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # GET /api/v1/projects/:project_id/imports/ai_settings
      # Return current AI import settings (api_key is masked for security)
      def ai_settings
        raw = (@project.ai_import_settings || {}).with_indifferent_access
        render json: {
          provider:  raw[:provider],
          model:     raw[:model],
          base_url:  raw[:base_url],
          enabled:   raw[:enabled] || false,
          hint:      raw[:hint],
          has_key:   raw[:api_key].present?
        }
      end

      # PUT /api/v1/projects/:project_id/imports/ai_settings
      # Save AI import settings. api_key is only updated when present in params.
      def update_ai_settings
        authorize @project, :update?

        current = (@project.ai_import_settings || {}).with_indifferent_access
        updates = current.merge(ai_settings_params)

        # Keep existing api_key if the client didn't send a new one (masked field)
        updates[:api_key] = current[:api_key] if ai_settings_params[:api_key].blank? && params[:keep_existing_key]

        @project.update!(ai_import_settings: updates)

        render json: { message: 'AI import settings updated', enabled: updates[:enabled] }
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # GET /api/v1/projects/:project_id/imports/ai_models
      # POST /api/v1/projects/:project_id/imports/ai_models
      # Fetches available models for the configured or provided provider & API key
      def ai_models
        raw = (@project.ai_import_settings || {}).with_indifferent_access
        provider = params[:provider].presence || raw[:provider] || 'gemini'
        api_key  = params[:api_key].presence || raw[:api_key]
        base_url = params[:base_url].presence || raw[:base_url]

        if provider.to_s.in?(%w[openai gemini]) && api_key.blank?
          render json: { error: "API key is required to list #{provider.capitalize} models" }, status: :unprocessable_entity
          return
        end

        models = AiImportService.fetch_available_models(
          provider: provider,
          api_key:  api_key,
          base_url: base_url
        )

        render json: { models: models }
      rescue AiImportService::LlmError => e
        render json: { error: e.message }, status: :unprocessable_entity
      rescue StandardError => e
        render json: { error: "Failed to fetch models: #{e.message}" }, status: :internal_server_error
      end

      private

      def set_project
        @project = find_project(params[:project_id]) or raise ActiveRecord::RecordNotFound, 'Project not found'
        authorize @project, :manage?
      end

      def ai_settings_params
        params.permit(:provider, :api_key, :model, :base_url, :enabled, :hint)
              .to_h
              .symbolize_keys
              .reject { |_, v| v.nil? }
      end
    end
  end
end
