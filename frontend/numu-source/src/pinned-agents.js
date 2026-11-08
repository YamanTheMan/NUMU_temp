
import { esc } from "./views.js";

// ==================================================
// RESEARCH HELPERS
// ==================================================

function getResearch(agent, stockResearch = {}) {
  const generated = stockResearch[agent.symbol];

  if (generated?.report != null) {
    return generated.report;
  }

  return agent.latest_report || null;
}

function reportSummary(agent, stockResearch = {}) {
  const report = getResearch(agent, stockResearch);

  if (!report) {
    return "No research update generated yet.";
  }

  if (typeof report === "string") {
    return report.trim() || "Research report is empty.";
  }

  const summary =
    report.summary ||
    report.report?.summary ||
    report.analysis?.summary ||
    report.executive_summary ||
    report.explanation ||
    report.answer;

  if (typeof summary === "string" && summary.trim()) {
    return summary;
  }

  // Handle reports containing structured data that
  // do not have a top-level summary field.
  return "Research generated successfully. See the report details below.";
}

function reportDate(agent, stockResearch = {}) {
  const generated = stockResearch[agent.symbol];

  const timestamp =
    generated?.updatedAt ||
    agent.last_researched_at;

  if (!timestamp) {
    return "Awaiting first update";
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? "Research date unavailable"
    : `Updated ${date.toLocaleString()}`;
}

function formatResearchDetails(agent, stockResearch = {}) {
  const report = getResearch(agent, stockResearch);

  if (!report || typeof report !== "object") {
    return "";
  }

  // Show structured research without assuming
  // that the backend uses a particular schema.
  const details = JSON.stringify(report, null, 2);

  return `
    <details style="margin-top:12px">
      <summary style="cursor:pointer;font-weight:600">
        View full research report
      </summary>

      <pre
        style="
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          font-family:inherit;
          font-size:0.9rem;
          line-height:1.6;
          margin-top:12px;
        "
      >${esc(details)}</pre>
    </details>
  `;
}

function researchButton(agent, stockResearch = {}, researchLoading = {}) {
  const symbol = agent.symbol;
  const hasReport = Boolean(getResearch(agent, stockResearch));
  const isLoading = Boolean(researchLoading[symbol]);

  return `
    <button
      class="btn btn-primary"
      type="button"
      data-action="generate-stock-research"
      data-id="${esc(symbol)}"
      ${isLoading ? "disabled" : ""}
      aria-busy="${isLoading}"
    >
      ${
        isLoading
          ? "Researching company..."
          : hasReport
            ? "Refresh research"
            : "Generate update"
      }
    </button>
  `;
}


// ==================================================
// HOME: Summary cards for pinned agents
// ==================================================

export function renderHomeAgentSummary(
  pinnedAgents,
  loading = false,
  error = "",
  stockResearch = {},
  researchLoading = {},
  researchErrors = {}
) {
  return `
    <section class="home-agent-section">

      <div class="page-head">
        <div>
          <h2>Your AI stock updates</h2>
          <p class="lede">
            Research insights for the companies you're following.
          </p>
        </div>

        <button
          class="btn btn-ghost"
          data-action="goto"
          data-id="agents"
        >
          View all agents
        </button>
      </div>

      ${
        loading
          ? `<p>Loading your stock agents...</p>`
          : error
            ? `<p role="alert">${esc(error)}</p>`
            : pinnedAgents.length === 0
              ? `
                <div class="home-agent-empty">
                  <p>
                    You haven't pinned any stocks yet.
                    Pin a stock from your Portfolio
                    to start monitoring it.
                  </p>

                  <a
                    class="btn btn-primary"
                    href="#portfolio"
                  >
                    Open Portfolio
                  </a>
                </div>
              `
              : `
                <div class="home-agent-grid">

                  ${pinnedAgents.map(agent => {
                    const symbol = agent.symbol;
                    const isLoading = Boolean(
                      researchLoading[symbol]
                    );

                    const researchError =
                      researchErrors[symbol] || "";

                    return `
                      <article class="home-agent-card">

                        <div class="home-agent-card-header">

                          <span class="home-agent-ticker">
                            ${esc(symbol)}
                          </span>

                          <div class="home-agent-company">
                            <h3>${esc(agent.company)}</h3>
                            <p>
                              ${esc(
                                reportDate(agent, stockResearch)
                              )}
                            </p>
                          </div>

                        </div>

                        <div class="home-agent-card-body">

                          <span class="home-agent-label">
                            Latest research
                          </span>

                          ${
                            isLoading
                              ? `
                                <p aria-live="polite">
                                  Researching recent news and
                                  possible company impacts...
                                </p>
                              `
                              : `
                                <p style="white-space:pre-wrap">
                                  ${esc(
                                    reportSummary(
                                      agent,
                                      stockResearch
                                    )
                                  )}
                                </p>

                              `
                          }

                          ${
                            researchError
                              ? `
                                <p
                                  role="alert"
                                  style="
                                    color:#b42318;
                                    margin-top:12px;
                                  "
                                >
                                  ${esc(researchError)}
                                </p>
                              `
                              : ""
                          }

                        </div>

                        <div
                          class="home-agent-card-footer"
                          style="
                            display:flex;
                            gap:10px;
                            flex-wrap:wrap;
                          "
                        >

                          ${researchButton(
                            agent,
                            stockResearch,
                            researchLoading
                          )}

                          <button
                            class="btn btn-ghost"
                            type="button"
                            data-action="open-pinned-agent"
                            data-id="${esc(symbol)}"
                          >
                            Open agent
                          </button>

                        </div>

                      </article>
                    `;
                  }).join("")}

                </div>
              `
      }

    </section>
  `;
}


// ==================================================
// AGENTS TAB: Pinned companies + personal chatbot
// ==================================================

function renderResearchResources(agent, stockResearch = {}) {
  const report = getResearch(agent, stockResearch);

  if (!report || typeof report !== "object") {
    return `
      <p class="muted">
        Generate a research update to see key terms and sources.
      </p>
    `;
  }

  const terms = Array.isArray(report.financial_terms)
    ? report.financial_terms
    : [];

  const sources = Array.isArray(report.sources)
    ? report.sources
    : [];

  const safeUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const termHTML = terms.length
    ? terms.map(item => {
        const term = typeof item === "string"
          ? item
          : item.term || item.name || "";

        const definition = typeof item === "object"
          ? item.definition || item.meaning || ""
          : "";

        const example = typeof item === "object"
          ? item.example || ""
          : "";

        const relevance = typeof item === "object"
          ? item.why_it_matters || item.relevance || ""
          : "";

        return `
          <div class="numu-term-card">
            <h4>${esc(term)}</h4>
            <p>${esc(definition)}</p>

            ${example ? `
              <p>
                <strong>Example:</strong>
                ${esc(example)}
              </p>
            ` : ""}

            ${relevance ? `
              <p class="muted">
                <strong>Why it matters:</strong>
                ${esc(relevance)}
              </p>
            ` : ""}
          </div>
        `;
      }).join("")
    : `<p class="muted">
        No key terms are available for this update.
      </p>`;

  const sourceHTML = sources
    .filter(source => safeUrl(source.url))
    .map(source => `
      <a
        class="numu-source-card"
        href="${esc(safeUrl(source.url))}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <strong>
          ${esc(source.title || "Read original article")}
        </strong>

        <span class="muted">
          ${esc(source.publisher || "News source")}
          ${source.published_at
            ? ` · ${esc(source.published_at.slice(0, 10))}`
            : ""}
        </span>

        <span class="numu-source-link">
          Read article ↗
        </span>
      </a>
    `).join("");

  return `
    <div class="numu-resources">

      <section>
        <h3>Key Terms Breakdown</h3>
        <p class="muted">
          Understand the important concepts mentioned
          in this research.
        </p>

        <div class="numu-term-grid">
          ${termHTML}
        </div>
      </section>

      <section>
        <h3>Resources & Sources</h3>
        <p class="muted">
          Explore the original articles used
          to prepare this research.
        </p>

        <div class="numu-source-list">
          ${sourceHTML || `
            <p class="muted">
              No source links are available.
            </p>
          `}
        </div>
      </section>

    </div>
  `;
}

export function renderPinnedAgents(
  pinnedAgents,
  selectedSymbol,
  chats,
  loading = false,
  error = "",
  stockResearch = {},
  researchLoading = {},
  researchErrors = {}
) {
  if (loading) {
    return `
      <section class="panel" style="margin-top:24px">
        <h2>My Stock Agents</h2>
        <p>Loading pinned companies...</p>
      </section>
    `;
  }

  if (error) {
    return `
      <section class="panel" style="margin-top:24px">
        <h2>My Stock Agents</h2>
        <p role="alert">${esc(error)}</p>
      </section>
    `;
  }

  const selected =
    pinnedAgents.find(
      a => a.symbol === selectedSymbol
    ) || pinnedAgents[0];

  if (!selected) {
    return `
      <section class="panel" style="margin-top:24px">

        <h2>My Stock Agents</h2>

        <p class="lede">
          Purchase shares and pin them in Portfolio
          to create your first stock agent.
        </p>

        <a class="btn btn-primary" href="#portfolio">
          Open Portfolio
        </a>

      </section>
    `;
  }

  const messages = chats[selected.symbol] || [];
  const isResearching = Boolean(
    researchLoading[selected.symbol]
  );
  const researchError =
    researchErrors[selected.symbol] || "";

  return `
    <section class="panel" style="margin-top:24px">

      <header class="page-head">
        <div>
          <h2>My Stock Agents</h2>

          <p class="lede">
            Follow your companies and chat with
            their dedicated AI agents.
          </p>
        </div>

        <span class="tag">
          ${pinnedAgents.length} pinned
        </span>
      </header>

      <div
        class="chips"
        role="group"
        aria-label="Choose a pinned company"
      >

        ${pinnedAgents.map(agent => `
          <button
            class="chip ${
              agent.symbol === selected.symbol
                ? "is-on"
                : ""
            }"
            data-action="select-pinned-agent"
            data-id="${esc(agent.symbol)}"
            aria-pressed="${
              agent.symbol === selected.symbol
            }"
          >
            ${esc(agent.symbol)}
          </button>
        `).join("")}

      </div>

      <div
        class="stock-detail-top"
        style="margin-top:20px"
      >

        <span
          class="ticker-mark"
          style="--sector:#25836a"
        >
          ${esc(selected.symbol)}
        </span>

        <div>
          <h2>${esc(selected.company)}</h2>

          <p class="muted">
            ${esc(reportDate(selected, stockResearch))}
          </p>
        </div>

      </div>

      <div class="explainer" style="margin-top:20px">
        <div>

          <strong>Latest research summary</strong>

          ${
            isResearching
              ? `
                <p aria-live="polite">
                  Researching company...
                </p>
              `
              : `
                <p style="white-space:pre-wrap">
                  ${esc(
                    reportSummary(
                      selected,
                      stockResearch
                    )
                  )}
                </p>

                ${renderResearchResources(
                  selected,
                  stockResearch
                )}
              `
          }

          ${
            researchError
              ? `
                <p
                  role="alert"
                  style="color:#b42318"
                >
                  ${esc(researchError)}
                </p>
              `
              : ""
          }

          <div style="margin-top:16px">
            ${researchButton(
              selected,
              stockResearch,
              researchLoading
            )}
          </div>

          <p class="fine" style="margin-top:12px">
            Research is generated on demand.
            Possible impacts are uncertain,
            not stock price predictions.
          </p>

        </div>
      </div>

      <div class="chat" style="margin-top:24px">

        <header class="chat-head">
          <div>
            <h2>
              Chat with ${esc(selected.symbol)} Agent
            </h2>

            <p>
              Ask about the company and its research.
            </p>
          </div>
        </header>

        <div
          class="chat-log"
          id="pinned-chat-log"
          aria-live="polite"
        >

          ${
            messages.length
              ? messages.map(message => {
                  if (message.typing) {
                    return `
                      <div class="msg agent typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    `;
                  }

                  return `
                    <div class="msg ${
                      message.from === "you"
                        ? "you"
                        : "agent"
                    }">
                      ${esc(message.text)}
                    </div>
                  `;
                }).join("")
              : `
                <div class="chat-empty">
                  <p>
                    Ask your ${esc(selected.symbol)}
                    agent a question to get started.
                  </p>
                </div>
              `
          }

        </div>

        <form
          id="pinned-chat-form"
          class="chat-input"
        >

          <input
            type="hidden"
            name="symbol"
            value="${esc(selected.symbol)}"
          >

          <label
            class="sr-only"
            for="pinned-chat-text"
          >
            Ask ${esc(selected.symbol)} agent
          </label>

          <input
            id="pinned-chat-text"
            name="text"
            autocomplete="off"
            maxlength="2000"
            placeholder="Ask about this company..."
            required
          >

          <button
            class="btn btn-primary"
            type="submit"
          >
            Send
          </button>

        </form>

      </div>

      <p class="fine" style="margin-top:12px">
        AI explanations are educational,
        not investment advice.
        No guaranteed stock forecasts are provided.
      </p>

    </section>
  `;
}
