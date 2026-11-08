
from datetime import datetime, timezone

from agents.search_planner import generate_search_queries
from agents.source_verifier import prepare_sources
from agents.impact_analyzer import analyze_impact
from api.serpapi_api import search_multiple_topics


def research_company(company, sector, description):
    """
    Research events that may influence a QSE company.

    Returns an educational report with:
    - Relevant news search queries
    - Possible positive and negative impacts
    - Beginner-friendly explanations
    - Supporting source links
    """

    searched_at = datetime.now(
        timezone.utc
    ).isoformat()

    # Step 1: Decide what to research
    queries = generate_search_queries(
        company,
        sector,
        description
    )

    # Step 2: Search Google News
    articles = search_multiple_topics(queries)

    # Step 3: Normalize article fields
    for article in articles:
        article["url"] = article.get(
            "url"
        ) or article.get("link")

        article["published_at"] = article.get(
            "published_at"
        ) or article.get("date")

    # Step 4: Retrieve and prepare sources
    sources = prepare_sources(articles)

    # Step 5: Handle missing evidence
    if not sources:
        return {
            "company": company,
            "sector": sector,
            "searched_at": searched_at,
            "queries": queries,
            "articles_found": len(articles),
            "sources_retrieved": 0,
            "status": "insufficient_evidence",
            "summary": (
                "We couldn't find enough accessible "
                "information to explain what might "
                "affect this company right now."
            ),
            "insights": [],
            "financial_terms": [],
            "sources": []
        }

    # Step 6: Ask OpenAI to analyze the evidence
    analysis = analyze_impact(
        company,
        sources
    )

    # Step 7: Build the final research report
    return {
        "company": company,
        "sector": sector,
        "searched_at": searched_at,
        "queries": queries,
        "articles_found": len(articles),
        "sources_retrieved": len(sources),
        "status": (
            "analysis_generated"
            if analysis["insights"]
            else "insufficient_evidence"
        ),
        "summary": analysis["summary"],
        "insights": analysis["insights"],
        "financial_terms": analysis.get("financial_terms", []),
        "sources": [
            {
                "id": source["id"],
                "title": source["title"],
                "url": source["url"],
                "publisher": source.get("publisher"),
                "published_at": source["published_at"]
            }
            for source in sources
            if source["id"] in {
                source_id
                for insight in analysis["insights"]
                for source_id in insight.get("source_ids", [])
            }
        ]
    }
