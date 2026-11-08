
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from api.wallet_routes import router as wallet_router
from api.tutor_routes import router as tutor_router
from api.research_routes import router as research_router
from api.agent_routes import router as agent_router
from api.qse_api import get_all_stocks

app = FastAPI(title="NUMU API", version="0.1.0")

@app.get("/api/stocks")
def get_qse_stocks():
    return get_all_stocks()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:4173",
                   "http://localhost:4173"],
    allow_methods=["GET", "POST",  "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(wallet_router)
app.include_router(tutor_router)
app.include_router(research_router)
app.include_router(agent_router)

# Temporary sample data (not live market prices)
stocks = {
    "QNBK": {"name": "Qatar National Bank", "price": 18.50},
    "QGTS": {"name": "Qatar Gas Transport", "price": 4.20},
    "ORDS": {"name": "Ooredoo", "price": 12.30},
}


class BuyRequest(BaseModel):
    symbol: str
    quantity: int


@app.get("/")
def home():
    return {"message": "Welcome to NUMU!"}


@app.get("/stocks")
def get_stocks():
    return stocks


@app.get("/stocks/{symbol}")
def get_stock(symbol: str):
    symbol = symbol.upper()

    if symbol not in stocks:
        raise HTTPException(
            status_code=404,
            detail="Stock not found"
        )

    return stocks[symbol]


@app.post("/portfolio/quote")
def quote_purchase(order: BuyRequest):
    symbol = order.symbol.upper()

    if symbol not in stocks:
        raise HTTPException(
            status_code=404,
            detail="Stock not found"
        )

    if order.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be positive"
        )

    price = stocks[symbol]["price"]

    return {
        "symbol": symbol,
        "quantity": order.quantity,
        "unit_price": price,
        "estimated_total": round(
            price * order.quantity, 2
        ),
        "currency": "QAR",
        "executed": False
    }
