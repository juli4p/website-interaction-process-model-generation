# frozen_string_literal: true

require_relative 'base'

module Ferrum
  module Actions
    # Handles keyboard actions for a Ferrum session.
    class Keyboard < Base
      KEY_MAPPING = {
        'Enter' => :enter,
        'Escape' => :escape,
        'Tab' => :tab,
        'Backspace' => :backspace,
        'Delete' => :delete,
        'ArrowUp' => :up,
        'ArrowDown' => :down,
        'ArrowLeft' => :left,
        'ArrowRight' => :right,
        'Home' => :home,
        'End' => :end,
        'PageUp' => :pageup,
        'PageDown' => :pagedown
      }.freeze

      TYPE_TEXT_STRATEGIES = %i[
        selector
        focused
      ].freeze

      DEFAULT_TYPE_TEXT_STRATEGY = :selector

      def type_text(
        text:,
        strategy: DEFAULT_TYPE_TEXT_STRATEGY,
        selector_type: nil,
        selector_segments: nil,
        selector_indexes: nil,
        timeout: DEFAULT_TIMEOUT,
        interval: DEFAULT_INTERVAL
      )
        strategy = strategy.to_sym

        unless TYPE_TEXT_STRATEGIES.include?(strategy)
          raise ArgumentError,
                "Unknown type text strategy: #{strategy.inspect}"
        end

        nodes_found = nil

        case strategy
        when :selector
          node, nodes_found, = find_node(
            selector_type: selector_type,
            selector_segments: selector_segments,
            selector_indexes: selector_indexes,
            timeout: timeout,
            interval: interval,
            require_stable: true
          )

          focus_node(node)

        when :focused
          # Intentionally do nothing:
          # text is typed into whichever element currently has focus.
        end

        browser.keyboard.type(text)

        log(
          :info,
          'type_text_success',
          strategy: strategy,
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          nodes_found: nodes_found,
          text_length: text.length
        )

        {
          strategy: strategy,
          nodesFound: nodes_found,
          textLength: text.length
        }
      rescue StandardError => e
        log(
          :error,
          'type_text_failed',
          strategy: strategy,
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          text_length: text.length,
          error: e
        )

        raise
      end

      def press_special_key(
        key,
        shift: false,
        ctrl: false,
        alt: false,
        meta: false
      )
        ferrum_key = KEY_MAPPING[key.to_s]

        raise ArgumentError, "Invalid key: #{key}" unless ferrum_key

        modifiers = build_modifiers(
          shift: shift,
          ctrl: ctrl,
          alt: alt,
          meta: meta
        )

        keys = [*modifiers, ferrum_key]

        browser.keyboard.type(keys)

        log(
          :info,
          'press_special_key_success',
          key: key,
          ferrum_key: ferrum_key,
          modifiers: modifiers
        )

        true
      rescue StandardError => e
        log(
          :error,
          'press_special_key_failed',
          key: key,
          ferrum_key: ferrum_key,
          shift: shift,
          ctrl: ctrl,
          alt: alt,
          meta: meta,
          error: e
        )

        raise
      end

      private

      def focus_node(node)
        node.evaluate <<~JS
          (() => {
            this.scrollIntoView({
              block: "center",
              inline: "center"
            });

            this.focus();
          })()
        JS
      end
    end
  end
end
