# frozen_string_literal: true

module Api
  module V1
    class ReportsController < BaseController
      before_action :set_project

      # GET /api/v1/projects/:project_id/reports/burndown?sprint_id=X
      def burndown
        sprint = @project.sprints.find(params[:sprint_id])
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

      private

      def set_project
        @project = Project.find(params[:project_id])
        authorize @project, :show?
      end
    end
  end
end
