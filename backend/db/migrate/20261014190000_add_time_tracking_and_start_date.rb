# frozen_string_literal: true

class AddTimeTrackingAndStartDate < ActiveRecord::Migration[8.0]
  def change
    add_column :issues, :start_date, :date unless column_exists?(:issues, :start_date)
    add_column :issues, :estimated_hours, :decimal, precision: 6, scale: 2 unless column_exists?(:issues, :estimated_hours)
    add_column :issues, :logged_hours, :decimal, precision: 6, scale: 2, default: 0.0 unless column_exists?(:issues, :logged_hours)

    unless table_exists?(:work_logs)
      create_table :work_logs do |t|
        t.references :issue, null: false, foreign_key: true
        t.references :user, null: false, foreign_key: true
        t.decimal :hours, precision: 6, scale: 2, null: false
        t.date :logged_date, null: false
        t.text :description
        t.timestamps
      end

      add_index :work_logs, [:issue_id, :logged_date]
      add_index :work_logs, [:user_id, :logged_date]
    end
  end
end

