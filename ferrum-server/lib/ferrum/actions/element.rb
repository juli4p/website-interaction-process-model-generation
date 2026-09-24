# frozen_string_literal: true

require_relative 'base'

module Ferrum
  module Actions
    class Element < Base
      def outer_html(
        selector_type:,
        selector_segments:,
        selector_indexes:,
        timeout: DEFAULT_TIMEOUT,
        interval: DEFAULT_INTERVAL
      )
        node, nodes_found, = find_node(
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          timeout: timeout,
          interval: interval,
          # outerHTML only requires the element to exist in the DOM;
          # its layout does not need to be stable.
          require_stable: false
        )

        html = node.evaluate('this.outerHTML')

        log(
          :info,
          'element_outer_html_success',
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          nodes_found: nodes_found,
          html_length: html.length
        )

        {
          element: html,
          nodesFound: nodes_found
        }
      rescue StandardError => e
        log(
          :error,
          'element_outer_html_failed',
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          error: e
        )

        raise
      end
    end
  end
end
