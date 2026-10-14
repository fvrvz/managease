# frozen_string_literal: true

class LabelPolicy < ApplicationPolicy
  def create?
    record.project.member?(user) || record.project.owner_id == user.id
  end

  def update?
    role = record.project.role_for(user)
    record.project.owner_id == user.id || role.to_s.in?(%w[owner admin])
  end

  def destroy?
    update?
  end
end
