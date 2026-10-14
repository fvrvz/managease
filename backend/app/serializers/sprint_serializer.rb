# frozen_string_literal: true

class SprintSerializer
  include JSONAPI::Serializer

  set_type :sprint

  attributes :name, :goal, :status, :start_date, :end_date, :created_at, :updated_at

  attribute :story_points_total do |sprint|
    sprint.story_points_total
  end

  attribute :story_points_completed do |sprint|
    sprint.story_points_completed
  end

  attribute :story_points_remaining do |sprint|
    sprint.story_points_remaining
  end

  attribute :issues_count do |sprint|
    sprint.issues.size
  end

  attribute :completed_issues_count do |sprint|
    sprint.issues.select(&:done?).size
  end

  belongs_to :project
end
