
import { esc } from "./views.js";

export function renderHomeMarket(
  stocks = [],
  loading = false,
  error = ""
) {
  const featured = stocks.slice(0, 4);

  return `
    <section class="panel">
      <div class="page-head">
        <div>
          <h2>Qatar Stock Market</h2>
          <p class="lede">
            Stock prices from our saved QSE data snapshot.
          </p>
        </div>

        <span class="tag">Historical snapshot</span>
      </div>

      ${
        loading
          ? `<p>Loading market data...</p>`
          : error
            ? `<p>${esc(error)}</p>`
            : featured.length === 0
              ? `<p>No market data available.</p>`
              : `
                <div class="stock-list">
                  ${featured.map(stock => `
                    <div class="stock-row">
                      <div class="stock-main">
                        <span class="ticker-mark">
                          ${esc(stock.symbol)}
                        </span>

                        <span class="stock-name">
                          <strong>${esc(stock.company)}</strong>
                          <small>${esc(stock.symbol)}</small>
                        </span>
                      </div>

                      <strong>
                        QAR ${Number(stock.price).toFixed(3)}
                      </strong>
                    </div>
                  `).join("")}
                </div>
              `
      }

      <div style="margin-top:20px">
        <button
          class="btn btn-ghost"
          data-action="goto"
          data-id="markets"
        >
          Explore all companies
        </button>
      </div>

      <p class="fine">
        Prices are from a manually saved dataset.
        Not live quotes or investment advice.
      </p>
    </section>
  `;
}
