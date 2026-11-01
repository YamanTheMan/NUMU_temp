# Namaa: QSE data integration plan

Research date: **2026-09-26**. This is a development plan, not a provider selection or a commercial commitment.

## Recommended route

- Request a licensed **real-time Level I** feed from a QSE-authorised vendor, including permission to display and redistribute the data through Namaa.
- Shortlist SIX and LSEG/Refinitiv for written quotes. QSE lists SIX and Refinitiv among its authorised data vendors; this alone does not confirm a particular API package, price or entitlement.
- Compare QSE's official **per-security XML snapshot service** as a potentially simpler option. Confirm its update interval, permitted use, instrument coverage and capacity directly with QSE.
- Direct QSE MITCH delivery provides trades and order-book data through a leased line or VPN. It is an alternative if the product later needs that depth and operational setup.
- QSE's daily trading API is an end-of-day product; it does not meet a real-time quote requirement.
- Current prices, service frequency, measured latency, contractual availability and final fees have **not** been verified with a provider.

## Rights and source limits

- QSE's data policy requires a Market Data Agreement for real-time recipients and addresses redistribution and public display. Confirm how the selected vendor administers exchange permissions and reporting.
- Ask whether Namaa's charts, retained history, caching and automated portfolio analysis require additional rights, including non-display usage.
- The public website's terms limit permitted use to personal, research and educational purposes rather than commercial gain, and restrict reuse/distribution. Do not treat website scraping as a production redistribution licence.
- QSE describes real-time prices on its public website. Do not assume that every public quote is delayed, or that public viewing grants reuse rights. Actual Market Watch latency was not measured.
- QSE's agreement distinguishes real time without intentional delay from delayed information of at least 15 minutes. Keep delay metadata explicit and confirm the applicable contract.

## Provider adapter

Normalize incoming quotes into one provider-independent record:

```js
{ symbol, last, bid, ask, volume, exchangeTimestamp, receivedAt, marketStatus, delaySeconds }
```

- Map provider symbols to stable internal instrument IDs and preserve QAR currency and units in instrument reference data.
- Use nullable fields for unavailable bid, ask, volume, status or timestamps. Do not invent missing values or interpret an unknown delay as zero.
- Define `volume` as cumulative session volume after provider-specific normalization; record exchange timestamps and receive times in UTC.
- Keep provider keys, credentials and exchange connections on the server. Never include secrets in browser code, repository commits or public responses.
- Let the backend validate, normalize and fan out quotes through WebSocket or server-sent events (SSE), within the purchased redistribution rights.
- Handle reconnects, rate limits, duplicate/out-of-order messages and resubscription; retain exchange timestamps and avoid replacing a newer quote with an older one.

## Honest quote states

- Display last-trade time separately from connection freshness: an illiquid security can have no new trades while its feed remains healthy.
- Use provider market status and the exchange calendar to distinguish open, auction, closed and suspended states. Show unknown when status cannot be established.
- At market close, retain the last actual quote and label the closed session; an unchanged value is not evidence of feed failure.
- Mark a connection stale when its expected heartbeat or update stream fails, using thresholds agreed for that service. Show the last available timestamp and a reconnecting or unavailable state.
- Show delayed data and its delay clearly. Never label delayed or unverified data as live, synthesize price ticks, or animate fictional changes as market activity.
- Keep fictional prototype assets separate from production instruments and label any illustrative charts.

## Public product requirements

- A public multiuser product needs a backend, accounts/authentication and persistent per-user portfolios/watchlists, with access controls and any required data entitlements.
- Add storage retention, monitoring and audit behaviour that matches provider terms. Browser local storage remains suitable only for the current local demo state.
- A private GitHub repository is recommended for version control and collaboration. A GitHub connector is optional development tooling, not a runtime market-data requirement.
- No deployment, paid data service, vendor subscription or exchange connection has been selected or created under this plan.

## Primary sources

- [QSE real-time feed](https://www.qe.com.qa/real-time-data) · [QSE XML snapshot and other products](https://www.qe.com.qa/en/other-data-products)
- [QSE data policy](https://www.qe.com.qa/data-policy) · [QSE website terms](https://www.qe.com.qa/disclaimer)
- [QSE authorised vendors](https://qe.com.qa/web/guest/authorised-vendors-hide) · [QSE investor guide](https://qe.com.qa/become-an-investor)
- [QSE Market Data Agreement](https://qe.com.qa/documents/20181/428452/QSE%2BMarket%2BData%2BAgreement.pdf/1ae45a25-1839-4911-aacc-e8a703f3fcc7)
- [SIX API documentation](https://web.apiportal.six-group.com/portal/bfi/home) · [LSEG redistribution](https://www.lseg.com/en/data-analytics/market-data/data-redistribution)
