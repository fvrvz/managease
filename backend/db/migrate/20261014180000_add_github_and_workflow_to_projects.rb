# frozen_string_literal: true

class AddGithubAndWorkflowToProjects < ActiveRecord::Migration[8.0]
  def change
    add_column :projects, :github_repo, :string
    add_column :projects, :github_webhook_secret, :string
    add_column :projects, :github_token, :string
    add_column :projects, :workflow_statuses, :jsonb, default: []
  end
end
