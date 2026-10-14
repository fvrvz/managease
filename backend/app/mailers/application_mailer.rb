# frozen_string_literal: true

class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch('MAILER_SENDER', 'notifications@managease.local')
  layout 'mailer'
end

