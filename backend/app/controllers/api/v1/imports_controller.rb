# frozen_string_literal: true

module Api
  module V1
    class ImportsController < BaseController
      before_action :set_project

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

      private

      def set_project
        @project = Project.find(params[:project_id])
        authorize @project, :manage?
      end
    end
  end
end
