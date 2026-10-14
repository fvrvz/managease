# frozen_string_literal: true

class CommentSerializer
  include JSONAPI::Serializer

  set_type :comment

  attributes :body, :created_at, :updated_at

  attribute :issue_id do |comment|
    comment.issue_id
  end

  attribute :author_id do |comment|
    comment.author_id
  end

  belongs_to :author, serializer: UserSerializer
  belongs_to :issue, serializer: IssueSerializer
end

