
from threading import Lock

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.qse_api import get_all_stocks
from simulation.simulation import (
    create_portfolio,
    buy_stock,
    sell_stock,
    get_portfolio_value,
    get_transaction_history,
)


router = APIRouter(prefix="/api")

# One shared demonstration portfolio.
# Replace with per-user database storage later.
portfolio = create_portfolio()
portfolio_lock = Lock()


class TradeRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)
    quantity: int = Field(gt=0)


def portfolio_response():
    return {
        **get_portfolio_value(portfolio),
        "holdings": portfolio["holdings"],
        "transactions": get_transaction_history(portfolio),
        "data_mode": "manual_snapshot",
    }


@router.get("/stocks")
def list_stocks():
    return {
        "stocks": get_all_stocks(),
        "data_mode": "manual_snapshot",
    }


@router.get("/portfolio")
def get_portfolio():
    with portfolio_lock:
        return portfolio_response()


@router.post("/portfolio/buy")
def buy(request: TradeRequest):
    with portfolio_lock:
        try:
            transaction = buy_stock(
                portfolio,
                request.symbol,
                request.quantity
            )
            return {
                "transaction": transaction,
                "portfolio": portfolio_response()
            }
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc)
            )


@router.post("/portfolio/sell")
def sell(request: TradeRequest):
    with portfolio_lock:
        try:
            transaction = sell_stock(
                portfolio,
                request.symbol,
                request.quantity
            )
            return {
                "transaction": transaction,
                "portfolio": portfolio_response()
            }
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc)
            )
