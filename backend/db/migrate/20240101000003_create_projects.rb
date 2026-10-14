class CreateProjects < ActiveRecord::Migration[8.0]
  def change
    create_table :projects do |t|
      t.string  :name,        null: false
      t.string  :key,         null: false
      t.text    :description
      t.integer :status,      null: false, default: 0
      t.references :owner,    null: false, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :projects, :key, unique: true
    add_index :projects, :status
  end
end
