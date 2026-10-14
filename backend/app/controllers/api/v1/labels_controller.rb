# frozen_string_literal: true

module Api
  module V1
    class LabelsController < BaseController
      before_action :set_project
      before_action :set_label, only: [:show, :update, :destroy]

      def index
        labels = @project.labels.alphabetical
        render_serialized(LabelSerializer, labels)
      end

      def show
        render_serialized(LabelSerializer, @label)
      end

      def create
        @label = @project.labels.build(label_params)
        authorize @label

        if @label.save
          render_created(LabelSerializer, @label)
        else
          render json: { error: 'Label creation failed', details: @label.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        authorize @label

        if @label.update(label_params)
          render_serialized(LabelSerializer, @label)
        else
          render json: { error: 'Update failed', details: @label.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        authorize @label
        @label.destroy!
        head :no_content
      end

      private

      def set_project
        @project = Project.find(params[:project_id])
        authorize @project, :show?
      end

      def set_label
        @label = @project.labels.find(params[:id])
      end

      def label_params
        params.require(:label).permit(:name, :color)
      end
    end
  end
end
