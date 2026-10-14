# frozen_string_literal: true

module Api
  module V1
    class BaseController < ApplicationController
      include Pagy::Backend

      before_action :authenticate_user!

      rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
      rescue_from ActiveRecord::RecordNotDestroyed, with: :render_record_invalid

      private

      def render_record_invalid(exception)
        render json: {
          error: 'Validation failed',
          details: exception.record.errors.full_messages
        }, status: :unprocessable_entity
      end

      def render_paginated(serializer_class, records, **options)
        pagy, paginated_records = pagy(records)

        render json: {
          data: serializer_class.new(paginated_records, options).serializable_hash[:data],
          meta: pagy_metadata(pagy)
        }
      end

      def render_success(data, status: :ok)
        render json: data, status: status
      end

      def render_created(serializer_class, record, **options)
        render json: serializer_class.new(record, options).serializable_hash, status: :created
      end

      def render_serialized(serializer_class, record_or_records, status: :ok, **options)
        render json: serializer_class.new(record_or_records, options).serializable_hash, status: status
      end

      def pagy_metadata(pagy)
        {
          current_page: pagy.page,
          next_page: pagy.next,
          prev_page: pagy.prev,
          total_pages: pagy.pages,
          total_count: pagy.count,
          per_page: pagy.limit
        }
      end
    end
  end
end
