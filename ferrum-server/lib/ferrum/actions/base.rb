# frozen_string_literal: true

require 'json'
require_relative '../errors'

module Ferrum
  module Actions
    class Base
      DEFAULT_TIMEOUT = 5
      DEFAULT_INTERVAL = 0.1

      SELECTOR_TYPES = %w[
        css
        shadow_css
      ].freeze

      def initialize(session)
        @session = session
      end

      private

      def browser = @session.browser
      def page = @session.page

      def find_node(
        selector_type:,
        selector_segments:,
        selector_indexes:,
        require_stable:,
        timeout: DEFAULT_TIMEOUT,
        interval: DEFAULT_INTERVAL
      )
        validate_selector!(
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes
        )

        deadline = monotonic_time + timeout

        nodes_found = nil
        last_error = nil
        last_rect = nil
        stable_count = 0

        loop do
          begin
            node, nodes_found = lookup_node(
              selector_type: selector_type,
              selector_segments: selector_segments,
              selector_indexes: selector_indexes
            )

            if node
              last_error = nil
              return [node, nodes_found, nil] unless require_stable

              rect = bounding_rect(node)

              if rect

                # Wait until the element's bounding box is stable across consecutive checks
                # Dynamic pages may expose the element before layout/rendering has finished,
                # which can otherwise cause an XY click to use outdated coordinates
                # or a CSS click to happen too early
                if last_rect == rect
                  stable_count += 1
                else
                  stable_count = 0
                end

                last_rect = rect

                return [node, nodes_found, rect] if stable_count >= 1
              else
                stable_count = 0
                last_rect = nil
              end
            else
              stable_count = 0
              last_rect = nil
            end
          rescue Ferrum::NodeNotFoundError => e
            last_error = e
            stable_count = 0
            last_rect = nil
          end

          break if monotonic_time >= deadline

          sleep interval
        end

        log(
          :warn,
          'find_node_failed',
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          nodes_found: nodes_found || 'lookup_failed',
          require_stable: require_stable,
          last_rect: last_rect,
          timeout: timeout,
          error: last_error
        )

        raise Ferrum::ElementNotFoundError,
              "Element for #{selector_type.inspect} selector " \
              "#{selector_segments.inspect} with indexes " \
              "#{selector_indexes.inspect} not found#{require_stable ? ' or not stable' : ''} " \
              "after #{timeout}s"
      end

      def lookup_node(
        selector_type:,
        selector_segments:,
        selector_indexes:
      )
        case selector_type.to_s
        when 'css'
          selector = selector_segments.fetch(0)
          index = selector_indexes.fetch(0)

          nodes = page.css(selector)

          [nodes[index], nodes.size]
        when 'shadow_css'
          lookup_shadow_node(
            selector_segments,
            selector_indexes
          )
        else
          raise ArgumentError,
                "Unknown selector type: #{selector_type.inspect}"
        end
      end

      def lookup_shadow_node(selector_segments, selector_indexes)
        selectors_json = JSON.generate(selector_segments)
        indexes_json = JSON.generate(selector_indexes)

        result = page.evaluate <<~JS
          (() => {
            const selectors = #{selectors_json};
            const indexes = #{indexes_json};

            let root = document;
            let element = null;
            let nodesFound = null;

            for (
              let segmentIndex = 0;
              segmentIndex < selectors.length;
              segmentIndex += 1
            ) {
              const selector = selectors[segmentIndex];
              const index = indexes[segmentIndex];
              const matches = root.querySelectorAll(selector);

              nodesFound = matches.length;
              element = matches[index] ?? null;

              if (!element) {
                return {
                  element: null,
                  nodesFound
                };
              }

              const isLastSegment =
                segmentIndex === selectors.length - 1;

              if (!isLastSegment) {
                if (!element.shadowRoot) {
                  return {
                    element: null,
                    nodesFound
                  };
                }

                root = element.shadowRoot;
              }
            }

            return {
              element,
              nodesFound
            };
          })()
        JS

        return [nil, nil] unless result.is_a?(Hash)

        node = result['element']
        nodes_found = result['nodesFound']

        [
          node.is_a?(::Ferrum::Node) ? node : nil,
          nodes_found
        ]
      end

      def bounding_rect(node)
        json = node.evaluate <<~JS
          JSON.stringify((() => {
            this.scrollIntoView({
              block: "center",
              inline: "center"
            });

            const rect = this.getBoundingClientRect();

            return {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            };
          })())
        JS

        return nil unless json

        result = JSON.parse(json)

        width = result['width'].to_f
        height = result['height'].to_f

        return nil unless width.positive? && height.positive?

        {
          left: result['left'].to_f,
          top: result['top'].to_f,
          width: width,
          height: height
        }
      end

      def validate_selector!(
        selector_type:,
        selector_segments:,
        selector_indexes:
      )
        unless SELECTOR_TYPES.include?(selector_type.to_s)
          raise ArgumentError,
                "Unknown selector type: #{selector_type.inspect}"
        end

        unless selector_segments.is_a?(Array) &&
               selector_segments.any? &&
               selector_segments.all? do |segment|
                 segment.is_a?(String) && !segment.empty?
               end
          raise ArgumentError,
                'selector_segments must be a non-empty array of strings'
        end

        unless selector_indexes.is_a?(Array) &&
               selector_indexes.length == selector_segments.length &&
               selector_indexes.all? do |index|
                 index.is_a?(Integer) && index >= 0
               end
          raise ArgumentError,
                'selector_indexes must contain one non-negative integer per selector segment'
        end

        if selector_type.to_s == 'css' &&
           selector_segments.length != 1
          raise ArgumentError,
                'css selectors must contain exactly one segment'
        end

        return unless selector_type.to_s == 'shadow_css' &&
                      selector_segments.length < 2

        raise ArgumentError,
              'shadow_css selectors must contain at least two segments'
      end

      def monotonic_time
        Process.clock_gettime(Process::CLOCK_MONOTONIC)
      end

      def build_modifiers(
        shift: false,
        ctrl: false,
        alt: false,
        meta: false
      )
        keys = []

        keys << :shift if shift
        keys << :control if ctrl
        keys << :alt if alt
        keys << :meta if meta

        keys
      end

      def log(...)
        @session.log(...)
      end
    end
  end
end
