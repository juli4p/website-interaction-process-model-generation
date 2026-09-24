# frozen_string_literal: true

require 'rack/utils'

get '/sessions/:id/debug' do
  content_type 'text/html', charset: 'utf-8'
  response.headers['Cache-Control'] = 'no-store'

  session_id = params[:id]
  env['session_id'] = session_id

  session = get_session!(session_id)
  session_id_html = Rack::Utils.escape_html(session.id.to_s)

  snapshot = session.page_snapshot

  # raw_html = snapshot[:html].to_s
  debug_html = snapshot[:debugHtml].to_s

  current_url = Rack::Utils.escape_html(snapshot[:currentUrl].to_s)
  title = Rack::Utils.escape_html(snapshot[:title].to_s)

  formatted_html = debug_html
                   .gsub(/>\s*</, ">\n<")
                   .lines
                   .map(&:strip)
                   .join("\n")

  page_html = Rack::Utils.escape_html(formatted_html)
  screenshot = snapshot[:screenshot]

  preview_base_url = Rack::Utils.escape_html(
    snapshot[:currentUrl].to_s
  )

  preview_html = debug_html.sub(
    /<head([^>]*)>/i,
    %(<head\\1><base href="#{preview_base_url}">)
  )

  iframe_html = preview_html
                .gsub('&', '&amp;')
                .gsub('"', '&quot;')

  log(
    :info,
    'debug_page_opened',
    current_url: snapshot[:currentUrl]
  )

  <<~HTML
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>Ferrum Debug – Session #{session_id_html}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 32px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            color: #222;
          }

          main {
            max-width: 1400px;
            margin: 0 auto;
          }

          h1 {
            margin-bottom: 32px;
          }

          .section {
            margin-bottom: 24px;
            padding: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 10px;
          }

          .metadata p {
            margin: 8px 0;
            overflow-wrap: anywhere;
          }

          .screenshot {
            display: block;
            max-width: 100%;
            height: auto;
            margin-top: 16px;
            border: 1px solid #ccc;
            border-radius: 6px;
          }

          details {
            margin-top: 10px;
          }

          details:first-child {
            margin-top: 0;
          }

          summary {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            user-select: none;
            font-size: 18px;
            font-weight: 600;
            padding: 8px 0;
            list-style: none;
          }

          summary::-webkit-details-marker {
            display: none;
          }

          summary::before {
            content: "▶";
            font-size: 14px;
            transition: transform 0.2s ease;
          }

          details[open] > summary::before {
            transform: rotate(90deg);
          }

          summary:hover {
            color: #0b63ce;
          }

          details > :not(summary) {
            margin-left: 20px;
          }

          .selector-tool {
            margin-top: 16px;
            padding: 16px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 6px;
          }

          .selector-input-row {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          }

          .selector-input {
            flex: 1;
            min-width: 300px;
            padding: 10px 12px;
            border: 1px solid #bbb;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
          }

          .selector-input:focus {
            outline: 2px solid #0b63ce;
            outline-offset: 1px;
            border-color: #0b63ce;
          }

          .selector-button {
            padding: 10px 16px;
            border: 1px solid #0b63ce;
            border-radius: 5px;
            background: #0b63ce;
            color: white;
            font-weight: 600;
            cursor: pointer;
          }

          .selector-button:hover:not(:disabled) {
            background: #084f9f;
          }

          .selector-button:disabled {
            cursor: default;
            opacity: 0.45;
          }

          .selector-button-secondary {
            border-color: #777;
            background: white;
            color: #333;
          }

          .selector-button-secondary:hover:not(:disabled) {
            background: #eee;
          }

          .selector-info-row {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 12px;
          }

          .selector-match-count {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 14px;
          }

          .selector-index-control {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .selector-index-label {
            font-size: 14px;
            font-weight: 600;
          }

          .selector-index-button {
            width: 34px;
            height: 34px;
            padding: 0;
            border: 1px solid #bbb;
            border-radius: 5px;
            background: white;
            color: #222;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
          }

          .selector-index-button:hover:not(:disabled) {
            background: #eee;
          }

          .selector-index-button:disabled {
            cursor: default;
            opacity: 0.4;
          }

          .selector-index-input {
            width: 70px;
            height: 34px;
            padding: 6px 8px;
            border: 1px solid #bbb;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            text-align: center;
          }

          .selector-index-input:focus {
            outline: 2px solid #0b63ce;
            outline-offset: 1px;
            border-color: #0b63ce;
          }

          .selector-status {
            min-height: 20px;
            margin-top: 12px;
            font-weight: 600;
          }

          .selector-status.success {
            color: #137333;
          }

          .selector-status.empty {
            color: #805500;
          }

          .selector-status.error {
            color: #b3261e;
          }

          .selector-results-details {
            margin-top: 12px;
          }

          .selector-results-details > summary {
            font-size: 14px;
            font-weight: 600;
          }

          .selector-results-details > :not(summary) {
            margin-left: 0;
          }

          .selector-results {
            max-height: 500px;
            margin-top: 8px;
            overflow: auto;
            border: 1px solid #ccc;
            border-radius: 6px;
            background: white;
          }

          .selector-result {
            padding: 16px;
            border-bottom: 1px solid #ddd;
          }

          .selector-result:last-child {
            border-bottom: 0;
          }

          .selector-result-selected {
            background: #eef5ff;
          }

          .selector-result-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
          }

          .selector-result-title {
            font-weight: 700;
          }

          .selector-property {
            margin: 8px 0;
          }

          .selector-property-name {
            font-weight: 700;
          }

          .selector-code {
            margin: 6px 0 0;
            padding: 10px;
            overflow: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f6f8fa;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.45;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }

          .html-preview {
            width: 100%;
            height: 700px;
            margin-top: 16px;
            border: 1px solid #ccc;
            border-radius: 6px;
            background: white;
          }

          .html-source {
            width: 100%;
            min-height: 600px;
            margin-top: 16px;
            padding: 16px;
            resize: vertical;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre;
          }
        </style>
      </head>

      <body>
        <main>
          <h1>Ferrum Session #{session_id_html} Debugging</h1>

          <section class="section">
            <details open>
              <summary>Metadata</summary>

              <div class="metadata">
                <p>
                  <strong>Session:</strong>
                  #{session_id_html}
                </p>

                <p>
                  <strong>URL:</strong>

                  <a
                    href="#{current_url}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    #{current_url}
                  </a>
                </p>

                <p>
                  <strong>Title:</strong>
                  #{title}
                </p>
              </div>
            </details>
          </section>

          <section class="section">
            <details open>
              <summary>Screenshot</summary>

              <img
                class="screenshot"
                src="data:image/png;base64,#{screenshot}"
                alt="Screenshot of the current browser page"
              />
            </details>
          </section>

          <section class="section">
            <details open>
              <summary>HTML</summary>

              <details open>
                <summary>HTML Preview</summary>

                <div class="selector-tool">
                  <div class="selector-input-row">
                    <input
                      id="css-selector"
                      class="selector-input"
                      type="text"
                      placeholder="CSS selector, for example: button.submit"
                      autocomplete="off"
                      spellcheck="false"
                    />

                    <button
                      id="run-selector"
                      class="selector-button"
                      type="button"
                    >
                      Test selector
                    </button>

                    <button
                      id="clear-selector"
                      class="selector-button selector-button-secondary"
                      type="button"
                    >
                      Clear
                    </button>
                  </div>

                  <div class="selector-info-row">
                    <div class="selector-match-count">
                      Matches:
                      <strong id="selector-match-count">0</strong>
                    </div>

                    <div class="selector-index-control">
                      <span class="selector-index-label">
                        Index:
                      </span>

                      <button
                        id="selector-index-down"
                        class="selector-index-button"
                        type="button"
                        disabled
                        aria-label="Previous match"
                      >
                        −
                      </button>

                      <input
                        id="selector-index"
                        class="selector-index-input"
                        type="number"
                        min="0"
                        max="0"
                        value="0"
                        disabled
                      />

                      <button
                        id="selector-index-up"
                        class="selector-index-button"
                        type="button"
                        disabled
                        aria-label="Next match"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div
                    id="selector-status"
                    class="selector-status"
                    aria-live="polite"
                  ></div>

                  <details
                    id="selector-results-details"
                    class="selector-results-details"
                  >
                    <summary>Match details</summary>

                    <div
                      id="selector-results"
                      class="selector-results"
                    ></div>
                  </details>
                </div>

                <iframe
                  id="html-preview"
                  class="html-preview"
                  sandbox="allow-same-origin"
                  srcdoc="#{iframe_html}"
                ></iframe>
              </details>

              <details open>
                <summary>Source Code</summary>

                <textarea
                  class="html-source"
                  readonly
                  spellcheck="false"
                >#{page_html}</textarea>
              </details>
            </details>
          </section>
        </main>

        <script>
          const selectorInput =
            document.getElementById("css-selector");

          const runSelectorButton =
            document.getElementById("run-selector");

          const clearSelectorButton =
            document.getElementById("clear-selector");

          const selectorStatus =
            document.getElementById("selector-status");

          const selectorResults =
            document.getElementById("selector-results");

          const selectorResultsDetails =
            document.getElementById("selector-results-details");

          const selectorMatchCount =
            document.getElementById("selector-match-count");

          const selectorIndexInput =
            document.getElementById("selector-index");

          const selectorIndexDown =
            document.getElementById("selector-index-down");

          const selectorIndexUp =
            document.getElementById("selector-index-up");

          const htmlPreview =
            document.getElementById("html-preview");

          const highlightClass =
            "__ferrum_debug_selector_match__";

          const highlightStyleId =
            "__ferrum_debug_selector_style__";

          let matchedElements = [];
          let selectedIndex = 0;

          function getPreviewDocument() {
            return htmlPreview.contentDocument;
          }

          function ensureHighlightStyle(previewDocument) {
            if (
              previewDocument.getElementById(highlightStyleId)
            ) {
              return;
            }

            const style = previewDocument.createElement("style");

            style.id = highlightStyleId;

            style.textContent = `
              .${highlightClass} {
                outline: 3px solid red !important;
                outline-offset: 2px !important;
                background-color: rgba(255, 0, 0, 0.08) !important;
              }
            `;

            const target =
              previewDocument.head ||
              previewDocument.documentElement;

            target.appendChild(style);
          }

          function clearHighlights() {
            for (const element of matchedElements) {
              element.classList.remove(highlightClass);
            }
          }

          function clearSelectedResult() {
            for (const result of selectorResults.children) {
              result.classList.remove(
                "selector-result-selected"
              );
            }
          }

          function updateIndexControls() {
            const hasMatches = matchedElements.length > 0;

            selectorIndexInput.disabled = !hasMatches;

            selectorIndexDown.disabled =
              !hasMatches || selectedIndex <= 0;

            selectorIndexUp.disabled =
              !hasMatches ||
              selectedIndex >= matchedElements.length - 1;

            selectorIndexInput.min = "0";

            selectorIndexInput.max = hasMatches
              ? String(matchedElements.length - 1)
              : "0";

            selectorIndexInput.value =
              String(selectedIndex);
          }

          function clearResults() {
            clearHighlights();

            matchedElements = [];
            selectedIndex = 0;

            selectorMatchCount.textContent = "0";

            updateIndexControls();

            selectorStatus.textContent = "";
            selectorStatus.className = "selector-status";

            selectorResults.replaceChildren();

            selectorResultsDetails.open = false;
          }

          function createCodeBlock(value) {
            const code = document.createElement("pre");

            code.className = "selector-code";
            code.textContent = value || "—";

            return code;
          }

          function createProperty(name, value) {
            const container = document.createElement("div");
            container.className = "selector-property";

            const label = document.createElement("div");
            label.className = "selector-property-name";
            label.textContent = name;

            container.appendChild(label);
            container.appendChild(createCodeBlock(value));

            return container;
          }

          function getAttributes(element) {
            if (element.attributes.length === 0) {
              return "No attributes";
            }

            return Array.from(element.attributes)
              .filter((attribute) => {
                return attribute.name !== "class" ||
                  attribute.value !== highlightClass;
              })
              .map((attribute) => {
                return `${attribute.name}="${attribute.value}"`;
              })
              .join("\\n");
          }

          function getElementText(element) {
            const text =
              element.innerText ||
              element.textContent ||
              "";

            const normalizedText = text
              .replace(/\\s+/g, " ")
              .trim();

            return normalizedText || "No text";
          }

          function createResult(element, index) {
            const result = document.createElement("article");
            result.className = "selector-result";

            const header = document.createElement("div");
            header.className = "selector-result-header";

            const title = document.createElement("div");
            title.className = "selector-result-title";

            title.textContent =
              `Match ${index + 1}: <${element.tagName.toLowerCase()}>`;

            header.appendChild(title);
            result.appendChild(header);

            result.appendChild(
              createProperty(
                "Tag",
                element.tagName.toLowerCase()
              )
            );

            result.appendChild(
              createProperty(
                "ID",
                element.id || "No ID"
              )
            );

            result.appendChild(
              createProperty(
                "Classes",
                Array.from(element.classList)
                  .filter((className) => {
                    return className !== highlightClass;
                  })
                  .join(" ") || "No classes"
              )
            );

            result.appendChild(
              createProperty(
                "Text",
                getElementText(element)
              )
            );

            result.appendChild(
              createProperty(
                "Attributes",
                getAttributes(element)
              )
            );

            result.appendChild(
              createProperty(
                "outerHTML",
                element.outerHTML
              )
            );

            return result;
          }

          function highlightSelectedMatch() {
            clearHighlights();
            clearSelectedResult();

            const selectedElement =
              matchedElements[selectedIndex];

            if (!selectedElement) {
              updateIndexControls();
              return;
            }

            const previewDocument =
              getPreviewDocument();

            if (!previewDocument) {
              return;
            }

            ensureHighlightStyle(previewDocument);

            selectedElement.classList.add(
              highlightClass
            );

            const selectedResult =
              selectorResults.children[selectedIndex];

            selectedResult?.classList.add(
              "selector-result-selected"
            );

            updateIndexControls();

          }

          function selectMatch(index) {
            if (
              !Number.isInteger(index) ||
              index < 0 ||
              index >= matchedElements.length
            ) {
              return;
            }

            selectedIndex = index;

            highlightSelectedMatch();
          }

          function runSelector() {
            clearResults();

            const selector =
              selectorInput.value.trim();

            if (!selector) {
              selectorStatus.textContent =
                "Please enter a CSS selector.";

              selectorStatus.className =
                "selector-status empty";

              return;
            }

            const previewDocument =
              getPreviewDocument();

            if (!previewDocument) {
              selectorStatus.textContent =
                "The rendered page is not available yet.";

              selectorStatus.className =
                "selector-status error";

              return;
            }

            try {
              matchedElements = Array.from(
                previewDocument.querySelectorAll(selector)
              );
            } catch (error) {
              selectorStatus.textContent =
                `Invalid CSS selector: ${error.message}`;

              selectorStatus.className =
                "selector-status error";

              return;
            }

            selectorMatchCount.textContent =
              String(matchedElements.length);

            if (matchedElements.length === 0) {
              selectorStatus.textContent =
                "No matching elements found.";

              selectorStatus.className =
                "selector-status empty";

              updateIndexControls();

              return;
            }

            selectedIndex = 0;

            selectorStatus.textContent =
              `${matchedElements.length} matching element(s) found.`;

            selectorStatus.className =
              "selector-status success";

            const resultFragment =
              document.createDocumentFragment();

            matchedElements.forEach(
              (element, index) => {
                resultFragment.appendChild(
                  createResult(element, index)
                );
              }
            );

            selectorResults.appendChild(
              resultFragment
            );

            highlightSelectedMatch();
          }

          runSelectorButton.addEventListener(
            "click",
            runSelector
          );

          clearSelectorButton.addEventListener(
            "click",
            () => {
              selectorInput.value = "";
              clearResults();
              selectorInput.focus();
            }
          );

          selectorIndexDown.addEventListener(
            "click",
            () => {
              selectMatch(selectedIndex - 1);
            }
          );

          selectorIndexUp.addEventListener(
            "click",
            () => {
              selectMatch(selectedIndex + 1);
            }
          );

          selectorIndexInput.addEventListener(
            "change",
            () => {
              const requestedIndex =
                Number(selectorIndexInput.value);

              if (
                !Number.isInteger(requestedIndex) ||
                requestedIndex < 0 ||
                requestedIndex >= matchedElements.length
              ) {
                selectorIndexInput.value =
                  String(selectedIndex);

                return;
              }

              selectMatch(requestedIndex);
            }
          );

          selectorIndexInput.addEventListener(
            "keydown",
            (event) => {
              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();

              const requestedIndex =
                Number(selectorIndexInput.value);

              if (
                Number.isInteger(requestedIndex) &&
                requestedIndex >= 0 &&
                requestedIndex < matchedElements.length
              ) {
                selectMatch(requestedIndex);
              } else {
                selectorIndexInput.value =
                  String(selectedIndex);
              }
            }
          );

          selectorInput.addEventListener(
            "keydown",
            (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runSelector();
              }

              if (event.key === "Escape") {
                selectorInput.value = "";
                clearResults();
              }
            }
          );

          htmlPreview.addEventListener(
            "load",
            () => {
              clearResults();
            }
          );

          updateIndexControls();
        </script>
      </body>
    </html>
  HTML
end
