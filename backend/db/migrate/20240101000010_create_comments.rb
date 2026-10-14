class CreateComments < ActiveRecord::Migration[8.0]
  def change
    create_table :comments do |t|
      t.references :issue,  null: false, foreign_key: true
      t.references :author, null: false, foreign_key: { to_table: :users }
      t.text       :body,   null: false

      t.timestamps
    end

    add_index :comments, [:issue_id, :created_at]
  end
end
