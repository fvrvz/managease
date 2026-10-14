# frozen_string_literal: true

class ProjectPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    record.member?(user) || record.owner_id == user.id
  end

  def create?
    true
  end

  def update?
    manage?
  end

  def destroy?
    record.owner_id == user.id
  end

  def manage?
    return true if record.owner_id == user.id

    role = record.role_for(user)
    role.to_s.in?(%w[owner admin])
  end

  alias_method :manage_members?, :manage?

  class Scope < Scope
    def resolve
      scope.for_user(user)
    end
  end
end

