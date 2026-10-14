class CreateIssueLinks < ActiveRecord::Migration[8.0]
  def change
    create_table :issue_links do |t|
      t.references :source,     null: false, foreign_key: { to_table: :issues }
      t.references :target,     null: false, foreign_key: { to_table: :issues }
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.integer    :link_type,  null: false, default: 4

      t.timestamps
    end

    add_index :issue_links, [:source_id, :target_id, :link_type], unique: true
  end
end
