
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

    print(f"\n[SEARCH] {query}")

    print(
        "[SERPAPI STATUS]",
        results.get("search_metadata", {}).get("status")
    )

    print(
        "[SERPAPI ERROR]",
        results.get("error")
    )

    print(
        "[NEWS RESULTS]",
        len(results.get("news_results", []))
    )

    articles = []

    for item in results.get("news_results", []):
        if len(articles) >= limit:
            break

        if not isinstance(item, dict):
            continue

        title = item.get("title")
        url = item.get("link") or item.get("url")
        published_at = (
            item.get("published_at")
            or item.get("date")
        )

        source = item.get("source")
        if isinstance(source, dict):
            source = source.get("name")

        # Skip articles without usable titles or links.
        if not isinstance(title, str) or not title.strip():
            continue

        if not isinstance(url, str) or not url.startswith("https://"):
            continue

        articles.append({
            "title": title,
            "source": source,
            "publisher": source,
            "url": url,
            "published_at": published_at,
            "snippet": item.get("snippet") or "",
            "query": query
        })

    return articles


def search_multiple_topics(queries: list[str]):
    all_articles = []
    seen_links = set()

    for query in queries[:5]:
        articles = search_news(query)

        for article in articles:
            url = article.get("url")

            if not url or url in seen_links:
                continue

            seen_links.add(url)
            all_articles.append(article)

    return all_articles
