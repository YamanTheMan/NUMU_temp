
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.qse_api import get_stock_price
from agents.research_agent import research_company

router = APIRouter(
    prefix="/api/research",
    tags=["Company Research"]
)


class ResearchRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)


@router.post("/company")
def research_stock(request: ResearchRequest):
    symbol = request.symbol.strip().upper()

    stock = get_stock_price(symbol)

    if stock is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found on the QSE."
        )

    try:
        # Use the registered company name, not arbitrary
        # user-supplied text.
        report = research_company(stock["company"])

        return {
            "symbol": symbol,
            "company": stock["company"],
            "report": report
        }

    except Exception as e:
        import traceback

        print("\n===== RESEARCH ERROR =====")
        traceback.print_exc()
        print("==========================\n")

        raise HTTPException(
            status_code=502,
            detail="Company research is temporarily unavailable."
        ) from e
