# frozen_string_literal: true

class ProjectSerializer
  include JSONAPI::Serializer

  set_type :project

  attributes :name, :key, :description, :status, :created_at, :updated_at

  belongs_to :owner, serializer: UserSerializer

  attribute :member_count do |project|
    project.project_members.size
  end

  attribute :issues_count do |project|
    project.issues.size
  end

  attribute :open_issues_count do |project|
    project.issues.open.count
  end

  attribute :active_sprint do |project|
    sprint = project.sprints.active.first
    next nil unless sprint

    SprintSerializer.new(sprint).serializable_hash[:data]
  end
end
