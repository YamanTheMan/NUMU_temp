
import ipaddress
import socket
from datetime import datetime, timezone
from urllib.parse import urlparse

import dateparser
import httpx
from bs4 import BeautifulSoup


# Only inspect a limited amount of article content.
MAX_CONTENT_LENGTH = 12000
MIN_CONTENT_LENGTH = 250


def check_source(article):
    url = article.get("url")
    title = article.get("title")
    published = article.get("published_at")

    if not url or not title or not published:
        return False

    parsed = urlparse(url)

    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
    ):
        return False

    # Reject nonstandard ports.
    try:
        if parsed.port not in (None, 443):
            return False
    except ValueError:
        return False

    return True


def is_safe_host(url):
    """
    Basic protection against local/private network URLs.
    Production deployments also need network-level
    protections against DNS rebinding.
    """
    hostname = urlparse(url).hostname

    try:
        addresses = socket.getaddrinfo(
            hostname, 443, type=socket.SOCK_STREAM
        )

        for address in addresses:
            ip = ipaddress.ip_address(address[4][0])

            if not ip.is_global:
                return False

        return bool(addresses)

    except (OSError, ValueError, TypeError):
        return False


def normalize_date(date_string):
    if not date_string:
        return None

    now = datetime.now(timezone.utc)

    parsed = dateparser.parse(
        str(date_string),
        settings={
            "RELATIVE_BASE": now,
            "RETURN_AS_TIMEZONE_AWARE": True,
            "TO_TIMEZONE": "UTC",
            "PREFER_DATES_FROM": "past"
        }
    )

    if not parsed or parsed > now:
        return None

    return parsed.isoformat()


def fetch_article(url):
    """
    Retrieves readable HTML article text.
    Does not follow redirects.
    """
    if not is_safe_host(url):
        return None

    try:
        with httpx.Client(
            timeout=10.0,
            follow_redirects=False,
            trust_env=False
        ) as client:

            with client.stream("GET", url) as response:
                response.raise_for_status()

                content_type = response.headers.get(
                    "content-type", ""
                ).lower()

                if "text/html" not in content_type:
                    return None

                content = bytearray()

                for chunk in response.iter_bytes():
                    content.extend(chunk)

                    if len(content) > 1_000_000:
                        return None

        soup = BeautifulSoup(
            bytes(content),
            "html.parser"
        )

        # Prefer article content if available.
        article = soup.find("article")

        if article is None:
            article = soup.find("main")

        if article is None:
            article = soup.body

        if article is None:
            return None

        for tag in article.find_all([
            "script", "style", "nav", "footer",
            "header", "aside", "form"
        ]):
            tag.decompose()

        paragraphs = article.find_all("p")

        text = " ".join(
            p.get_text(" ", strip=True)
            for p in paragraphs
        )

        text = " ".join(text.split())

        if len(text) < MIN_CONTENT_LENGTH:
            return None

        return text[:MAX_CONTENT_LENGTH]

    except (httpx.HTTPError, ValueError, OSError):
        return None


def filter_sources(articles):
    return [
        article
        for article in articles
        if check_source(article)
    ]


def prepare_sources(articles):
    candidate_articles = filter_sources(articles)

    sources = []
    seen_urls = set()

    for article in candidate_articles:
        url = article["url"]

        if url in seen_urls:
            continue

        seen_urls.add(url)

        published = normalize_date(
            article["published_at"]
        )

        if published is None:
            continue

        content = fetch_article(url)

        if content is None:
            continue

        sources.append({
            "id": f"S{len(sources) + 1}",
            "title": article["title"],
            "url": url,
            "published_at": published,
            "publisher": article.get("source"),
            "snippet": article.get("snippet"),
            "content": content,
            "status": "content_retrieved"
        })

    return sources
