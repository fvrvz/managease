class CreateLabels < ActiveRecord::Migration[8.0]
  def change
    create_table :labels do |t|
      t.references :project, null: false, foreign_key: true
      t.string :name,  null: false
      t.string :color, null: false, default: '#64748B'

      t.timestamps
    end

    add_index :labels, [:project_id, :name], unique: true
  end
end
