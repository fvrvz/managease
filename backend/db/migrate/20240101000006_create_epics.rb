class CreateEpics < ActiveRecord::Migration[8.0]
  def change
    create_table :epics do |t|
      t.references :project,  null: false, foreign_key: true
      t.references :assignee, foreign_key: { to_table: :users }
      t.string     :name,     null: false
      t.text       :description
      t.string     :color,    default: '#6366F1'
      t.integer    :status,   null: false, default: 0
      t.date       :start_date
      t.date       :end_date

      t.timestamps
    end

    add_index :epics, :status
  end
end
