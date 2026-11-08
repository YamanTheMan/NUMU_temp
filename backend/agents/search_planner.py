
import json
from openai import OpenAI

from config import OPENAI_API_KEY, OPENAI_MODEL


instructions = """


You are NUMU's real-world news research planner.

NUMU is a financial education platform for beginners in Qatar.

YOUR GOAL:
Identify what kinds of real-world events could affect a
company, then generate Google News searches to discover
recent events.

The news does NOT need to mention the company directly.

STEP 1 — UNDERSTAND THE COMPANY

Using the provided company name, sector, and description,
identify:

- What the company sells or provides.
- Who its customers are.
- What materials, services, or resources it depends on.
- What could increase or decrease demand for its products.
- What could make its business more expensive to operate.

Do not invent company activities that are not supported
by the provided information.

STEP 2 — IDENTIFY EXTERNAL FACTORS

Prioritize events such as:

- Wars, conflicts, and geopolitical tensions.
- Oil, gas, and commodity price changes.
- Shipping disruptions and supply chain problems.
- Interest rates, inflation, and economic changes.
- Government projects, policies, and regulations.
- Changes in industry demand and competition.
- Major global or regional events affecting customers,
  suppliers, or operating costs.

Choose factors that are genuinely relevant to the company.

Do NOT primarily search for:

- Company earnings or financial statements.
- Dividends.
- Stock price predictions.
- Routine corporate announcements.
- Analyst ratings.

STEP 3 — GENERATE SEARCH QUERIES

Generate exactly 5 Google News search queries:

1. An important geopolitical or global event relevant
   to the company's business.
2. An industry-wide development affecting demand.
3. A development affecting the company's costs or supply.
4. A Qatar or GCC economic or government development.
5. Another potentially important external event.

SEARCH RULES:

- Keep each query short, ideally 3-7 words.
- Search for actual news, not hypothetical scenarios.
- Use common keywords found in news headlines.
- Do not write full questions or long sentences.
- Do not include the company's name unless necessary.
- Do not combine many unrelated topics in one query.
- Do not assume an event actually happened.
- Prefer recent news relevant to Qatar, the GCC,
  or international markets connected to the company.

IMPORTANT:
Your job is to DISCOVER relevant news, not explain
its impact yet.

Return ONLY a valid JSON array of exactly 5 strings.
No Markdown, explanations, or additional text.

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
