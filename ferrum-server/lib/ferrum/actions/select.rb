# frozen_string_literal: true

require 'json'
require_relative 'base'

module Ferrum
  module Actions
    class Select < Base
      def select_option(
        selector_type:,
        selector_segments:,
        selected_index:,
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
          require_stable: true
        )
        validate_selected_index!(selected_index)

        result = select_by_index(
          node,
          selected_index: selected_index
        )

        log(
          :info,
          'select_option_success',
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          nodes_found: nodes_found,
          selected_index: result.fetch('selectedIndex'),
          selected_value: result.fetch('value'),
          selected_text: result.fetch('selectedText')
        )

        {
          selectedIndex: result.fetch('selectedIndex'),
          value: result.fetch('value'),
          selectedText: result.fetch('selectedText')
        }
      rescue StandardError => e
        log(
          :error,
          'select_option_failed',
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          selected_index: selected_index,
          error: e
        )

        raise
      end

      private

      def validate_selected_index!(selected_index)
        return if selected_index.is_a?(Integer) && selected_index >= 0

        raise ArgumentError,
              'selected_index must be an integer greater than or equal to 0'
      end

      def select_by_index(node, selected_index:)
        json = node.evaluate <<~JS
          JSON.stringify((() => {
            if (!(this instanceof HTMLSelectElement)) {
              throw new Error(
                `Selected element is not a <select>, but <${this.tagName.toLowerCase()}>`
              );
            }

            const requestedIndex = #{selected_index};

            if (requestedIndex >= this.options.length) {
              throw new Error(
                `Selected index ${requestedIndex} is out of range. ` +
                `The select element contains ${this.options.length} option(s).`
              );
            }
            this.scrollIntoView({
              block: "center",
              inline: "center"
              });

            this.focus();
            this.selectedIndex = requestedIndex;

            this.dispatchEvent(
                new Event("input", {
                  bubbles: true,
                  composed: true
                  })
                );
            this.dispatchEvent(
              new Event("change", {
                bubbles: true,
                composed: true
              })
            );

            const selectedOption =
              this.options[this.selectedIndex] ?? null;

            return {
              selectedIndex: this.selectedIndex,
              value: this.value,
              selectedText:
                selectedOption?.textContent?.trim() ?? null
            };
          })())
        JS

        raise 'Could not select option' unless json

        JSON.parse(json)
      end
    end
  end
end
