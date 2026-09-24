# frozen_string_literal: true

module Ferrum
  module Actions
    class PageSnapshot
      def initialize(session)
        @session = session
      end

      def page_snapshot
        raw_html = page.body
        debug_html = html_with_open_shadow_roots

        result = {
          currentUrl: @session.current_url,
          title: @session.title,
          html: raw_html,
          debugHtml: debug_html,
          screenshot: page.screenshot(
            encoding: :base64,
            full: true
          )
        }

        log(
          :info,
          'page_snapshot_success',
          html_length: raw_html.length,
          debug_html_length: debug_html.length,
          screenshot_length: result[:screenshot].length
        )

        result
      rescue StandardError => e
        log(:error, 'page_snapshot_failed', error: e)
        raise
      end

      private

      def html_with_open_shadow_roots
        page.evaluate <<~JS
          (() => {
            function cloneNodeWithShadowRoots(node) {
              if (node.nodeType !== Node.ELEMENT_NODE) {
                return node.cloneNode(true);
              }

              const clone = node.cloneNode(false);

              for (const child of node.childNodes) {
                clone.appendChild(
                  cloneNodeWithShadowRoots(child)
                );
              }

              if (node.shadowRoot) {
                const shadowTemplate =
                  document.createElement("template");

                shadowTemplate.setAttribute(
                  "shadowrootmode",
                  "open"
                );

                for (const shadowChild of node.shadowRoot.childNodes) {
                  shadowTemplate.content.appendChild(
                    cloneNodeWithShadowRoots(shadowChild)
                  );
                }

                clone.appendChild(shadowTemplate);
              }

              return clone;
            }

            const clonedDocumentElement =
              cloneNodeWithShadowRoots(document.documentElement);

            const documentType = document.doctype
              ? `<!DOCTYPE ${document.doctype.name}>\\n`
              : "";

            return documentType + clonedDocumentElement.outerHTML;
          })()
        JS
      end

      def page = @session.page

      def log(...)
        @session.log(...)
      end
    end
  end
end
