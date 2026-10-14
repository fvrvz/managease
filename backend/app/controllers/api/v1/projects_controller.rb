# frozen_string_literal: true

module Api
  module V1
    class ProjectsController < BaseController
      before_action :set_project, only: [:show, :update, :destroy, :members,
                                         :add_member, :update_member, :remove_member]

      def index
        projects = policy_scope(Project).for_user(current_user).includes(:owner, :project_members)
        render_paginated(ProjectSerializer, projects)
      end

      def show
        authorize @project
        render_serialized(ProjectSerializer, @project, include: [:owner])
      end

      def create
        @project = Project.new(project_params.merge(owner: current_user))
        authorize @project

        if @project.save
          render_created(ProjectSerializer, @project)
        else
          render json: { error: 'Project creation failed', details: @project.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        authorize @project

        if @project.update(project_params)
          render_serialized(ProjectSerializer, @project)
        else
          render json: { error: 'Update failed', details: @project.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        authorize @project
        @project.destroy!
        head :no_content
      end

      # ── Member management ──────────────────────────────────────────────────────
      def members
        authorize @project, :show?
        members = @project.project_members.includes(:user)
        render json: members.map { |pm|
          {
            user: UserSerializer.new(pm.user).serializable_hash[:data],
            role: pm.role,
            joined_at: pm.created_at
          }
        }
      end

      def add_member
        authorize @project, :manage_members?
        user = User.find(params[:user_id])
        pm = @project.project_members.find_or_initialize_by(user: user)
        pm.role = params[:role] || :member

        if pm.save
          render json: { message: 'Member added successfully', role: pm.role }, status: :created
        else
          render json: { error: 'Failed to add member', details: pm.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update_member
        authorize @project, :manage_members?
        pm = @project.project_members.find_by!(user_id: params[:user_id])

        if pm.update(role: params[:role])
          render json: { message: 'Member role updated', role: pm.role }
        else
          render json: { error: 'Failed to update member', details: pm.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def remove_member
        authorize @project, :manage_members?
        pm = @project.project_members.find_by!(user_id: params[:user_id])

        if pm.owner?
          render json: { error: 'Cannot remove the project owner' }, status: :forbidden
        else
          pm.destroy!
          head :no_content
        end
      end

      private

      def set_project
        @project = Project.find(params[:id])
      end

      def project_params
        params.require(:project).permit(:name, :key, :description, :status)
      end
    end
  end
end
