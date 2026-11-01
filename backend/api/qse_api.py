
from pathlib import Path
from datetime import datetime, timezone
from bs4 import BeautifulSoup
import json


DATA_FILE = Path(__file__).resolve().parent.parent / "qse_stocks.html"


def get_all_stocks():
    """
    Extract QSE stocks from a manually saved
    StockAnalysis HTML page.
    """

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Save the webpage HTML to {DATA_FILE}"
        )

    html = DATA_FILE.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    stocks = []

    for table in soup.find_all("table"):
        headers = [
            th.get_text(" ", strip=True).lower()
            for th in table.find_all("th")
        ]

        if not (
            any("symbol" in h for h in headers)
            and any("stock price" in h for h in headers)
        ):
            continue

        for row in table.find_all("tr"):
            cells = row.find_all("td")

            if len(cells) < 7:
                continue

            values = [
                cell.get_text(" ", strip=True)
                for cell in cells
            ]

            try:
                symbol = values[1]
                price = float(
                    values[4].replace(",", "")
                )
            except (ValueError, IndexError):
                continue

            change_text = values[5].replace("%", "")

            try:
                change = float(change_text)
            except ValueError:
                change = None

            stocks.append({
                "symbol": symbol,
                "company": values[2],
                "price": price,
                "currency": "QAR",
                "change_percent": change,
                "market_cap": values[3],
                "revenue": values[6],
                "source": "StockAnalysis",
                "price_as_of": None,
                "data_mode": "manual_snapshot"
            })

    if not stocks:
        raise ValueError(
            "No stock rows found. Check saved HTML."
        )

    return stocks


def get_stock_price(symbol):
    """
    Look up a particular stock by symbol.
    """

    symbol = symbol.strip().upper()

    for stock in get_all_stocks():
        if stock["symbol"] == symbol:
            return stock

    return None


if __name__ == "__main__":
    stocks = get_all_stocks()

    print(f"Found {len(stocks)} stocks")

    print(json.dumps(
        stocks,
        indent=2,
        ensure_ascii=False
    ))

    print("\nNakilat:")
    print(get_stock_price("QGTS"))

def save_stocks_to_json():
    stocks = get_all_stocks()

    output_path = (
        Path(__file__).resolve().parent.parent
        / "qse_stocks.json"
    )

    output = {
        "source": "StockAnalysis",
        "data_mode": "manual_snapshot",
        "price_as_of": None,
        "stocks": stocks
    }

    output_path.write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print(f"Saved {len(stocks)} stocks to {output_path}")

    return output