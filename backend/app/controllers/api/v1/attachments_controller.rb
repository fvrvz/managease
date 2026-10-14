# frozen_string_literal: true

module Api
  module V1
    class AttachmentsController < BaseController
      before_action :set_issue

      def index
        attachments = @issue.attachments.includes(:uploaded_by)
        render json: attachments.map { |a| attachment_json(a) }
      end

      def create
        @attachment = @issue.attachments.build(uploaded_by: current_user, filename: params[:file]&.original_filename)
        @attachment.file.attach(params[:file])
        authorize @attachment

        if @attachment.save
          render json: attachment_json(@attachment), status: :created
        else
          render json: { error: 'Upload failed', details: @attachment.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        attachment = @issue.attachments.find(params[:id])
        authorize attachment
        attachment.destroy!
        head :no_content
      end

      private

      def set_issue
        @issue = Issue.find(params[:issue_id])
        authorize @issue, :show?
      end

      def attachment_json(attachment)
        {
          id: attachment.id,
          filename: attachment.filename,
          content_type: attachment.content_type,
          byte_size: attachment.byte_size,
          url: attachment.url,
          uploaded_by: attachment.uploaded_by&.display_name,
          created_at: attachment.created_at
        }
      end
    end
  end
end
