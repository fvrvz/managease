# frozen_string_literal: true

module Api
  module V1
    class IssueLinksController < BaseController
      before_action :set_issue

      def index
        outward = @issue.outward_links.includes(:target, :created_by)
        inward  = @issue.inward_links.includes(:source, :created_by)

        render json: {
          outward: outward.map { |l| link_json(l, direction: :outward) },
          inward:  inward.map  { |l| link_json(l, direction: :inward) }
        }
      end

      def create
        target = Issue.find(params[:target_id])
        link = @issue.outward_links.build(
          target: target,
          link_type: params[:link_type] || :relates_to,
          created_by: current_user
        )

        if link.save
          render json: link_json(link, direction: :outward), status: :created
        else
          render json: { error: 'Failed to create link', details: link.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        link = IssueLink.find(params[:id])
        authorize link.source, :update?
        link.destroy!
        head :no_content
      end

      private

      def set_issue
        @issue = Issue.find(params[:issue_id])
        authorize @issue, :show?
      end

      def link_json(link, direction:)
        related_issue = direction == :outward ? link.target : link.source
        {
          id: link.id,
          link_type: link.link_type,
          direction: direction,
          issue: {
            id: related_issue.id,
            key: related_issue.issue_key,
            title: related_issue.title,
            status: related_issue.status,
            priority: related_issue.priority,
            issue_type: related_issue.issue_type
          },
          created_by: link.created_by&.display_name,
          created_at: link.created_at
        }
      end
    end
  end
end
