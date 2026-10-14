# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'
require 'openssl'

module Api
  module V1
    class GithubWebhooksController < ActionController::API
      # No user JWT authentication since GitHub servers send these requests
      def receive
        event = request.headers['X-GitHub-Event'] || params[:event]

        if event == 'ping'
          render json: { message: 'pong', timestamp: Time.current }
          return
        end

        linked_issues = []

        case event
        when 'pull_request'
          linked_issues = handle_pull_request(params)
        when 'push'
          linked_issues = handle_push(params)
        else
          # Allow generic pull_request payload even if header wasn't set (e.g. test from UI)
          if params[:pull_request].present?
            linked_issues = handle_pull_request(params)
          end
        end

        render json: {
          status: 'success',
          event: event,
          linked_count: linked_issues.size,
          linked_issues: linked_issues
        }
      rescue StandardError => e
        Rails.logger.error("GitHub Webhook Error: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      def handle_pull_request(payload)
        pr = payload[:pull_request] || {}
        action = payload[:action] || 'updated'
        repo = payload[:repository] || {}
        pr_number = pr[:number]
        pr_title = pr[:title] || ''
        pr_body = pr[:body] || ''
        pr_url = pr[:html_url] || ''
        pr_user = pr.dig(:user, :login) || 'developer'
        head_ref = pr.dig(:head, :ref) || ''
        merged = pr[:merged] == true || action == 'closed' && pr[:merged_at].present?

        # Extract issue keys like MNG-1, PROJ-42, etc.
        combined_text = "#{pr_title} #{pr_body} #{head_ref}"
        keys = combined_text.scan(/[A-Za-z0-9_\-]+-(\d+)/).flatten
        found_keys = combined_text.scan(/([A-Za-z0-9_\-]+)-(\d+)/).map { |proj, num| "#{proj.upcase}-#{num}" }.uniq

        linked = []

        found_keys.each do |key_str|
          proj_key, issue_num = key_str.split('-')
          next unless proj_key && issue_num

          project = Project.where('UPPER(key) = ?', proj_key.upcase).first
          next unless project

          issue = project.issues.find_by(number: issue_num.to_i)
          next unless issue

          # Update status automatically just like Jira
          if merged
            issue.update(status: :done, resolved_at: Time.current)
          elsif %w[opened reopened synchronize].include?(action) && %w[backlog todo].include?(issue.status)
            issue.update(status: :in_review)
          end

          # Add bot comment on issue
          bot_user = find_or_create_bot_user
          status_tag = merged ? '🎉 Merged' : action.capitalize
          comment_body = <<~MARKDOWN
            🤖 **GitHub Bot**: Pull Request [##{pr_number}: #{pr_title}](#{pr_url}) by **@#{pr_user}** was #{status_tag}.
            **Branch:** `#{head_ref}` · **Status updated to:** `#{issue.status.humanize}`
          MARKDOWN

          issue.comments.create!(
            author: bot_user,
            body: comment_body.strip
          )

          # If project has a GitHub token, comment back on GitHub PR!
          if project.has_attribute?(:github_token) && project.github_token.present? && repo[:full_name].present?
            post_github_pr_comment(repo[:full_name], pr_number, project.github_token, issue, project)
          end

          linked << { issue_key: issue.issue_key, title: issue.title, status: issue.status }
        end

        linked
      end

      def handle_push(payload)
        commits = payload[:commits] || []
        repo = payload[:repository] || {}
        linked = []

        commits.each do |commit|
          message = commit[:message] || ''
          sha = (commit[:id] || '')[0..6]
          url = commit[:url] || ''
          author = commit.dig(:author, :name) || 'developer'

          keys = message.scan(/([A-Za-z0-9_\-]+)-(\d+)/).map { |p, n| "#{p.upcase}-#{n}" }.uniq
          keys.each do |key_str|
            proj_key, issue_num = key_str.split('-')
            next unless proj_key && issue_num

            project = Project.where('UPPER(key) = ?', proj_key.upcase).first
            next unless project

            issue = project.issues.find_by(number: issue_num.to_i)
            next unless issue

            bot_user = find_or_create_bot_user
            comment_body = "🤖 **GitHub Bot**: Commit [`#{sha}` - #{message.lines.first&.strip}](#{url}) by **#{author}** linked to this issue."
            issue.comments.create!(author: bot_user, body: comment_body)

            linked << { issue_key: issue.issue_key, sha: sha }
          end
        end

        linked
      end

      def find_or_create_bot_user
        User.find_or_create_by!(email: 'github-bot@managease.internal') do |u|
          u.name = 'GitHub Bot'
          u.password = SecureRandom.hex(16)
          u.role = :admin
        end
      end

      def post_github_pr_comment(repo_full_name, pr_number, token, issue, project)
        uri = URI("https://api.github.com/repos/#{repo_full_name}/issues/#{pr_number}/comments")
        req = Net::HTTP::Post.new(uri)
        req['Authorization'] = "Bearer #{token}"
        req['Accept'] = 'application/vnd.github.v3+json'
        req['Content-Type'] = 'application/json'
        req['User-Agent'] = 'ManagEase-GitHub-Bot'

        frontend_url = ENV['FRONTEND_URL'] || 'http://localhost:5173'
        req.body = {
          body: "### 🚀 ManagEase Bot\nLinked to issue: **[#{issue.issue_key}: #{issue.title}](#{frontend_url}/projects/#{project.key}/board)**\nStatus: `#{issue.status.humanize}`"
        }.to_json

        Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
          http.request(req)
        end
      rescue StandardError => e
        Rails.logger.warn("Could not post comment to GitHub: #{e.message}")
      end
    end
  end
end
