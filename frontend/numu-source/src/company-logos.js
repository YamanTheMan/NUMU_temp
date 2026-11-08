
export function companyLogo(symbol) {
  const ticker = String(symbol || "")
    .trim()
    .toUpperCase();

  return /^[A-Z0-9]+$/.test(ticker)
    ? `/src/logos/${ticker}.svg`
    : null;
}

export function renderCompanyLogo(symbol) {
  const ticker = String(symbol || "")
    .trim()
    .toUpperCase();

  const url = companyLogo(ticker);

  if (!url) return "";

  return `
    <span class="company-logo-box">
      <img
        src="${url}"
        alt=""
        loading="lazy"
        onerror="this.hidden = true; this.nextElementSibling.hidden = false;"
      />
      <span class="company-logo-fallback" hidden>
        ${ticker}
      </span>
    </span>
  `;
}
