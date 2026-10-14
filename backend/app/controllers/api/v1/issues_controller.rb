# frozen_string_literal: true

module Api
  module V1
    class IssuesController < BaseController
      before_action :set_project, only: [:index, :create]
      before_action :set_issue, only: [:show, :update, :destroy, :move, :reorder, :assign, :work_logs, :log_work]

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
        attrs = issue_params
        attrs[:reporter_id] ||= current_user.id
        attrs[:status] ||= :todo if attrs[:sprint_id].present? || attrs[:status].blank?
        @issue = @project.issues.build(attrs)
        authorize @issue

        if @issue.save
          NotificationService.notify_issue_created(@issue, current_user)
          render_created(IssueSerializer, @issue, include: ALLOWED_INCLUDES)
        else
          render json: { error: 'Issue creation failed', details: @issue.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        authorize @issue

        old_status = @issue.status
        old_assignee_id = @issue.assignee_id

        new_status = issue_params[:status].presence
        if new_status.present? && new_status.to_s != @issue.status.to_s
          unless @issue.project.allowed_transition?(@issue.status, new_status)
            render json: {
              error: "Workflow restriction: Transition from '#{@issue.status.to_s.titleize}' to '#{new_status.to_s.titleize}' is not permitted by project workflow.",
              from: @issue.status,
              to: new_status
            }, status: :unprocessable_entity
            return
          end
        end

        if @issue.update(issue_params)
          if @issue.status.to_s != old_status.to_s
            NotificationService.notify_status_changed(@issue, old_status, @issue.status, current_user)
          end
          if @issue.assignee_id.present? && @issue.assignee_id != old_assignee_id
            NotificationService.notify_issue_assigned(@issue, current_user)
          end
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

        target_sprint = if params.key?(:sprint_id)
                          params[:sprint_id].present? && params[:sprint_id] != 'null' ? Sprint.find(params[:sprint_id]) : nil
                        else
                          @issue.sprint
                        end

        status_val = params[:status].presence
        if status_val.present? && status_val.to_s != @issue.status.to_s
          unless @issue.project.allowed_transition?(@issue.status, status_val)
            render json: {
              error: "Workflow restriction: Transition from '#{@issue.status.to_s.titleize}' to '#{status_val.to_s.titleize}' is not permitted by project workflow.",
              from: @issue.status,
              to: status_val
            }, status: :unprocessable_entity
            return
          end
        end

        old_status = @issue.status
        @issue.move_to_sprint(target_sprint, status: status_val)
        if status_val.present? && status_val.to_s != old_status.to_s
          NotificationService.notify_status_changed(@issue, old_status, @issue.status, current_user)
        end
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
        old_assignee_id = @issue.assignee_id
        assignee = params[:assignee_id].present? ? User.find(params[:assignee_id]) : nil
        @issue.update!(assignee: assignee)
        if assignee.present? && assignee.id != old_assignee_id
          NotificationService.notify_issue_assigned(@issue, current_user)
        end
        render_serialized(IssueSerializer, @issue, include: ALLOWED_INCLUDES)
      end

      # GET /api/v1/issues/:id/work_logs
      def work_logs
        authorize @issue, :show?
        logs = @issue.work_logs.includes(:user).order(logged_date: :desc, created_at: :desc)
        render json: logs.map { |wl|
          {
            id: wl.id,
            hours: wl.hours.to_f,
            logged_date: wl.logged_date,
            description: wl.description,
            user: { id: wl.user.id, name: wl.user.name, email: wl.user.email },
            created_at: wl.created_at
          }
        }
      end

      # POST /api/v1/issues/:id/work_logs
      def log_work
        authorize @issue, :update?
        hours = params[:hours].to_f
        if hours <= 0
          render json: { error: 'Hours must be greater than 0' }, status: :unprocessable_entity
          return
        end

        log = @issue.work_logs.create!(
          user: current_user,
          hours: hours,
          logged_date: params[:logged_date].presence || Date.today,
          description: params[:description]
        )

        render json: {
          id: log.id,
          hours: log.hours.to_f,
          logged_date: log.logged_date,
          description: log.description,
          total_logged: @issue.reload.try(:logged_hours).to_f
        }, status: :created
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
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
          :story_points, :storyPoints, :due_date, :dueDate, :start_date, :startDate,
          :estimated_hours, :estimatedHours,
          :sprint_id, :sprintId, :epic_id, :epicId,
          :assignee_id, :assigneeId, :reporter_id, :reporterId, :parent_id, :parentId,
          label_ids: []
        ).to_h.with_indifferent_access

        type_val = p.delete(:type)
        p[:issue_type] = type_val if p[:issue_type].blank? && type_val.present?

        sp_val = p.delete(:storyPoints)
        p[:story_points] = sp_val if p[:story_points].blank? && sp_val.present?

        dd_val = p.delete(:dueDate)
        p[:due_date] = dd_val if p[:due_date].blank? && dd_val.present?

        sd_val = p.delete(:startDate)
        p[:start_date] = sd_val if p[:start_date].blank? && sd_val.present?

        eh_val = p.delete(:estimatedHours)
        p[:estimated_hours] = eh_val if p[:estimated_hours].blank? && eh_val.present?

        sprint_val = p.delete(:sprintId)
        p[:sprint_id] = sprint_val if p[:sprint_id].blank? && sprint_val.present?

        epic_val = p.delete(:epicId)
        p[:epic_id] = epic_val if p[:epic_id].blank? && epic_val.present?

        assignee_val = p.delete(:assigneeId)
        p[:assignee_id] = assignee_val if p[:assignee_id].blank? && assignee_val.present?

        reporter_val = p.delete(:reporterId)
        p[:reporter_id] = reporter_val if p[:reporter_id].blank? && reporter_val.present?

        parent_val = p.delete(:parentId)
        p[:parent_id] = parent_val if p[:parent_id].blank? && parent_val.present?

        # Blank to nil conversion for optional fields
        %i[sprint_id epic_id assignee_id reporter_id parent_id start_date due_date estimated_hours story_points].each do |k|
          p[k] = nil if p.key?(k) && p[k].blank?
        end

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
