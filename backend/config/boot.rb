# frozen_string_literal: true

ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __dir__)

# Suppress noisy gem deprecation warnings from Rails 8.1 / 8.2 transition
Warning[:deprecated] = false if defined?(Warning) && Warning.respond_to?(:[]=)

require 'bundler/setup' # Set up gems listed in the Gemfile.
require 'bootsnap/setup' # Speed up boot time by caching expensive operations.
