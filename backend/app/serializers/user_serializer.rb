# frozen_string_literal: true

class UserSerializer
  include JSONAPI::Serializer

  set_type :user

  attributes :name, :email, :role, :created_at

  attribute :avatar_url do |user|
    user.avatar_url
  end

  attribute :display_name do |user|
    user.display_name
  end
end
