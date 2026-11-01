
import json
from openai import OpenAI

from config import OPENAI_API_KEY, OPENAI_MODEL


instructions = """
You are NUMU's financial research search planner.

Your task is to generate Google News search queries
for a company listed on the Qatar Stock Exchange.

Identify events that could directly or indirectly
influence the company's business and share price.

Consider:
- Company announcements and financial performance
- Industry and competitor developments
- Commodity prices and global demand
- Geopolitical conflicts and trade disruptions
- Interest rates and macroeconomic conditions
- Supply chains and government regulations

Rules:
1. Generate exactly 5 distinct search queries.
2. Include company-specific and indirect factors.
3. Make searches relevant to the company's business.
4. Do not assume any event has actually occurred.
5. Do not invent news or make price predictions.
6. Return queries suitable for Google News.
"""


def generate_search_queries(company, sector, description):
    if not OPENAI_API_KEY or not OPENAI_MODEL:
        raise RuntimeError("OpenAI is not configured")

    client = OpenAI(api_key=OPENAI_API_KEY)

    response = client.responses.create(
        model=OPENAI_MODEL,
        instructions=instructions,
        input=f"""
        Company: {company}
        Sector: {sector}
        Business description: {description}

        Generate research search queries.
        """,
        text={
            "format": {
                "type": "json_schema",
                "name": "search_queries",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "queries": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["queries"],
                    "additionalProperties": False
                }
            }
        }
    )

    data = json.loads(response.output_text)

    queries = [
        query.strip()
        for query in data["queries"]
        if query.strip()
    ]

    if len(queries) != 5 or len(set(queries)) != 5:
        raise ValueError(
            "Expected 5 distinct search queries"
        )

    return queries
