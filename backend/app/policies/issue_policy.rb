# frozen_string_literal: true

class IssuePolicy < ApplicationPolicy
  def show?
    record.project.member?(user) || record.project.owner_id == user.id
  end

  def create?
    record.project.member?(user) || record.project.owner_id == user.id
  end

  def update?
    record.project.member?(user) || record.project.owner_id == user.id
  end

  def destroy?
    return true if record.project.owner_id == user.id || record.reporter_id == user.id

    role = record.project.role_for(user)
    role.to_s.in?(%w[owner admin])
  end
end
