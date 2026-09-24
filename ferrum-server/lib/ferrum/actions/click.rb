# frozen_string_literal: true

require 'json'
require_relative 'base'

module Ferrum
  module Actions
    class Click < Base
      STRATEGIES = %i[
        css
        xy
        css_fallback_xy
      ].freeze
      DEFAULT_STRATEGY = :css

      # wrapper for server endpoint to click with different strategies
      def click(
        selector_type: nil,
        selector_segments: nil,
        selector_indexes: nil,
        strategy: DEFAULT_STRATEGY,
        timeout: DEFAULT_TIMEOUT,
        interval: DEFAULT_INTERVAL,
        rx: 0.5,
        ry: 0.5,
        debug_marker: false,
        shift: false,
        ctrl: false,
        alt: false,
        meta: false
      )
        strategy = strategy.to_sym
        raise ArgumentError, "Unknown click strategy: #{strategy}" unless STRATEGIES.include?(strategy)

        keys = build_modifiers(shift: shift, ctrl: ctrl, alt: alt, meta: meta)

        case strategy
        when :css
          click_css(selector_type: selector_type, selector_segments: selector_segments, selector_indexes: selector_indexes, timeout: timeout, interval: interval, debug_marker: debug_marker, keys: keys)
        when :xy
          if selector_present?(selector_type, selector_segments, selector_indexes)
            click_element_xy(selector_type: selector_type, selector_segments: selector_segments, selector_indexes: selector_indexes, timeout: timeout, interval: interval, rx: rx, ry: ry, debug_marker: debug_marker, keys: keys)
          else
            click_viewport_xy(rx: rx, ry: ry, debug_marker: debug_marker, keys: keys)
          end
        when :css_fallback_xy
          click_css_fallback_xy(selector_type: selector_type, selector_segments: selector_segments, selector_indexes: selector_indexes, timeout: timeout, interval: interval, rx: rx, ry: ry, debug_marker: debug_marker, keys: keys)
        else
          raise ArgumentError, "Unknown click strategy: #{strategy}"
        end
      end

      private

      # default css click, clicks node in the middle of the element
      def click_css(
        selector_type:,
        selector_segments:,
        selector_indexes:,
        timeout: DEFAULT_TIMEOUT,
        interval: DEFAULT_INTERVAL,
        debug_marker: false,
        keys: []
      )
        node, nodes_found, rect = find_node(
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          timeout: timeout,
          interval: interval,
          require_stable: true
        )

        if debug_marker
          x = rect[:left] + rect[:width] * 0.5
          y = rect[:top] + rect[:height] * 0.5

          draw_debug_click_marker(x, y)
          # sleep 0.5 # wait for the user to see the marker / do a screenshot etc
        end

        click_node(node, keys: keys)

        log(
          :info,
          'click_css_success',
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          nodes_found: nodes_found,
          modifiers: keys
        )

        {
          strategy: :css,
          nodesFound: nodes_found
        }
      end

      # clicks node at relative coordinates (rx, ry) where 0.0 <= rx, ry <= 1.0
      # better if the node is not clickable, f.e. for divs or other non-interactive elements
      # or if the user wants to click at a specific position within the element
      def click_element_xy(
        selector_type:,
        selector_segments:,
        selector_indexes:,
        timeout: DEFAULT_TIMEOUT,
        interval: DEFAULT_INTERVAL,
        rx: 0.5,
        ry: 0.5,
        debug_marker: false,
        keys: []
      )
        _node, nodes_found, rect = find_node(
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          timeout: timeout,
          interval: interval,
          require_stable: true
        )

        x = rect[:left] + rect[:width] * rx
        y = rect[:top] + rect[:height] * ry

        # On some macOS/Retina setups (e.g. the built-in MacBook display), Google's
        # consent dialog may ignore an otherwise correctly positioned CDP mouse click
        # while another element (such as the search field) still has focus.
        # Clearing the active focus makes the synthetic click behave consistently across
        # displays. The exact root cause appears to be related to Chrome's focus/event
        # handling rather than incorrect click coordinates.
        page.evaluate('document.activeElement?.blur()')

        click_xy(x, y, debug_marker: debug_marker, keys: keys)

        log(:info, 'click_element_xy_success', selector_type: selector_type, selector_segments: selector_segments, selector_indexes: selector_indexes, nodes_found: nodes_found, rx: rx, ry: ry, x: x.round(2), y: y.round(2), modifiers: keys)

        {
          strategy: :xy,
          coordinateSystem: :element,
          nodesFound: nodes_found
        }
      end

      def click_viewport_xy(rx: 0.5, ry: 0.5, debug_marker: false, keys: [])
        viewport = page.evaluate <<~JS
          (() => {
            return {
              width: window.innerWidth,
              height: window.innerHeight
            };
          })()
        JS

        width = viewport.fetch('width').to_f
        height = viewport.fetch('height').to_f

        x = width * rx
        y = height * ry

        page.evaluate('document.activeElement?.blur()')

        click_xy(x, y, debug_marker: debug_marker, keys: keys)

        log(
          :info,
          'click_viewport_xy_success',
          rx: rx,
          ry: ry,
          viewport_width: width,
          viewport_height: height,
          x: x.round(2),
          y: y.round(2),
          modifiers: keys
        )

        {
          strategy: :xy,
          coordinateSystem: :viewport,
          nodesFound: nil
        }
      end

      def click_css_fallback_xy(selector_type:, selector_segments:, selector_indexes:, timeout: DEFAULT_TIMEOUT, interval: DEFAULT_INTERVAL, rx: 0.5, ry: 0.5, debug_marker: false, keys: [])
        click_css(selector_type: selector_type, selector_segments: selector_segments, timeout: timeout, interval: interval, selector_indexes: selector_indexes, debug_marker: debug_marker, keys: keys)
        # dont go into fallback if no node was found
      rescue Ferrum::ElementNotFoundError
        raise
      rescue StandardError => e
        log(:warn, 'click_css_failed_using_xy_fallback', selector_type: selector_type, selector_segments: selector_segments, selector_indexes: selector_indexes, modifiers: keys, error: e)

        click_element_xy(selector_type: selector_type, selector_segments: selector_segments, selector_indexes: selector_indexes, timeout: timeout, interval: interval, rx: rx, ry: ry, debug_marker: debug_marker, keys: keys)
      end

      def click_node(node, keys: [])
        node.focus if node.focusable?
        node.click(keys: keys)
      end

      def click_xy(x, y, debug_marker: false, keys: [])
        if debug_marker
          draw_debug_click_marker(x, y)
          # @session.screenshot(full: false)
          # sleep 0.5 # wait for the user to see the marker / do a screenshot etc
        end
        modifiers = page.keyboard.modifiers(keys)
        page.mouse.click(x: x, y: y, modifiers: modifiers) # , delay: click_delay)
      end

      def selector_present?(selector_type, selector_segments, selector_indexes)
        !selector_type.nil? || !selector_segments.nil? || !selector_indexes.nil?
      end

      def draw_debug_click_marker(x, y)
        page.evaluate <<~JS
          (() => {
            document.getElementById("__debug_click__")?.remove();

            const dot = document.createElement("div");
            dot.id = "__debug_click__";

            Object.assign(dot.style, {
              position: "fixed",
              left: "#{x - 3}px",
              top: "#{y - 3}px",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "red",
              border: "1px solid white",
              boxShadow: "0 0 3px red",
              zIndex: "2147483647",
              pointerEvents: "none"
            });

            document.documentElement.appendChild(dot);
          })();
        JS
      end
    end
  end
end
