# frozen_string_literal: true

class AttachmentSerializer
  include JSONAPI::Serializer

  set_type :attachment

  attributes :filename, :byte_size, :content_type, :url, :created_at

  attribute :issue_id do |attachment|
    attachment.issue_id
  end

  attribute :uploaded_by_id do |attachment|
    attachment.uploaded_by_id
  end

  belongs_to :uploaded_by, serializer: UserSerializer
end
