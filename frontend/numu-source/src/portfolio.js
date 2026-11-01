
import { esc } from "./views.js";

function money(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });
}

export function renderPortfolio(
  portfolio,
  error = "",
  pinnedAgents = []
) {
  if (error) {
    return `
      <section class="panel">
        <h1>My Portfolio</h1>
        <p class="muted">${esc(error)}</p>
      </section>
    `;
  }

  if (!portfolio) {
    return `<section class="panel">Loading wallet...</section>`;
  }

  const holdings = Object.entries(portfolio.holdings);
  const pinnedSymbols = new Set(
    pinnedAgents.map(agent => agent.symbol)
  );
  const transactions = [...portfolio.transactions].reverse();

  return `
    <header class="page-head">
      <div>
        <h1>My Portfolio</h1>
        <p class="lede">
          Practice investing with virtual Qatari riyals.
        </p>
      </div>
      <span class="tag">Simulation · Snapshot prices</span>
    </header>

    <section class="panel">
      <h2>Total portfolio value</h2>
      <h1>QAR ${money(portfolio.total_value)}</h1>

      <div class="metrics">
        <div>
          <span>Available cash</span>
          <strong>${money(portfolio.cash)}</strong>
        </div>
        <div>
          <span>Stock holdings</span>
          <strong>${money(portfolio.invested_value)}</strong>
        </div>
        <div>
          <span>Profit / Loss</span>
          <strong>${money(portfolio.profit_loss)}</strong>
        </div>
      </div>
    </section>

    <section class="panel" style="margin-top:18px">
      <h2>Simulated trading</h2>
      <p class="lede">
        Prices come from a manually saved QSE snapshot.
        No real money or trades are involved.
      </p>

      <form id="portfolio-trade-form"
            style="display:grid;gap:12px;margin-top:20px">

        <label>
          Stock symbol
          <input type="text"
                 name="symbol"
                 placeholder="e.g. QNBK"
                 maxlength="12"
                 required>
        </label>

        <label>
          Number of shares
          <input type="number"
                 name="quantity"
                 min="1"
                 step="1"
                 required>
        </label>

        <div class="page-actions">
          <button class="btn btn-primary"
                  type="submit"
                  name="side"
                  value="buy">
            Buy shares
          </button>

          <button class="btn btn-ghost"
                  type="submit"
                  name="side"
                  value="sell">
            Sell shares
          </button>
        </div>
      </form>
    </section>

    <section class="panel" style="margin-top:18px">
      <h2>My holdings</h2>

      ${holdings.length ? `
        <table class="table">
          <thead>
            <tr>
              <th>Stock</th>
              <th>Shares</th>
              <th>AI Agent</th>
            </tr>
          </thead>
          <tbody>
            
            ${holdings.map(([symbol, quantity]) => {
              const isPinned = pinnedSymbols.has(symbol);

              return `
                <tr>
                  <td>
                    <strong>${esc(symbol)}</strong>
                  </td>

                  <td>${quantity}</td>

                  <td>
                    <button
                      type="button"
                      class="btn ${isPinned ? 'btn-ghost' : 'btn-primary'}"
                      data-action="pin-agent"
                      data-id="${esc(symbol)}"
                      aria-pressed="${isPinned}"
                    >
                      ${isPinned ? 'Unpin Agent' : 'Pin AI Agent'}
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}

          </tbody>
        </table>
      ` : `<p class="lede">You don't own any shares yet.</p>`}
    </section>

    <section class="panel" style="margin-top:18px">
      <h2>Transaction history</h2>

      ${transactions.length ? `
        <table class="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Stock</th>
              <th>Shares</th>
              <th>Total (QAR)</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>${esc(t.type)}</td>
                <td>${esc(t.symbol)}</td>
                <td>${t.quantity}</td>
                <td>${money(t.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="lede">No transactions yet.</p>`}
    </section>
  `;
}
