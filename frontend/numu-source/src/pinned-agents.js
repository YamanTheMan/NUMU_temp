
import { esc } from "./views.js";

function reportSummary(agent) {
  const report = agent.latest_report;

  if (!report) {
    return "No research update yet. Daily monitoring is not active.";
  }

  // Support a plain-text summary or a structured report.
  const summary =
    typeof report === "string"
      ? report
      : report.summary ||
        report.report?.summary ||
        null;

  return typeof summary === "string" && summary.trim()
    ? summary
    : "A research report is available. Open the agent to review it.";
}

function reportDate(agent) {
  if (!agent.last_researched_at) {
    return "Awaiting first update";
  }

  const date = new Date(agent.last_researched_at);

  return Number.isNaN(date.getTime())
    ? "Research date unavailable"
    : `Updated ${date.toLocaleString()}`;
}


// ==================================================
// HOME: Summary cards for pinned agents
// ==================================================


export function renderHomeAgentSummary(
  pinnedAgents,
  loading = false,
  error = ""
) {
  return `
    <section class="home-agent-section">

      <div class="page-head">
        <div>
          <h2>Your AI stock updates</h2>
          <p class="lede">
            Daily insights from the companies you're following.
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
            ? `<p>${esc(error)}</p>`
            : pinnedAgents.length === 0
              ? `
                <div class="home-agent-empty">
                  <p>
                    You haven't pinned any stocks yet.
                    Pin a stock from your Portfolio
                    to start monitoring it.
                  </p>
                  <a class="btn btn-primary" href="#portfolio">
                    Open Portfolio
                  </a>
                </div>
              `
              : `
                <div class="home-agent-grid">

                  ${pinnedAgents.map(agent => `
                    <article class="home-agent-card">

                      <div class="home-agent-card-header">

                        <span class="home-agent-ticker">
                          ${esc(agent.symbol)}
                        </span>

                        <div class="home-agent-company">
                          <h3>${esc(agent.company)}</h3>
                          <p>${esc(reportDate(agent))}</p>
                        </div>

                      </div>

                      <div class="home-agent-card-body">
                        <span class="home-agent-label">
                          Latest research
                        </span>

                        <p>
                          ${esc(reportSummary(agent))}
                        </p>
                      </div>

                      <div class="home-agent-card-footer">
                        <button
                          class="btn btn-ghost"
                          data-action="open-pinned-agent"
                          data-id="${esc(agent.symbol)}"
                        >
                          Open agent
                        </button>
                      </div>

                    </article>
                  `).join("")}

                </div>
              `
      }

    </section>
  `;
}



// ==================================================
// AGENTS TAB: Pinned companies + personal chatbot
// ==================================================

export function renderPinnedAgents(
  pinnedAgents,
  selectedSymbol,
  chats,
  loading = false,
  error = ""
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
        <p>${esc(error)}</p>
      </section>
    `;
  }

  const selected =
    pinnedAgents.find(a => a.symbol === selectedSymbol) ||
    pinnedAgents[0];

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

      <div class="chips" role="group"
           aria-label="Choose a pinned company">

        ${pinnedAgents.map(agent => `
          <button
            class="chip ${
              agent.symbol === selected.symbol ? "is-on" : ""
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

      <div class="stock-detail-top"
           style="margin-top:20px">
        <span class="ticker-mark"
              style="--sector:#25836a">
          ${esc(selected.symbol)}
        </span>

        <div>
          <h2>${esc(selected.company)}</h2>
          <p class="muted">
            ${esc(reportDate(selected))}
          </p>
        </div>
      </div>

      <div class="explainer" style="margin-top:20px">
        <div>
          <strong>Latest research summary</strong>

          <p>${esc(reportSummary(selected))}</p>

          <p class="fine">
            This section will display verified news,
            possible impacts and uncertainty once
            daily research is connected.
          </p>
        </div>
      </div>

      <div class="chat" style="margin-top:24px">

        <header class="chat-head">
          <div>
            <h2>Chat with ${esc(selected.symbol)} Agent</h2>
            <p>
              Ask about the company and its research.
            </p>
          </div>
        </header>

        <div class="chat-log"
             id="pinned-chat-log"
             aria-live="polite">

          ${
            messages.length
              ? messages.map(message => {
                  if (message.typing) {
                    return `
                      <div class="msg agent typing">
                        <span></span><span></span><span></span>
                      </div>
                    `;
                  }

                  return `
                    <div class="msg ${
                      message.from === "you" ? "you" : "agent"
                    }">
                      ${esc(message.text)}
                    </div>
                  `;
                }).join("")
              : `
                <div class="chat-empty">
                  <p>
                    Ask your ${esc(selected.symbol)} agent
                    a question to get started.
                  </p>
                </div>
              `
          }

        </div>

        <form id="pinned-chat-form" class="chat-input">
          <input type="hidden"
                 name="symbol"
                 value="${esc(selected.symbol)}">

          <label class="sr-only" for="pinned-chat-text">
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

          <button class="btn btn-primary"
                  type="submit">
            Send
          </button>
        </form>

      </div>

      <p class="fine" style="margin-top:12px">
        AI explanations are educational,
        not investment advice.
        No live news or price forecasts are available yet.
      </p>

    </section>
  `;
}
