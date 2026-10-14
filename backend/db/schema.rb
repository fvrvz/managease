# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_14_172355) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "attachments", force: :cascade do |t|
    t.bigint "issue_id", null: false
    t.bigint "uploaded_by_id", null: false
    t.string "filename", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["issue_id"], name: "index_attachments_on_issue_id"
    t.index ["uploaded_by_id"], name: "index_attachments_on_uploaded_by_id"
  end

  create_table "comments", force: :cascade do |t|
    t.bigint "issue_id", null: false
    t.bigint "author_id", null: false
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["author_id"], name: "index_comments_on_author_id"
    t.index ["issue_id", "created_at"], name: "index_comments_on_issue_id_and_created_at"
    t.index ["issue_id"], name: "index_comments_on_issue_id"
  end

  create_table "epics", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.bigint "assignee_id"
    t.string "name", null: false
    t.text "description"
    t.string "color", default: "#6366F1"
    t.integer "status", default: 0, null: false
    t.date "start_date"
    t.date "end_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["assignee_id"], name: "index_epics_on_assignee_id"
    t.index ["project_id"], name: "index_epics_on_project_id"
    t.index ["status"], name: "index_epics_on_status"
  end

  create_table "issue_labels", force: :cascade do |t|
    t.bigint "issue_id", null: false
    t.bigint "label_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["issue_id", "label_id"], name: "index_issue_labels_on_issue_id_and_label_id", unique: true
    t.index ["issue_id"], name: "index_issue_labels_on_issue_id"
    t.index ["label_id"], name: "index_issue_labels_on_label_id"
  end

  create_table "issue_links", force: :cascade do |t|
    t.bigint "source_id", null: false
    t.bigint "target_id", null: false
    t.bigint "created_by_id", null: false
    t.integer "link_type", default: 4, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_issue_links_on_created_by_id"
    t.index ["source_id", "target_id", "link_type"], name: "index_issue_links_on_source_id_and_target_id_and_link_type", unique: true
    t.index ["source_id"], name: "index_issue_links_on_source_id"
    t.index ["target_id"], name: "index_issue_links_on_target_id"
  end

  create_table "issues", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.bigint "sprint_id"
    t.bigint "epic_id"
    t.bigint "assignee_id"
    t.bigint "reporter_id"
    t.bigint "parent_id"
    t.string "title", null: false
    t.text "description"
    t.integer "issue_type", default: 2, null: false
    t.integer "status", default: 0, null: false
    t.integer "priority", default: 2, null: false
    t.integer "position", default: 0, null: false
    t.integer "number", null: false
    t.integer "story_points"
    t.date "due_date"
    t.datetime "resolved_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["assignee_id"], name: "index_issues_on_assignee_id"
    t.index ["epic_id"], name: "index_issues_on_epic_id"
    t.index ["parent_id"], name: "index_issues_on_parent_id"
    t.index ["position"], name: "index_issues_on_position"
    t.index ["priority"], name: "index_issues_on_priority"
    t.index ["project_id", "number"], name: "index_issues_on_project_id_and_number", unique: true
    t.index ["project_id"], name: "index_issues_on_project_id"
    t.index ["reporter_id"], name: "index_issues_on_reporter_id"
    t.index ["sprint_id", "status", "position"], name: "index_issues_on_sprint_id_and_status_and_position"
    t.index ["sprint_id"], name: "index_issues_on_sprint_id"
    t.index ["status"], name: "index_issues_on_status"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.string "jti", null: false
    t.datetime "exp", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["exp"], name: "index_jwt_denylists_on_exp"
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "labels", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.string "name", null: false
    t.string "color", default: "#64748B", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "name"], name: "index_labels_on_project_id_and_name", unique: true
    t.index ["project_id"], name: "index_labels_on_project_id"
  end

  create_table "project_members", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.bigint "user_id", null: false
    t.integer "role", default: 1, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "user_id"], name: "index_project_members_on_project_id_and_user_id", unique: true
    t.index ["project_id"], name: "index_project_members_on_project_id"
    t.index ["user_id"], name: "index_project_members_on_user_id"
  end

  create_table "projects", force: :cascade do |t|
    t.string "name", null: false
    t.string "key", null: false
    t.text "description"
    t.integer "status", default: 0, null: false
    t.bigint "owner_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_projects_on_key", unique: true
    t.index ["owner_id"], name: "index_projects_on_owner_id"
    t.index ["status"], name: "index_projects_on_status"
  end

  create_table "sprints", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.string "name", null: false
    t.text "goal"
    t.integer "status", default: 0, null: false
    t.date "start_date"
    t.date "end_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_sprints_on_project_id"
    t.index ["status"], name: "index_sprints_on_status"
  end

  create_table "users", force: :cascade do |t|
    t.string "name", default: "", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "confirmation_sent_at"
    t.string "unconfirmed_email"
    t.integer "failed_attempts", default: 0, null: false
    t.string "unlock_token"
    t.datetime "locked_at"
    t.string "provider"
    t.string "uid"
    t.integer "role", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["unlock_token"], name: "index_users_on_unlock_token", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "attachments", "issues"
  add_foreign_key "attachments", "users", column: "uploaded_by_id"
  add_foreign_key "comments", "issues"
  add_foreign_key "comments", "users", column: "author_id"
  add_foreign_key "epics", "projects"
  add_foreign_key "epics", "users", column: "assignee_id"
  add_foreign_key "issue_labels", "issues"
  add_foreign_key "issue_labels", "labels"
  add_foreign_key "issue_links", "issues", column: "source_id"
  add_foreign_key "issue_links", "issues", column: "target_id"
  add_foreign_key "issue_links", "users", column: "created_by_id"
  add_foreign_key "issues", "epics"
  add_foreign_key "issues", "issues", column: "parent_id"
  add_foreign_key "issues", "projects"
  add_foreign_key "issues", "sprints"
  add_foreign_key "issues", "users", column: "assignee_id"
  add_foreign_key "issues", "users", column: "reporter_id"
  add_foreign_key "labels", "projects"
  add_foreign_key "project_members", "projects"
  add_foreign_key "project_members", "users"
  add_foreign_key "projects", "users", column: "owner_id"
  add_foreign_key "sprints", "projects"
end
