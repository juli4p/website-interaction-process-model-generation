# frozen_string_literal: true

require 'json'
require_relative 'base'

module Ferrum
  module Actions
    class Clipboard < Base
      def copy(
        selector_type:,
        selector_segments:,
        selector_indexes:,
        selection_start:,
        selection_end:,
        timeout: DEFAULT_TIMEOUT,
        interval: DEFAULT_INTERVAL
      )
        perform_clipboard_action(
          action: :copy,
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          selection_start: selection_start,
          selection_end: selection_end,
          timeout: timeout,
          interval: interval
        )
      end

      def cut(
        selector_type:,
        selector_segments:,
        selector_indexes:,
        selection_start:,
        selection_end:,
        timeout: DEFAULT_TIMEOUT,
        interval: DEFAULT_INTERVAL
      )
        perform_clipboard_action(
          action: :cut,
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          selection_start: selection_start,
          selection_end: selection_end,
          timeout: timeout,
          interval: interval
        )
      end

      private

      def perform_clipboard_action(
        action:,
        selector_type:,
        selector_segments:,
        selector_indexes:,
        selection_start:,
        selection_end:,
        timeout:,
        interval:
      )
        node, nodes_found, = find_node(
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          timeout: timeout,
          interval: interval,
          require_stable: true
        )

        validate_selection!(
          selection_start: selection_start,
          selection_end: selection_end
        )

        selection_result = process_selection(
          node,
          selection_start: selection_start,
          selection_end: selection_end,
          cut: action == :cut
        )

        copied_text = selection_result.fetch('copiedText')
        actual_selection_start =
          selection_result.fetch('selectionStart')
        actual_selection_end =
          selection_result.fetch('selectionEnd')
        selection_type =
          selection_result.fetch('selectionType')
        text_removed =
          selection_result.fetch('textRemoved')

        log(
          :info,
          "#{action}_success",
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          nodes_found: nodes_found,
          selection_type: selection_type,
          selection_start: actual_selection_start,
          selection_end: actual_selection_end,
          copied_text_length: copied_text.length,
          text_removed: text_removed
        )

        {
          copiedText: copied_text,
          selectionStart: actual_selection_start,
          selectionEnd: actual_selection_end,
          selectionType: selection_type,
          textRemoved: text_removed
        }
      rescue StandardError => e
        log(
          :error,
          "#{action}_failed",
          selector_type: selector_type,
          selector_segments: selector_segments,
          selector_indexes: selector_indexes,
          selection_start: selection_start,
          selection_end: selection_end,
          error: e
        )

        raise
      end

      def validate_selection!(selection_start:, selection_end:)
        unless selection_start.is_a?(Integer) &&
               selection_start >= 0
          raise ArgumentError,
                'selection_start must be an integer greater than or equal to 0'
        end

        return if selection_end.is_a?(Integer) &&
                  selection_end >= selection_start

        raise ArgumentError,
              'selection_end must be greater than or equal to selection_start'
      end

      def process_selection(node, selection_start:, selection_end:, cut: false)
        json = node.evaluate <<~JS
          JSON.stringify((() => {
            const requestedStart = #{selection_start};
            const requestedEnd = #{selection_end};
            const shouldCut = #{cut};

            const isTextControl =
              typeof this.value === "string" &&
              typeof this.setSelectionRange === "function";

            if (isTextControl) {
              this.focus();

              const actualSelectionStart = Math.min(
                requestedStart,
                this.value.length
              );

              const actualSelectionEnd = Math.min(
                requestedEnd,
                this.value.length
              );

              const copiedText = this.value.slice(
                actualSelectionStart,
                actualSelectionEnd
              );

              this.setSelectionRange(
                actualSelectionStart,
                actualSelectionEnd
              );

              if (shouldCut && !this.disabled && !this.readOnly) {
                const previousValue = this.value;

                const nextValue =
                  previousValue.slice(0, actualSelectionStart)+
                  previousValue.slice(actualSelectionEnd);

                const valueSetter =
                  Object.getOwnPropertyDescriptor(
                    Object.getPrototypeOf(this),
                    "value"
                  )?.set;

                if (valueSetter) {
                  valueSetter.call(this, nextValue);
                } else {
                  this.value = nextValue;
                }

                this.setSelectionRange(
                  actualSelectionStart,
                  actualSelectionStart
                );

                this.dispatchEvent(
                  new InputEvent("input", {
                    bubbles: true,
                    composed: true,
                    inputType: "deleteByCut",
                    data: null
                  })
                );

                this.dispatchEvent(
                  new Event("change", {
                    bubbles: true,
                    composed: true
                  })
                );
              }

              return {
                copiedText,
                selectionStart: actualSelectionStart,
                selectionEnd: actualSelectionEnd,
                selectionType: "text_control",
                textRemoved:
                  shouldCut && !this.disabled && !this.readOnly
              };
            }

            const textNodes = [];
            const walker = document.createTreeWalker(
              this,
              NodeFilter.SHOW_TEXT
            );

            let textNode;

            while ((textNode = walker.nextNode())) {
              textNodes.push(textNode);
            }

            const totalLength = textNodes.reduce(
              (length, currentNode) =>
                length + currentNode.textContent.length,
              0
            );

            const actualSelectionStart = Math.min(
              requestedStart,
              totalLength
            );

            const actualSelectionEnd = Math.min(
              requestedEnd,
              totalLength
            );

            const startPosition = findTextPosition(
              textNodes,
              actualSelectionStart
            );

            const endPosition = findTextPosition(
              textNodes,
              actualSelectionEnd
            );

            if (!startPosition || !endPosition) {
              throw new Error(
                "Could not resolve DOM text selection positions"
              );
            }

            const range = document.createRange();

            range.setStart(
              startPosition.node,
              startPosition.offset
            );

            range.setEnd(
              endPosition.node,
              endPosition.offset
            );

            const selection = window.getSelection();

            selection.removeAllRanges();
            selection.addRange(range);

            const copiedText = selection.toString();
            const editable =
              this.isContentEditable === true ||
              this.closest?.("[contenteditable='true']")?.isContentEditable === true;

            if (shouldCut && editable) {
              range.deleteContents();
              selection.removeAllRanges();

              this.dispatchEvent(
                new InputEvent("input", {
                  bubbles: true,
                  composed: true,
                  inputType: "deleteByCut",
                  data: null
                })
              );
            }

            return {
              copiedText,
              selectionStart: actualSelectionStart,
              selectionEnd: actualSelectionEnd,
              selectionType: editable
                ? "contenteditable"
                : "dom",
              textRemoved: shouldCut && editable
            };

            function findTextPosition(nodes, targetOffset) {
              let consumedLength = 0;

              for (const currentNode of nodes) {
                const nodeLength =
                  currentNode.textContent.length;
                const nodeEnd =
                  consumedLength + nodeLength;

                if (targetOffset <= nodeEnd) {
                  return {
                    node: currentNode,
                    offset:
                      targetOffset - consumedLength
                  };
                }

                consumedLength = nodeEnd;
              }

              const lastNode = nodes.at(-1);

              if (!lastNode) {
                return null;
              }

              return {
                node: lastNode,
                offset: lastNode.textContent.length
              };
            }
          })())
        JS

        raise 'Could not select text' unless json

        JSON.parse(json)
      end
    end
  end
end
