class CreateAttachments < ActiveRecord::Migration[8.0]
  def change
    create_table :attachments do |t|
      t.references :issue,       null: false, foreign_key: true
      t.references :uploaded_by, null: false, foreign_key: { to_table: :users }
      t.string     :filename,    null: false

      t.timestamps
    end
  end
end
