class CreateIssues < ActiveRecord::Migration[8.0]
  def change
    create_table :issues do |t|
      t.references :project,  null: false, foreign_key: true
      t.references :sprint,   foreign_key: true
      t.references :epic,     foreign_key: true
      t.references :assignee, foreign_key: { to_table: :users }
      t.references :reporter, foreign_key: { to_table: :users }
      t.references :parent,   foreign_key: { to_table: :issues }

      t.string  :title,       null: false
      t.text    :description
      t.integer :issue_type,  null: false, default: 2
      t.integer :status,      null: false, default: 0
      t.integer :priority,    null: false, default: 2
      t.integer :position,    null: false, default: 0
      t.integer :number,      null: false
      t.integer :story_points
      t.date    :due_date
      t.datetime :resolved_at

      t.timestamps
    end

    add_index :issues, [:project_id, :number], unique: true
    add_index :issues, :status
    add_index :issues, :priority
    add_index :issues, :position
    add_index :issues, [:sprint_id, :status, :position]
  end
end
