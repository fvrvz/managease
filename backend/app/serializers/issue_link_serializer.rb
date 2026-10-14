# frozen_string_literal: true

class IssueLinkSerializer
  include JSONAPI::Serializer

  set_type :issue_link

  attributes :link_type, :created_at

  attribute :source_id do |link|
    link.source_id
  end

  attribute :target_id do |link|
    link.target_id
  end

  belongs_to :source, serializer: IssueSerializer
  belongs_to :target, serializer: IssueSerializer
  belongs_to :created_by, serializer: UserSerializer
end
