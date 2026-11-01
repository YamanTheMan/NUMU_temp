
from datetime import datetime, timezone
from decimal import Decimal
from api.qse_api import get_stock_price


STARTING_BALANCE = Decimal("10000.00")


def create_portfolio():
    """
    Create a new portfolio with QAR 10,000
    in virtual money.
    """
    return {
        "cash": STARTING_BALANCE,
        "holdings": {},
        "transactions": []
    }


def buy_stock(portfolio, symbol, quantity):
    """
    Buy simulated shares using snapshot prices.
    """
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
        raise ValueError("Quantity must be a positive integer")

    stock = get_stock_price(symbol)

    if stock is None:
        raise ValueError("Stock not found")

    symbol = stock["symbol"]
    price = Decimal(str(stock["price"]))

    if price <= 0:
        raise ValueError("Invalid stock price")

    total_cost = price * quantity

    if portfolio["cash"] < total_cost:
        raise ValueError("Insufficient virtual funds")

    portfolio["cash"] -= total_cost

    portfolio["holdings"][symbol] = (
        portfolio["holdings"].get(symbol, 0)
        + quantity
    )

    transaction = {
        "type": "buy",
        "symbol": symbol,
        "quantity": quantity,
        "price": str(price),
        "total": str(total_cost),
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "data_mode": "manual_snapshot"
    }

    portfolio["transactions"].append(transaction)

    return transaction


def sell_stock(portfolio, symbol, quantity):
    """
    Sell simulated shares already owned.
    """
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
        raise ValueError("Quantity must be a positive integer")

    symbol = symbol.strip().upper()

    owned = portfolio["holdings"].get(symbol, 0)

    if quantity > owned:
        raise ValueError("Not enough shares to sell")

    stock = get_stock_price(symbol)

    if stock is None:
        raise ValueError("Stock not found")

    price = Decimal(str(stock["price"]))

    if price <= 0:
        raise ValueError("Invalid stock price")

    proceeds = price * quantity

    portfolio["cash"] += proceeds
    portfolio["holdings"][symbol] -= quantity

    if portfolio["holdings"][symbol] == 0:
        del portfolio["holdings"][symbol]

    transaction = {
        "type": "sell",
        "symbol": symbol,
        "quantity": quantity,
        "price": str(price),
        "total": str(proceeds),
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "data_mode": "manual_snapshot"
    }

    portfolio["transactions"].append(transaction)

    return transaction


def get_portfolio_value(portfolio):
    """
    Calculate the total virtual portfolio value.
    """
    invested_value = Decimal("0")

    for symbol, quantity in portfolio["holdings"].items():
        stock = get_stock_price(symbol)

        if stock is None:
            raise ValueError(
                f"No price available for {symbol}"
            )

        price = Decimal(str(stock["price"]))
        invested_value += price * quantity

    total_value = portfolio["cash"] + invested_value

    return {
        "cash": str(portfolio["cash"]),
        "invested_value": str(invested_value),
        "total_value": str(total_value),
        "profit_loss": str(
            total_value - STARTING_BALANCE
        )
    }


def get_transaction_history(portfolio):
    return portfolio["transactions"]
