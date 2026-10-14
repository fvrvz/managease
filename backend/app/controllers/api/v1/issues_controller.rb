# frozen_string_literal: true

module Api
  module V1
    class IssuesController < BaseController
      before_action :set_project, only: [:index, :create]
      before_action :set_issue, only: [:show, :update, :destroy, :move, :reorder, :assign]

      ALLOWED_INCLUDES = %w[epic labels assignee reporter sprint comments subtasks].freeze

      def index
        issues = @project.issues
                         .includes(:assignee, :reporter, :epic, :labels, :sprint)
                         .then { |q| filter(q) }
                         .then { |q| sort(q) }

        render_paginated(IssueSerializer, issues, include: requested_includes)
      end

      def show
        authorize @issue
        render_serialized(IssueSerializer, @issue, include: ALLOWED_INCLUDES)
      end

      def create
        @issue = @project.issues.build(issue_params.merge(reporter: current_user))
        authorize @issue

        if @issue.save
          render_created(IssueSerializer, @issue, include: ALLOWED_INCLUDES)
        else
          render json: { error: 'Issue creation failed', details: @issue.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        authorize @issue

        if @issue.update(issue_params)
          render_serialized(IssueSerializer, @issue, include: ALLOWED_INCLUDES)
        else
          render json: { error: 'Update failed', details: @issue.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        authorize @issue
        @issue.destroy!
        head :no_content
      end

      # PATCH /api/v1/issues/:id/move
      # Moves issue to a different sprint and/or status column
      def move
        authorize @issue, :update?

        @issue.move_to_sprint(
          params[:sprint_id] ? Sprint.find(params[:sprint_id]) : @issue.sprint,
          status: params[:status]
        )
        render_serialized(IssueSerializer, @issue, include: ALLOWED_INCLUDES)
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # PATCH /api/v1/issues/:id/reorder
      # Moves issue to a new position within its current scope
      def reorder
        authorize @issue, :update?
        new_position = params[:position].to_i

        if new_position < 1
          render json: { error: 'Position must be a positive integer' }, status: :unprocessable_entity
          return
        end

        @issue.insert_at(new_position)
        render_serialized(IssueSerializer, @issue)
      end

      # PATCH /api/v1/issues/:id/assign
      def assign
        authorize @issue, :update?
        assignee = params[:assignee_id].present? ? User.find(params[:assignee_id]) : nil
        @issue.update!(assignee: assignee)
        render_serialized(IssueSerializer, @issue, include: ALLOWED_INCLUDES)
      end

      private

      def set_project
        @project = find_project(params[:project_id] || params[:project_key]) or raise ActiveRecord::RecordNotFound, 'Project not found'
        authorize @project, :show?
      end

      def set_issue
        @issue = Issue.find(params[:id])
      end

      def issue_params
        source = params[:issue].present? ? params.require(:issue) : params
        p = source.permit(
          :title, :description, :issue_type, :type, :status, :priority,
          :story_points, :storyPoints, :due_date, :dueDate,
          :sprint_id, :sprintId, :epic_id, :epicId,
          :assignee_id, :assigneeId, :parent_id, :parentId,
          label_ids: []
        )
        p[:issue_type] = p.delete(:type) if p.key?(:type) && p[:issue_type].blank?
        p[:story_points] = p.delete(:storyPoints) if p.key?(:storyPoints) && p[:story_points].blank?
        p[:due_date] = p.delete(:dueDate) if p.key?(:dueDate) && p[:due_date].blank?
        p[:sprint_id] = p.delete(:sprintId) if p.key?(:sprintId) && p[:sprint_id].blank?
        p[:epic_id] = p.delete(:epicId) if p.key?(:epicId) && p[:epic_id].blank?
        p[:assignee_id] = p.delete(:assigneeId) if p.key?(:assigneeId) && p[:assignee_id].blank?
        p[:parent_id] = p.delete(:parentId) if p.key?(:parentId) && p[:parent_id].blank?
        p
      end

      def filter(scope)
        scope = scope.where(status: params[:status]) if params[:status].present?
        scope = scope.where(priority: params[:priority]) if params[:priority].present?
        scope = scope.where(issue_type: params[:issue_type]) if params[:issue_type].present?
        scope = scope.where(sprint_id: params[:sprint_id]) if params[:sprint_id].present?
        scope = scope.where(epic_id: params[:epic_id]) if params[:epic_id].present?
        scope = scope.where(assignee_id: params[:assignee_id]) if params[:assignee_id].present?
        scope = scope.search(params[:q]) if params[:q].present?
        scope
      end

      def sort(scope)
        case params[:sort]
        when 'priority'   then scope.by_priority
        when 'created_at' then scope.recent
        when 'due_date'   then scope.order(due_date: :asc)
        else scope.by_position
        end
      end

      def requested_includes
        return ALLOWED_INCLUDES unless params[:include].present?

        params[:include].split(',').map(&:strip) & ALLOWED_INCLUDES
      end
    end
  end
end
