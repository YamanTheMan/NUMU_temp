
import argparse
import hashlib
import os
from datetime import datetime
from pathlib import Path
from tempfile import NamedTemporaryFile

import requests
from bs4 import BeautifulSoup


BASE_DIR = Path(__file__).resolve().parent
LATEST_DIR = BASE_DIR / "latest"
ARCHIVE_DIR = BASE_DIR / "archive"

LATEST_DIR.mkdir(parents=True, exist_ok=True)
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)


def file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def download_page(url: str) -> bytes:
    response = requests.get(
        url,
        headers={
            "User-Agent": "NUMU-SnapshotBot/0.1"
        },
        timeout=30,
    )

    response.raise_for_status()

    content_type = response.headers.get(
        "Content-Type", ""
    ).lower()

    if "text/html" not in content_type:
        raise ValueError(
            f"Expected HTML, received {content_type}"
        )

    return response.content


def validate_html(content: bytes) -> None:
    if len(content) < 100:
        raise ValueError("Downloaded page is too small")

    soup = BeautifulSoup(content, "html.parser")

    if soup.find("html") is None:
        raise ValueError("No HTML document found")

    if soup.find("body") is None:
        raise ValueError("No HTML body found")


def save_atomic(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    temporary = None

    try:
        with NamedTemporaryFile(
            mode="wb",
            dir=path.parent,
            delete=False
        ) as f:
            temporary = Path(f.name)
            f.write(content)
            f.flush()
            os.fsync(f.fileno())

        temporary.replace(path)

    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def update_snapshot(name: str, url: str) -> None:
    print(f"Checking {name}: {url}")

    content = download_page(url)
    validate_html(content)

    latest_file = BASE_DIR.parent / "qse_stocks.html"

    new_hash = file_hash(content)

    if latest_file.exists():
        old_hash = file_hash(
            latest_file.read_bytes()
        )

        if new_hash == old_hash:
            print("No changes detected.")
            return

    now = datetime.now().astimezone()
    timestamp = now.strftime("%Y-%m-%d_%H-%M-%S_%f")

    archive_file = (
        ARCHIVE_DIR / name / f"{timestamp}.html"
    )

    save_atomic(archive_file, content)
    save_atomic(latest_file, content)

    print(f"Updated: {latest_file}")
    print(f"Archived: {archive_file}")


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--name",
        required=True,
        help="Snapshot name"
    )

    parser.add_argument(
        "--url",
        required=True,
        help="Website URL"
    )

    args = parser.parse_args()

    if (
        not args.name
        or not all(
            c.isalnum() or c in "-_"
            for c in args.name
        )
    ):
        parser.error(
            "Name must contain only letters, numbers, - or _"
        )

    if not args.url.startswith(
        ("https://", "http://")
    ):
        parser.error("URL must start with http or https")

    update_snapshot(args.name, args.url)


if __name__ == "__main__":
    main()
