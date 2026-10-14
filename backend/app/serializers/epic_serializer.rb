# frozen_string_literal: true

class EpicSerializer
  include JSONAPI::Serializer

  set_type :epic

  attributes :name, :description, :color, :status, :start_date, :end_date, :created_at, :updated_at

  attribute :project_id do |epic|
    epic.project_id
  end

  attribute :issues_count do |epic|
    epic.issues.size
  end

  attribute :completed_issues_count do |epic|
    epic.issues.select(&:done?).size
  end

  attribute :story_points_total do |epic|
    epic.issues.sum { |i| i.story_points || 0 }
  end

  attribute :story_points_completed do |epic|
    epic.issues.select(&:done?).sum { |i| i.story_points || 0 }
  end

  belongs_to :project, serializer: ProjectSerializer
  has_many :issues, serializer: IssueSerializer
end

