# frozen_string_literal: true

class CommentPolicy < ApplicationPolicy
  def create?
    record.issue.project.member?(user) || record.issue.project.owner_id == user.id
  end

  def update?
    record.author_id == user.id || record.issue.project.owner_id == user.id
  end

  def destroy?
    record.author_id == user.id || record.issue.project.owner_id == user.id
  end
end

