# frozen_string_literal: true

module Api
  module V1
    class CommentsController < BaseController
      before_action :set_issue, only: [:index, :create]
      before_action :set_comment, only: [:show, :update, :destroy]

      def index
        comments = @issue.comments.ordered.includes(:author)
        render_serialized(CommentSerializer, comments)
      end

      def show
        render_serialized(CommentSerializer, @comment)
      end

      def create
        @comment = @issue.comments.build(comment_params.merge(author: current_user))
        authorize @comment

        if @comment.save
          NotificationService.notify_comment_added(@issue, @comment, current_user)
          render_created(CommentSerializer, @comment)
        else
          render json: { error: 'Comment creation failed', details: @comment.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        authorize @comment

        if @comment.update(comment_params)
          render_serialized(CommentSerializer, @comment)
        else
          render json: { error: 'Update failed', details: @comment.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        authorize @comment
        @comment.destroy!
        head :no_content
      end

      private

      def set_issue
        @issue = Issue.find(params[:issue_id])
      end

      def set_comment
        @comment = Comment.find(params[:id])
      end

      def comment_params
        params.require(:comment).permit(:body)
      end
    end
  end
end
