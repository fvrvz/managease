require_relative 'boot'

require 'rails/all'

Bundler.require(*Rails.groups)

module Managease
  class Application < Rails::Application
    config.load_defaults 8.0

    # API-only mode
    config.api_only = true

    # Time zone
    config.time_zone = 'UTC'

    # Autoload paths
    config.autoload_paths += %W[#{config.root}/app/services #{config.root}/app/policies]

    # Active Storage service
    config.active_storage.service = :local

    # Do not generate system test files
    config.generators.system_tests = nil

    # Generators config
    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot, dir: 'spec/factories'
    end

    # Locales
    config.i18n.default_locale = :en
  end
end
