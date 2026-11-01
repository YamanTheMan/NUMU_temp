
import serpapi
from config import SERPAPI_KEY


def search_news(query: str, limit: int = 5):
    if not SERPAPI_KEY:
        raise RuntimeError("SerpAPI is not configured")

    client = serpapi.Client(api_key=SERPAPI_KEY)

    results = client.search({
        "engine": "google_news",
        "q": query,
        "hl": "en"
    })

    articles = []

    for item in results.get("news_results", [])[:limit]:
        articles.append({
            "title": item.get("title"),
            "source": item.get("source"),
            "url": item.get("link"),
            "published_at": item.get("published_at"),
            "snippet": item.get("snippet"),
            "query": query
        })

    return articles


def search_multiple_topics(queries: list[str]):
    all_articles = []
    seen_links = set()

    for query in queries[:5]:
        articles = search_news(query)

        for article in articles:
            link = article["link"]

            if link and link not in seen_links:
                seen_links.add(link)
                all_articles.append(article)

    return all_articles
