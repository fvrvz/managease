# frozen_string_literal: true

module Api
  module V1
    class EpicsController < BaseController
      before_action :set_project
      before_action :set_epic, only: [:show, :update, :destroy]

      def index
        epics = @project.epics.ordered.includes(:assignee, :issues)
        render_serialized(EpicSerializer, epics)
      end

      def show
        render_serialized(EpicSerializer, @epic, include: ['issues', 'assignee'])
      end

      def create
        @epic = @project.epics.build(epic_params)
        authorize @epic

        if @epic.save
          render_created(EpicSerializer, @epic)
        else
          render json: { error: 'Epic creation failed', details: @epic.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        authorize @epic

        if @epic.update(epic_params)
          render_serialized(EpicSerializer, @epic)
        else
          render json: { error: 'Update failed', details: @epic.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        authorize @epic
        @epic.destroy!
        head :no_content
      end

      private

      def set_project
        @project = Project.find(params[:project_id])
        authorize @project, :show?
      end

      def set_epic
        @epic = @project.epics.find(params[:id])
      end

      def epic_params
        params.require(:epic).permit(:name, :description, :color, :status, :start_date, :end_date, :assignee_id)
      end
    end
  end
end
