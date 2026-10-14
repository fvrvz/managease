# frozen_string_literal: true

class LabelSerializer
  include JSONAPI::Serializer

  set_type :label

  attributes :name, :color, :description, :created_at, :updated_at

  attribute :project_id do |label|
    label.project_id
  end

  attribute :issues_count do |label|
    label.issues.size
  end
end
