# frozen_string_literal: true

module Ferrum
  module Actions
    class Navigation
      def initialize(session)
        @session = session
      end

      def open_url(url)
        page.go_to(url)
        wait_for_idle
        result = {
          currentUrl: @session.current_url,
          title: @session.title
        }
        log(
          :info,
          'navigate_success',
          url: url,
          current_url: result[:currentUrl],
          title: result[:title]
        )
        result
      rescue StandardError => e
        log(:error, 'navigate_failed', url: url, error: e)
        raise
      end

      private

      def page = @session.page

      def wait_for_idle
        page.network.wait_for_idle(timeout: 5)
      rescue ::Ferrum::TimeoutError => e
        log(:warn, 'network_idle_timeout', error: e)
      end

      def log(...)
        @session.log(...)
      end
    end
  end
end
