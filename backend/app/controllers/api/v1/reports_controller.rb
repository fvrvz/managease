# frozen_string_literal: true

module Api
  module V1
    class ReportsController < BaseController
      before_action :set_project

      # GET /api/v1/projects/:project_id/reports/burndown?sprint_id=X
      def burndown
        sprint = params[:sprint_id].present? ? @project.sprints.find(params[:sprint_id]) : (@project.active_sprint || @project.sprints.first)
        unless sprint
          return render json: { data: nil, sprint: nil }
        end

        data = BurndownCalculator.new(sprint).call
        render json: { data: data, sprint: SprintSerializer.new(sprint).serializable_hash[:data] }
      end

      # GET /api/v1/projects/:project_id/reports/velocity
      def velocity
        completed_sprints = @project.sprints.completed.ordered.limit(10)
        data = completed_sprints.map do |sprint|
          {
            sprint_id: sprint.id,
            sprint_name: sprint.name,
            start_date: sprint.start_date,
            end_date: sprint.end_date,
            committed_points: sprint.story_points_total,
            completed_points: sprint.story_points_completed,
            velocity: sprint.story_points_completed
          }
        end
        render json: { data: data }
      end

      # GET /api/v1/projects/:project_id/reports/issue_summary
      def issue_summary
        issues = @project.issues

        summary = {
          total: issues.count,
          by_status: Issue.statuses.keys.index_with { |s| issues.where(status: s).count },
          by_priority: Issue.priorities.keys.index_with { |p| issues.where(priority: p).count },
          by_type: Issue.issue_types.keys.index_with { |t| issues.where(issue_type: t).count },
          unassigned: issues.where(assignee: nil).count,
          overdue: issues.where('due_date < ? AND status != ?', Date.today, Issue.statuses[:done]).count
        }

        render json: { data: summary }
      end

      # GET /api/v1/projects/:project_id/reports/time_tracking
      def time_tracking
        issues = @project.issues.includes(:assignee, :work_logs)
        sprint_id = params[:sprint_id]
        issues = issues.where(sprint_id: sprint_id) if sprint_id.present?

        user_logs = Hash.new(0.0)
        daily_logs = Hash.new(0.0)
        issue_rows = []

        total_estimated = 0.0
        total_logged = 0.0

        issues.each do |issue|
          est = issue.try(:estimated_hours).to_f
          logged = issue.try(:logged_hours).to_f
          total_estimated += est
          total_logged += logged

          issue_rows << {
            id: issue.id,
            key: issue.issue_key,
            title: issue.title,
            status: issue.status,
            assignee: issue.assignee ? { id: issue.assignee.id, name: issue.assignee.name } : nil,
            estimated_hours: est,
            logged_hours: logged,
            remaining_hours: [est - logged, 0.0].max
          }

          if issue.respond_to?(:work_logs)
            issue.work_logs.each do |wl|
              user_name = wl.user&.name || 'Unknown'
              user_logs[user_name] += wl.hours.to_f
              daily_logs[wl.logged_date.to_s] += wl.hours.to_f
            end
          end
        end

        render json: {
          data: {
            total_estimated: total_estimated.round(2),
            total_logged: total_logged.round(2),
            by_user: user_logs.map { |user, hours| { user: user, hours: hours.round(2) } },
            by_date: daily_logs.map { |date, hours| { date: date, hours: hours.round(2) } }.sort_by { |d| d[:date] },
            issues: issue_rows
          }
        }
      end

      private

      def set_project
        @project = find_project(params[:project_id]) or raise ActiveRecord::RecordNotFound, 'Project not found'
        authorize @project, :show?
      end
    end
  end
end
