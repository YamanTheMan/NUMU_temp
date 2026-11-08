
import { esc } from "./views.js";
import { renderCompanyLogo } from "./company-logos.js";

// Matches the visual language of the original NUMU Markets page.
const sectors = [
  { id: "banks", label: "Banks", color: "#ff681b" },
  { id: "industrials", label: "Industrials", color: "#870d31" },
  { id: "consumer", label: "Consumer", color: "#e3a000" },
  { id: "realestate", label: "Real estate", color: "#31816e" },
  { id: "telecoms", label: "Telecoms", color: "#4163e9" },
  { id: "transport", label: "Transport", color: "#6741a2" },
  { id: "insurance", label: "Insurance", color: "#bb4160" },
  { id: "other", label: "Other", color: "#789086" }
];

const getSector = id =>
  sectors.find(s => s.id === id) || sectors.at(-1);

function decorateStocks(qseStocks, knownStocks) {
  const known = new Map(
    knownStocks.map(s => [s.ticker, s])
  );

  return qseStocks.map(stock => {
    const old = known.get(stock.symbol);

    return {
      ...stock,
      sector: old?.sector || "other"
    };
  });
}

export function filterQseStocks(qseStocks, ui, knownStocks) {
  let result = decorateStocks(qseStocks, knownStocks);

  if (ui.sector !== "all") {
    result = result.filter(s => s.sector === ui.sector);
  }

  const query = String(ui.query || "").trim().toLowerCase();

  if (query) {
    result = result.filter(s =>
      s.company.toLowerCase().includes(query) ||
      s.symbol.toLowerCase().includes(query)
    );
  }

  if (ui.sort === "gainers") {
    result.sort((a, b) =>
      (b.change_percent ?? -Infinity) -
      (a.change_percent ?? -Infinity)
    );
  } else if (ui.sort === "losers") {
    result.sort((a, b) =>
      (a.change_percent ?? Infinity) -
      (b.change_percent ?? Infinity)
    );
  } else if (ui.sort === "price") {
    result.sort((a, b) => b.price - a.price);
  } else {
    result.sort((a, b) =>
      a.company.localeCompare(b.company)
    );
  }

  return result;
}

function formatPrice(price) {
  return Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

function renderChange(value) {
  if (value === null || value === undefined) {
    return `<span class="change flat">N/A</span>`;
  }

  const number = Number(value);
  const formatted =
    `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;

  return `
    <span class="change ${
      number > 0 ? "up" : number < 0 ? "down" : "flat"
    }">
      ${formatted}
    </span>
  `;
}

export function renderQseRows(qseStocks, ui, knownStocks) {
  const filtered = filterQseStocks(
    qseStocks, ui, knownStocks
  );

  if (!filtered.length) {
    return `
      <div class="empty">
        <p>No companies match your search or filter.</p>
      </div>
    `;
  }

  return `
    <ul class="stock-list">
      ${filtered.map(stock => {
        const sector = getSector(stock.sector);

        return `
          <li class="stock-row">

            <button
              type="button"
              class="stock-main"
              data-action="qse-stock"
              data-id="${esc(stock.symbol)}"
            >
              ${renderCompanyLogo(stock.symbol)}

              <span class="stock-name">
                <strong>${esc(stock.company)}</strong>
                <small>
                  ${esc(stock.symbol)},
                  ${esc(sector.label)}
                </small>
              </span>
            </button>

            <span class="stock-price">
              QAR ${formatPrice(stock.price)}
            </span>

            ${renderChange(stock.change_percent)}

            <button
              type="button"
              class="pick-btn"
              data-action="qse-stock"
              data-id="${esc(stock.symbol)}"
              aria-label="Trade ${esc(stock.company)}"
            >
              <span aria-hidden="true">+</span>
              <span>Trade</span>
            </button>

          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function renderSectorChips(ui, availableStocks) {
  const available = new Set(
    availableStocks.map(s => s.sector)
  );

  const choices = sectors.filter(
    s => available.has(s.id)
  );

  return `
    <div class="chips"
         role="group"
         aria-label="Filter by sector">

      <button
        class="chip ${ui.sector === "all" ? "is-on" : ""}"
        data-action="market-sector"
        data-id="all"
        aria-pressed="${ui.sector === "all"}"
      >
        All
      </button>

      ${choices.map(sector => `
        <button
          class="chip ${
            ui.sector === sector.id ? "is-on" : ""
          }"
          data-action="market-sector"
          data-id="${sector.id}"
          aria-pressed="${ui.sector === sector.id}"
        >
          <i style="background:${sector.color}"></i>
          ${sector.label}
        </button>
      `).join("")}

    </div>
  `;
}

export function renderQseMarket(
  qseStocks,
  ui,
  loading,
  error,
  knownStocks = []
) {
  const decorated = decorateStocks(qseStocks, knownStocks);

  return `
    <header class="page-head">
      <div>
        <h1>Markets</h1>
        <p class="lede">
          Get to know the companies listed on
          the Qatar Stock Exchange.
        </p>
      </div>

      <div class="page-actions">
        <span class="tag">
          Snapshot prices, not live
        </span>
      </div>
    </header>

    ${renderSectorChips(ui, decorated)}

    <div class="toolbar">
      <div class="tool-right">

        <label class="search">
          <span aria-hidden="true">⌕</span>
          <input
            id="market-search"
            type="search"
            placeholder="Search name or ticker"
            value="${esc(ui.query || "")}"
            aria-label="Search companies"
          >
        </label>

        <select id="market-sort" aria-label="Sort stocks">
          <option value="name"
            ${ui.sort === "name" ? "selected" : ""}>
            A to Z
          </option>
          <option value="gainers"
            ${ui.sort === "gainers" ? "selected" : ""}>
            Biggest gainers
          </option>
          <option value="losers"
            ${ui.sort === "losers" ? "selected" : ""}>
            Biggest losers
          </option>
          <option value="price"
            ${ui.sort === "price" ? "selected" : ""}>
            Highest price
          </option>
        </select>

      </div>
    </div>

    <p class="fine">
      ${qseStocks.length} QSE stocks loaded from
      a manually saved market snapshot.
      Sector labels are shown where available;
      unclassified companies appear under Other.
    </p>

    <div id="market-list">
      ${loading
        ? `<div class="empty">Loading QSE stocks...</div>`
        : error
          ? `<div class="empty">${esc(error)}</div>`
          : renderQseRows(qseStocks, ui, knownStocks)
      }
    </div>
  `;
}
