class CreateSprints < ActiveRecord::Migration[8.0]
  def change
    create_table :sprints do |t|
      t.references :project,    null: false, foreign_key: true
      t.string     :name,       null: false
      t.text       :goal
      t.integer    :status,     null: false, default: 0
      t.date       :start_date
      t.date       :end_date

      t.timestamps
    end

    add_index :sprints, :status
  end
end
