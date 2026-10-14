# frozen_string_literal: true

Rails.application.configure do
  config.action_mailer.default_url_options = {
    host: ENV.fetch('APP_HOST', 'localhost'),
    port: ENV.fetch('APP_PORT', 3000)
  }

  if ENV['SMTP_ADDRESS'].present?
    config.action_mailer.delivery_method = :smtp
    config.action_mailer.smtp_settings = {
      address:              ENV['SMTP_ADDRESS'],
      port:                 ENV.fetch('SMTP_PORT', 587).to_i,
      domain:               ENV.fetch('SMTP_DOMAIN', 'localhost'),
      user_name:            ENV['SMTP_USERNAME'],
      password:             ENV['SMTP_PASSWORD'],
      authentication:       ENV.fetch('SMTP_AUTH', 'plain'),
      enable_starttls_auto: ENV.fetch('SMTP_TLS', 'true') == 'true'
    }
  else
    # In development/test mode or fallback when SMTP is not configured
    config.action_mailer.delivery_method = Rails.env.production? ? :smtp : :test
  end
end
