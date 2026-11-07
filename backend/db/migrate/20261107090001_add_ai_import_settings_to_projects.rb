# frozen_string_literal: true

class AddAiImportSettingsToProjects < ActiveRecord::Migration[8.0]
  def change
    add_column :projects, :ai_import_settings, :jsonb, default: {}
  end
end
