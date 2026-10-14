# frozen_string_literal: true

class Attachment < ApplicationRecord
  include ActiveStorageValidations

  # ── Associations ──────────────────────────────────────────────────────────────
  belongs_to :issue
  belongs_to :uploaded_by, class_name: 'User'
  has_one_attached :file

  # ── Validations ───────────────────────────────────────────────────────────────
  validates :file, attached: true,
                   size: { less_than: 50.megabytes, message: 'must be less than 50MB' },
                   content_type: {
                     in: [
                       'image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp',
                       'application/pdf',
                       'application/vnd.ms-excel',
                       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                       'text/plain', 'text/csv',
                       'application/zip'
                     ],
                     message: 'must be an image, PDF, Excel, CSV, text, or ZIP file'
                   }
  validates :filename, presence: true

  # ── Callbacks ─────────────────────────────────────────────────────────────────
  before_validation :set_filename

  # ── Scopes ────────────────────────────────────────────────────────────────────
  scope :for_issue, ->(issue) { where(issue: issue) }
  scope :images, -> { joins(:file_attachment).where(active_storage_blobs: { content_type: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] }) }

  # ── Instance methods ──────────────────────────────────────────────────────────
  def url
    return nil unless file.attached?

    Rails.application.routes.url_helpers.rails_blob_url(file, only_path: true)
  end

  def content_type
    file.attached? ? file.content_type : nil
  end

  def byte_size
    file.attached? ? file.byte_size : 0
  end

  private

  def set_filename
    self.filename ||= file.attachment&.blob&.filename&.to_s
  end
end
