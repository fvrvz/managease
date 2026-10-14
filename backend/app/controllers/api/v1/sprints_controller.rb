# frozen_string_literal: true

module Api
  module V1
    class SprintsController < BaseController
      before_action :set_project
      before_action :set_sprint, only: [:show, :update, :destroy, :start, :complete]

      def index
        sprints = @project.sprints.ordered.includes(:issues)
        render_serialized(SprintSerializer, sprints, include: ['issues'])
      end

      def show
        render_serialized(SprintSerializer, @sprint, include: ['issues'])
      end

      def create
        @sprint = @project.sprints.build(sprint_params)
        authorize @sprint

        if @sprint.save
          render_created(SprintSerializer, @sprint)
        else
          render json: { error: 'Sprint creation failed', details: @sprint.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        authorize @sprint

        if @sprint.update(sprint_params)
          render_serialized(SprintSerializer, @sprint)
        else
          render json: { error: 'Update failed', details: @sprint.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        authorize @sprint
        @sprint.destroy!
        head :no_content
      end

      def start
        authorize @sprint, :update?
        @sprint.start!
        render_serialized(SprintSerializer, @sprint)
      rescue RuntimeError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def complete
        authorize @sprint, :update?
        move_to = params[:move_incomplete_to_sprint_id].present? ?
                    @project.sprints.find(params[:move_incomplete_to_sprint_id]) : nil
        @sprint.complete!(move_incomplete_to: move_to)
        render_serialized(SprintSerializer, @sprint)
      rescue RuntimeError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def set_project
        @project = Project.find(params[:project_id])
        authorize @project, :show?
      end

      def set_sprint
        @sprint = @project.sprints.find(params[:id])
      end

      def sprint_params
        params.require(:sprint).permit(:name, :goal, :start_date, :end_date)
      end
    end
  end
end
