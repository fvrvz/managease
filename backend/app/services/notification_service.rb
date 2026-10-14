# frozen_string_literal: true

class NotificationService
  class << self
    def notify_issue_created(issue, actor)
      recipients = [issue.assignee, issue.reporter].compact.uniq.reject { |u| u.id == actor&.id }
      recipients.each do |recipient|
        safe_deliver do
          IssueMailer.issue_created(issue, recipient, actor).deliver_now
        end
      end
    end

    def notify_issue_assigned(issue, actor)
      recipient = issue.assignee
      return if recipient.blank? || recipient.id == actor&.id

      safe_deliver do
        IssueMailer.issue_assigned(issue, recipient, actor).deliver_now
      end
    end

    def notify_status_changed(issue, old_status, new_status, actor)
      recipients = [issue.assignee, issue.reporter].compact.uniq.reject { |u| u.id == actor&.id }
      recipients.each do |recipient|
        safe_deliver do
          IssueMailer.issue_status_changed(issue, recipient, old_status, new_status, actor).deliver_now
        end
      end
    end

    def notify_comment_added(issue, comment, actor)
      recipients = ([issue.assignee, issue.reporter] + issue.comments.map(&:author))
                   .compact.uniq.reject { |u| u.id == actor&.id }
      recipients.each do |recipient|
        safe_deliver do
          IssueMailer.comment_added(issue, comment, recipient, actor).deliver_now
        end
      end
    end

    private

    def safe_deliver
      yield
    rescue StandardError => e
      Rails.logger.warn "[NotificationService] Email delivery warning: #{e.class} - #{e.message}"
    end
  end
end

