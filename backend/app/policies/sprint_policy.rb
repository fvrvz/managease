# frozen_string_literal: true

class SprintPolicy < ApplicationPolicy
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
    role = record.project.role_for(user)
    record.project.owner_id == user.id || role.to_s.in?(%w[owner admin])
  end

  def start?
    update?
  end

  def complete?
    update?
  end
end
