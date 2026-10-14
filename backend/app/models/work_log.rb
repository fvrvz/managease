# frozen_string_literal: true

class WorkLog < ApplicationRecord
  belongs_to :issue
  belongs_to :user

  validates :hours, numericality: { greater_than: 0, less_than_or_equal_to: 24 }
  validates :logged_date, presence: true

  after_save :update_issue_logged_hours
  after_destroy :update_issue_logged_hours

  private

  def update_issue_logged_hours
    return unless issue.has_attribute?(:logged_hours)

    total = issue.work_logs.sum(:hours)
    issue.update_column(:logged_hours, total)
  end
end
