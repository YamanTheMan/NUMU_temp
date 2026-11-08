
const API_URL =
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000/api"
    : "/api";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Request failed"
    );
  }

  return data;
}

export function getPortfolio() {
  return apiRequest("/portfolio");
}

export function getStocks() {
  return apiRequest("/stocks");
}

export function buyStock(symbol, quantity) {
  return apiRequest("/portfolio/buy", {
    method: "POST",
    body: JSON.stringify({ symbol, quantity })
  });
}

export function sellStock(symbol, quantity) {
  return apiRequest("/portfolio/sell", {
    method: "POST",
    body: JSON.stringify({ symbol, quantity })
  });
}

export function askMusaid(
  question,
  language = "en",
  history = []
) {
  return apiRequest("/tutor/ask", {
    method: "POST",
    body: JSON.stringify({
      question,
      language,
      history
    })
  });
}


export function getPinnedAgents() {
  return apiRequest("/agents/pinned");
}

export function pinStock(symbol) {
  return apiRequest("/agents/pin", {
    method: "POST",
    body: JSON.stringify({ symbol })
  });
}

export function unpinStock(symbol) {
  return apiRequest(
    `/agents/pin/${encodeURIComponent(symbol)}`,
    { method: "DELETE" }
  );
}

export function chatWithStockAgent(
  symbol,
  question,
  language = "en",
  history = []
) {
  return apiRequest("/agents/chat", {
    method: "POST",
    body: JSON.stringify({
      symbol,
      question,
      language,
      history
    })
  });
}


export function researchStock(symbol) {
  return apiRequest("/research/company", {
    method: "POST",
    body: JSON.stringify({ symbol })
  });
}

// Live avatar tutor (LiveAvatar). The server holds the API key.
export function getAvatarStatus() {
  return apiRequest("/avatar/status");
}

export function startLiveLesson(language = "en") {
  return apiRequest("/avatar/token", {
    method: "POST",
    body: JSON.stringify({ language })
  });
}

// What Claire says, step by step, with the chart moves for each step.
export function askChartTutor(payload) {
  return apiRequest("/avatar/ask", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
