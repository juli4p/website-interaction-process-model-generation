# frozen_string_literal: true

require 'fileutils'

module Ferrum
  module Actions
    class Screenshot
      def initialize(session)
        @session = session
      end

      def screenshot(full: false)
        directory = File.expand_path(
          '../../../public/screenshots',
          __dir__
        )

        FileUtils.mkdir_p(directory)

        timestamp = Time.now.strftime('%Y%m%dT%H%M%S%L')

        filename = "#{timestamp}-session-#{@session.id}-step-#{@session.step_id}.png"

        path = File.join(directory, filename)

        page.screenshot(
          path: path,
          full: full
        )

        screenshot_url = "#{PUBLIC_BASE_URL}/screenshots/#{filename}"

        log(
          :info,
          'screenshot_success',
          full: full,
          path: path,
          url: screenshot_url
        )

        {
          screenshotUrl: screenshot_url
        }
      rescue StandardError => e
        log(
          :error,
          'screenshot_failed',
          full: full,
          error: e
        )

        raise
      end

      private

      def page = @session.page

      def log(...)
        @session.log(...)
      end
    end
  end
end
