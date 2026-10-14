# frozen_string_literal: true

class IssueMailer < ApplicationMailer
  def issue_created(issue, recipient, actor)
    @issue = issue
    @recipient = recipient
    @actor = actor
    @project = issue.project
    @issue_url = issue_web_url(issue)

    mail(
      to: @recipient.email,
      subject: "[#{@issue.issue_key}] Created: #{@issue.title}"
    )
  end

  def issue_assigned(issue, recipient, actor)
    @issue = issue
    @recipient = recipient
    @actor = actor
    @project = issue.project
    @issue_url = issue_web_url(issue)

    mail(
      to: @recipient.email,
      subject: "[#{@issue.issue_key}] Assigned to you: #{@issue.title}"
    )
  end

  def issue_status_changed(issue, recipient, old_status, new_status, actor)
    @issue = issue
    @recipient = recipient
    @actor = actor
    @project = issue.project
    @old_status = old_status.to_s.titleize
    @new_status = new_status.to_s.titleize
    @issue_url = issue_web_url(issue)

    mail(
      to: @recipient.email,
      subject: "[#{@issue.issue_key}] Status changed to #{@new_status}: #{@issue.title}"
    )
  end

  def comment_added(issue, comment, recipient, actor)
    @issue = issue
    @comment = comment
    @recipient = recipient
    @actor = actor
    @project = issue.project
    @issue_url = issue_web_url(issue)

    mail(
      to: @recipient.email,
      subject: "[#{@issue.issue_key}] New comment by #{@actor&.display_name || 'Team member'}"
    )
  end

  private

  def issue_web_url(issue)
    frontend_base = ENV.fetch('FRONTEND_URL', 'http://localhost:5173')
    "#{frontend_base}/projects/#{issue.project.key}?issue=#{issue.id}"
  end
end
