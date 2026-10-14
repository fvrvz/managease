# frozen_string_literal: true

class BurndownCalculator
  attr_reader :sprint

  def initialize(sprint)
    @sprint = sprint
  end

  def call
    start_date = sprint.start_date || sprint.created_at.to_date
    end_date = sprint.end_date || (start_date + 14.days)
    total_days = (end_date - start_date).to_i
    total_days = 1 if total_days <= 0

    total_points = sprint.story_points_total.to_f
    daily_ideal_burn = total_points / total_days

    issues = sprint.issues.to_a
    today = Date.current

    days_data = []

    (start_date..end_date).each_with_index do |date, idx|
      # Ideal linear burndown
      ideal_remaining = [total_points - (daily_ideal_burn * idx), 0].max.round(1)

      if date <= today
        # Calculate issues completed on or before this date
        completed_on_date = issues.select do |issue|
          issue.done? && issue.resolved_at.present? && issue.resolved_at.to_date <= date
        end.sum { |i| i.story_points || 0 }

        # Remaining points
        actual_remaining = [total_points - completed_on_date, 0].max.round(1)
      else
        actual_remaining = nil
      end

      days_data << {
        date: date.iso8601,
        day: idx + 1,
        ideal: ideal_remaining,
        actual: actual_remaining,
        total_points: total_points
      }
    end

    days_data
  end
end
