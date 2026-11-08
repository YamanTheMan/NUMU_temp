"""Chart lessons for the avatar tutor.

Claire explains a Qatari stock out loud while a chart beside her moves in step
with what she says. This module:

- loads the saved price history in snapshots/history (from StockAnalysis.com),
- works out the facts worth teaching (biggest drop, high, low, trend, swings...),
- asks the AI to turn those facts into short spoken steps, each tied to a chart cue,
- and falls back to a ready-made script when the AI is not available.

The AI never sees coordinates. It only picks cue names from a menu, and the
server turns each cue into exact chart actions, so the chart always matches the data.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
import re
from datetime import date
from functools import lru_cache
from pathlib import Path
from statistics import mean, pstdev

HISTORY_DIR = Path(__file__).resolve().parent.parent / "snapshots" / "history"

MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS_EN_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]

# ---------------------------------------------------------------------------
# Companies and what usually moves them
# ---------------------------------------------------------------------------

COMPANIES = {
    "QNBK": {"short": "QNB", "ar": "بنك قطر الوطني", "sector": "banks",
             "aliases": ["qnb", "qatar national bank", "national bank", "بنك قطر الوطني", "الوطني", "كيو ان بي", "كيو إن بي"]},
    "QIBK": {"short": "QIB", "ar": "مصرف قطر الإسلامي", "sector": "banks",
             "aliases": ["qib", "qatar islamic", "islamic bank", "مصرف قطر الإسلامي", "مصرف قطر الاسلامي", "قطر الإسلامي", "قطر الاسلامي"]},
    "MARK": {"short": "Masraf Al Rayan", "ar": "مصرف الريان", "sector": "banks",
             "aliases": ["masraf al rayan", "al rayan", "alrayan", "rayan", "الريان"]},
    "CBQK": {"short": "Commercial Bank", "ar": "البنك التجاري", "sector": "banks",
             "aliases": ["commercial bank", "cbq", "التجاري"]},
    "IQCD": {"short": "Industries Qatar", "ar": "صناعات قطر", "sector": "industrials",
             "aliases": ["industries qatar", "industries", "صناعات قطر", "صناعات"]},
    "QAMC": {"short": "QAMCO", "ar": "قطر للألمنيوم", "sector": "aluminium",
             "aliases": ["qamco", "qatar aluminium", "qatar aluminum", "aluminium", "aluminum", "ألمنيوم", "المنيوم", "الألومنيوم", "الالمنيوم"]},
    "ORDS": {"short": "Ooredoo", "ar": "أوريدو", "sector": "telecoms",
             "aliases": ["ooredoo", "oredoo", "ooreedo", "أوريدو", "اوريدو", "أريدو"]},
    "QGTS": {"short": "Nakilat", "ar": "ناقلات", "sector": "shipping",
             "aliases": ["nakilat", "qatar gas transport", "gas transport", "ناقلات"]},
    "QEWS": {"short": "Qatar Electricity and Water", "ar": "كهرباء وماء قطر", "sector": "utilities",
             "aliases": ["qatar electricity", "electricity and water", "electricity", "qews", "كهرباء"]},
    "BRES": {"short": "Barwa", "ar": "بروة", "sector": "realestate",
             "aliases": ["barwa", "بروة", "بروه"]},
    "BLDN": {"short": "Baladna", "ar": "بلدنا", "sector": "consumer",
             "aliases": ["baladna", "بلدنا"]},
    "QFLS": {"short": "Woqod", "ar": "وقود", "sector": "fuel",
             "aliases": ["woqod", "qatar fuel", "وقود"]},
}

# icon keys are drawn by the frontend (tutor-chart.js)
SECTORS = {
    "banks": {"en": "banks", "ar": "البنوك", "peers": ["QNBK", "QIBK", "MARK", "CBQK"], "drivers": [
        ("rate", "Interest rates", "أسعار الفائدة"),
        ("loan", "Loan growth", "نمو القروض"),
        ("gov", "Government spending", "الإنفاق الحكومي"),
        ("gas", "Oil and gas income", "دخل النفط والغاز")]},
    "industrials": {"en": "industrial companies", "ar": "الشركات الصناعية", "peers": ["IQCD", "QAMC"], "drivers": [
        ("gas", "Oil and gas prices", "أسعار النفط والغاز"),
        ("factory", "Fertilizer and steel prices", "أسعار الأسمدة والحديد"),
        ("globe", "Demand from Asia", "الطلب من آسيا")]},
    "aluminium": {"en": "metal makers", "ar": "شركات المعادن", "peers": ["QAMC", "IQCD"], "drivers": [
        ("factory", "Global aluminium prices", "أسعار الألمنيوم عالمياً"),
        ("bolt", "Energy costs", "تكاليف الطاقة"),
        ("globe", "Demand from China", "الطلب من الصين")]},
    "telecoms": {"en": "telecom companies", "ar": "شركات الاتصالات", "peers": None, "drivers": [
        ("signal", "Mobile and data users", "مستخدمو الجوال والإنترنت"),
        ("coins", "Dividend payouts", "توزيعات الأرباح"),
        ("globe", "Markets abroad", "الأسواق الخارجية")]},
    "shipping": {"en": "shipping companies", "ar": "شركات الشحن", "peers": None, "drivers": [
        ("ship", "Demand for gas shipping", "الطلب على شحن الغاز"),
        ("gas", "North Field gas expansion", "توسعة حقل الشمال"),
        ("doc", "Long-term ship contracts", "عقود السفن طويلة الأجل")]},
    "utilities": {"en": "utilities", "ar": "شركات المرافق", "peers": None, "drivers": [
        ("doc", "Steady government contracts", "عقود حكومية ثابتة"),
        ("coins", "Dividend payouts", "توزيعات الأرباح"),
        ("rate", "Interest rates", "أسعار الفائدة")]},
    "realestate": {"en": "property companies", "ar": "شركات العقار", "peers": None, "drivers": [
        ("rate", "Interest rates", "أسعار الفائدة"),
        ("home", "Demand for property", "الطلب على العقار"),
        ("coins", "Rent levels", "مستويات الإيجار")]},
    "consumer": {"en": "food companies", "ar": "شركات الأغذية", "peers": None, "drivers": [
        ("cart", "Local demand", "الطلب المحلي"),
        ("factory", "Feed and farming costs", "تكاليف الأعلاف والمزارع"),
        ("globe", "Expansion plans", "خطط التوسع")]},
    "fuel": {"en": "fuel companies", "ar": "شركات الوقود", "peers": None, "drivers": [
        ("fuel", "Fuel sales", "مبيعات الوقود"),
        ("gas", "Oil prices", "أسعار النفط"),
        ("coins", "Dividend payouts", "توزيعات الأرباح")]},
}

TICKERS = list(COMPANIES)

# ---------------------------------------------------------------------------
# Loading and small helpers
# ---------------------------------------------------------------------------


@lru_cache(maxsize=None)
def load_history(ticker: str) -> dict:
    with open(HISTORY_DIR / f"{ticker}.json", encoding="utf-8") as handle:
        return json.load(handle)


def company_name(ticker: str, language: str) -> str:
    return COMPANIES[ticker]["ar"] if language == "ar" else COMPANIES[ticker]["short"]


def sector_name(ticker: str, language: str) -> str:
    sector = SECTORS[COMPANIES[ticker]["sector"]]
    return sector["ar"] if language == "ar" else sector["en"]


def _d(iso: str) -> date:
    return date.fromisoformat(iso)


def day_label(iso: str, language: str, long: bool = False) -> str:
    d = _d(iso)
    if language == "ar":
        return f"{d.day} {MONTHS_AR[d.month - 1]}"
    return f"{d.day} {(MONTHS_EN_LONG if long else MONTHS_EN)[d.month - 1]}"


def month_label(iso: str, language: str) -> str:
    d = _d(iso)
    return f"{MONTHS_AR[d.month - 1]} {d.year}" if language == "ar" else f"{MONTHS_EN_LONG[d.month - 1]} {d.year}"


def pct(a: float, b: float) -> float:
    return (b / a - 1) * 100 if a else 0.0


def signed(value: float, digits: int = 1) -> str:
    text = f"{abs(value):.{digits}f}%"
    return ("+" if value >= 0 else "−") + text


def price(value: float) -> str:
    return f"{value:.2f}" if value >= 1 else f"{value:.3f}"


def _seed(text: str) -> int:
    return int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)


# ---------------------------------------------------------------------------
# Facts worth teaching
# ---------------------------------------------------------------------------


def _max_drop(closes: list[float]) -> tuple[int, int, float]:
    """Largest fall from a high to a later low: (start index, end index, percent)."""
    best = (0, 0, 0.0)
    peak_i = 0
    for i, c in enumerate(closes):
        if c > closes[peak_i]:
            peak_i = i
        change = pct(closes[peak_i], c)
        if change < best[2]:
            best = (peak_i, i, change)
    return best


def _max_climb(closes: list[float]) -> tuple[int, int, float]:
    """Largest rise from a low to a later high: (start index, end index, percent)."""
    best = (0, 0, 0.0)
    low_i = 0
    for i, c in enumerate(closes):
        if c < closes[low_i]:
            low_i = i
        change = pct(closes[low_i], c)
        if change > best[2]:
            best = (low_i, i, change)
    return best


def _daily_returns(closes: list[float]) -> list[float]:
    return [math.log(b / a) for a, b in zip(closes, closes[1:]) if a and b]


@lru_cache(maxsize=None)
def volatility_ranks() -> dict:
    """Typical daily swing for every company, and its rank (1 = calmest)."""
    swings = {}
    for t in TICKERS:
        closes = [r[4] for r in load_history(t)["daily"]["rows"]]
        swings[t] = pstdev(_daily_returns(closes)) * 100
    order = sorted(swings, key=swings.get)
    return {t: {"daily": swings[t], "rank": order.index(t) + 1, "of": len(order)} for t in TICKERS}


@lru_cache(maxsize=None)
def market_basket() -> list[float]:
    """Average move of all 12 companies, rebased to % change from the first day."""
    series = []
    for t in TICKERS:
        closes = [r[4] for r in load_history(t)["daily"]["rows"]]
        series.append([pct(closes[0], c) for c in closes])
    return [round(mean(values), 3) for values in zip(*series)]


def _regression(closes: list[float]) -> tuple[float, float, float]:
    """Straight-line fit on log prices: returns (a, b, r2) with price ~ exp(a + b*i)."""
    ys = [math.log(c) for c in closes]
    n = len(ys)
    xs = list(range(n))
    mx, my = mean(xs), mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    b = sxy / sxx if sxx else 0.0
    a = my - b * mx
    ss_tot = sum((y - my) ** 2 for y in ys) or 1e-12
    ss_res = sum((y - (a + b * x)) ** 2 for x, y in zip(xs, ys))
    return a, b, max(0.0, 1 - ss_res / ss_tot)


@lru_cache(maxsize=None)
def facts(ticker: str) -> dict:
    data = load_history(ticker)
    rows = data["daily"]["rows"]
    dates = [r[0] for r in rows]
    closes = [r[4] for r in rows]
    volumes = [r[5] for r in rows]
    n = len(rows)

    weekly = data["weekly"]["rows"]
    wdates = [r[0] for r in weekly]
    wcloses = [r[1] for r in weekly]

    hi = max(range(n), key=lambda i: closes[i])
    lo = min(range(n), key=lambda i: closes[i])
    drop = _max_drop(closes)
    climb = _max_climb(closes)
    rets = [pct(a, b) for a, b in zip(closes, closes[1:])]
    best_day = max(range(len(rets)), key=lambda i: rets[i]) + 1
    worst_day = min(range(len(rets)), key=lambda i: rets[i]) + 1
    avg_vol = mean(volumes)
    spike = max(range(n), key=lambda i: volumes[i])
    a, b, r2 = _regression(closes)
    per_month = (math.exp(b * 21) - 1) * 100  # about 21 trading days a month
    month_start = max(0, n - 22)

    whi = max(range(len(wcloses)), key=lambda i: wcloses[i])
    wlo = min(range(len(wcloses)), key=lambda i: wcloses[i])
    wdrop = _max_drop(wcloses)

    vol = volatility_ranks()[ticker]

    # 60 practice paths for the next month, re-using the last six months' real daily moves.
    rng = random.Random(_seed(ticker))
    log_rets = _daily_returns(closes)
    paths = []
    for _ in range(60):
        value, path = closes[-1], [closes[-1]]
        for _ in range(21):
            value *= math.exp(rng.choice(log_rets))
            path.append(round(value, 3))
        paths.append(path)
    finals = sorted(p[-1] for p in paths)
    p10, p50, p90 = finals[5], finals[30], finals[54]

    return {
        "ticker": ticker,
        "n": n, "dates": dates, "closes": closes, "volumes": volumes,
        "wdates": wdates, "wcloses": wcloses,
        "start": 0, "end": n - 1,
        "change_6m": pct(closes[0], closes[-1]),
        "hi": hi, "lo": lo,
        "drop": drop, "climb": climb,
        "best_day": (best_day, rets[best_day - 1]),
        "worst_day": (worst_day, rets[worst_day - 1]),
        "avg_volume": avg_vol, "spike": (spike, volumes[spike] / avg_vol if avg_vol else 1),
        "trend": {"a": a, "b": b, "r2": r2, "per_month": per_month},
        "month": (month_start, pct(closes[month_start], closes[-1])),
        "change_5y": pct(wcloses[0], wcloses[-1]),
        "whi": whi, "wlo": wlo, "wdrop": wdrop,
        "vol": vol,
        "swings": {"paths": paths, "p10": p10, "p50": p50, "p90": p90, "days": 21},
    }


# ---------------------------------------------------------------------------
# Finding the company in a question
# ---------------------------------------------------------------------------

_ARABIC = re.compile(r"[؀-ۿ]")


def _norm(text: str) -> str:
    text = (text or "").lower()
    text = re.sub("[إأآ]", "ا", text)
    text = text.replace("ة", "ه").replace("ى", "ي")
    text = re.sub(r"[ً-ْ]", "", text)  # Arabic short vowels
    return f" {re.sub(r'[^0-9a-z؀-ۿ]+', ' ', text)} "


def find_tickers(question: str) -> list[str]:
    """Companies named in the question, in the order they appear."""
    text = _norm(question)
    hits = {}
    for ticker, info in COMPANIES.items():
        for alias in [ticker.lower(), *info["aliases"]]:
            key = _norm(alias).strip()
            if not key:
                continue
            if _ARABIC.search(key):
                pos = text.find(key)
            else:
                match = re.search(rf"(?<![a-z0-9]){re.escape(key)}(?![a-z0-9])", text)
                pos = match.start() if match else -1
            if pos >= 0 and (ticker not in hits or pos < hits[ticker]):
                hits[ticker] = pos
    return sorted(hits, key=hits.get)


# ---------------------------------------------------------------------------
# Cue menu (what the AI may pick) and chart actions (what the frontend plays)
# ---------------------------------------------------------------------------

CUES = [
    "show_6m", "show_5y", "whole_move_6m", "high_6m", "low_6m", "biggest_drop", "biggest_climb",
    "best_day", "worst_day", "last_month", "trend", "volume_spike", "swings", "range_6m",
    "compare_sector", "compare_market", "compare_asked", "drivers",
    "whole_move_5y", "high_5y", "low_5y", "biggest_drop_5y", "zoom_out", "none",
]


def _days(n: int, language: str) -> str:
    if language == "ar":
        return f"{n} يوم تداول" if n > 10 else f"{n} أيام تداول"
    return f"{n} trading day{'s' if n != 1 else ''}"


def cue_menu(ticker: str, language: str, asked: list[str]) -> dict:
    """Each cue the AI may use, with the exact numbers it should say."""
    f = facts(ticker)
    D, C, W, WD = f["dates"], f["closes"], f["wcloses"], f["wdates"]
    L = lambda iso: day_label(iso, "en", long=True)  # the AI gets English facts and translates
    i0, i1, dp = f["drop"]
    c0, c1, cp = f["climb"]
    bd, bdp = f["best_day"]
    wd, wdp = f["worst_day"]
    si, sr = f["spike"]
    ms, mp = f["month"]
    w0, w1, wp = f["wdrop"]
    vol = f["vol"]
    calm = "calmer than most" if vol["rank"] <= 4 else "swingier than most" if vol["rank"] >= 9 else "about average"
    peers = SECTORS[COMPANIES[ticker]["sector"]]["peers"]
    sw = f["swings"]
    menu = {
        "show_6m": f"Draw the last six months of daily prices ({L(D[0])} to {L(D[-1])}).",
        "show_5y": f"Draw five years of weekly prices ({month_label(WD[0], 'en')} to {month_label(WD[-1], 'en')}).",
        "whole_move_6m": f"Highlight the whole six months: {price(C[0])} to {price(C[-1])} riyals, {signed(f['change_6m'])}.",
        "high_6m": f"Mark the six-month high: {price(C[f['hi']])} riyals on {L(D[f['hi']])}.",
        "low_6m": f"Mark the six-month low: {price(C[f['lo']])} riyals on {L(D[f['lo']])}.",
        "biggest_drop": f"Zoom into the biggest fall: {price(C[i0])} on {L(D[i0])} down to {price(C[i1])} on {L(D[i1])}, {signed(dp)} in {i1 - i0} trading days.",
        "biggest_climb": f"Zoom into the biggest climb: {price(C[c0])} on {L(D[c0])} up to {price(C[c1])} on {L(D[c1])}, {signed(cp)} in {c1 - c0} trading days.",
        "best_day": f"Zoom to the best single day: {L(D[bd])}, {signed(bdp)} in one day.",
        "worst_day": f"Zoom to the worst single day: {L(D[wd])}, {signed(wdp)} in one day.",
        "last_month": f"Zoom into the last month: {signed(mp)} since {L(D[ms])}.",
        "trend": f"Draw the trend line: on average {signed(f['trend']['per_month'])} a month over six months (fit {'strong' if f['trend']['r2'] > 0.6 else 'loose'}).",
        "volume_spike": f"Show trading volume bars. Busiest day {L(D[si])}, about {sr:.1f} times a normal day.",
        "swings": f"Show 60 practice paths for the next month built from its real daily moves. Most end between {price(sw['p10'])} and {price(sw['p90'])} riyals. NOT a prediction, it shows how big normal swings are.",
        "range_6m": f"Shade the six-month range: {price(C[f['lo']])} to {price(C[f['hi']])} riyals.",
        "compare_market": f"Compare it with the average of 12 big QSE companies over six months: it is {signed(f['change_6m'])}, the average is {signed(market_basket()[-1])}.",
        "drivers": "Show a card of things that usually move " + SECTORS[COMPANIES[ticker]["sector"]]["en"] + ": " + ", ".join(d[1] for d in SECTORS[COMPANIES[ticker]["sector"]]["drivers"]) + ".",
        "whole_move_5y": f"Highlight five years: {price(W[0])} to {price(W[-1])} riyals, {signed(f['change_5y'])}.",
        "high_5y": f"Mark the five-year high: {price(W[f['whi']])} riyals in {month_label(WD[f['whi']], 'en')}.",
        "low_5y": f"Mark the five-year low: {price(W[f['wlo']])} riyals in {month_label(WD[f['wlo']], 'en')}.",
        "biggest_drop_5y": f"Zoom into the biggest fall in five years: {month_label(WD[w0], 'en')} to {month_label(WD[w1], 'en')}, {signed(wp)}.",
        "zoom_out": "Zoom back out to the full chart.",
        "none": "No chart change. Just talk.",
    }
    if peers:
        others = [p for p in peers if p != ticker]
        menu["compare_sector"] = "Compare six-month moves with other " + SECTORS[COMPANIES[ticker]["sector"]]["en"] + ": " + ", ".join(
            f"{company_name(t, 'en')} {signed(facts(t)['change_6m'])}" for t in [ticker, *others]) + "."
    if len(asked) >= 2:
        menu["compare_asked"] = "Compare the companies the learner named: " + ", ".join(
            f"{company_name(t, 'en')} {signed(facts(t)['change_6m'])}" for t in asked[:4]) + " over six months."
    menu["_context"] = (
        f"Daily swings: typically {vol['daily']:.1f}% a day, {calm} of the 12 big QSE stocks "
        f"(rank {vol['rank']} of {vol['of']}, 1 is calmest). Last price {price(C[-1])} riyals on {L(D[-1])}."
    )
    return menu


def _zoom(range_: str, i0: int, i1: int, n: int, pad: int = 6) -> dict:
    return {"type": "zoom", "range": range_, "i0": max(0, i0 - pad), "i1": min(n - 1, i1 + pad)}


def resolve_cue(cue: str, ticker: str, language: str, asked: list[str]) -> list[dict]:
    """Turn a cue name into exact chart actions with labels in the learner's language."""
    f = facts(ticker)
    D, C, W, WD, n, wn = f["dates"], f["closes"], f["wcloses"], f["wdates"], f["n"], len(f["wcloses"])
    ar = language == "ar"
    lab = lambda iso: day_label(iso, language)
    tone = lambda v: "up" if v >= 0 else "down"
    sector = COMPANIES[ticker]["sector"]

    if cue == "show_6m":
        return [{"type": "show", "range": "6M"}]
    if cue == "show_5y":
        return [{"type": "show", "range": "5Y"}]
    if cue == "whole_move_6m":
        v = f["change_6m"]
        return [{"type": "zoom_out"}, {"type": "move", "range": "6M", "i0": 0, "i1": n - 1, "tone": tone(v),
                 "label": f"{signed(v)} {'خلال 6 أشهر' if ar else 'in 6 months'}"}]
    if cue in ("high_6m", "low_6m"):
        i = f["hi"] if cue == "high_6m" else f["lo"]
        word = ("أعلى سعر" if cue == "high_6m" else "أدنى سعر") if ar else ("6-month high" if cue == "high_6m" else "6-month low")
        return [{"type": "marker", "range": "6M", "i": i, "kind": "high" if cue == "high_6m" else "low",
                 "label": f"{word} {price(C[i])}", "sub": lab(D[i])}]
    if cue in ("biggest_drop", "biggest_climb"):
        i0, i1, v = f["drop"] if cue == "biggest_drop" else f["climb"]
        if i1 <= i0:
            return [{"type": "zoom_out"}]
        return [_zoom("6M", i0, i1, n), {"type": "move", "range": "6M", "i0": i0, "i1": i1, "tone": tone(v),
                 "label": f"{signed(v)} {'خلال' if ar else 'in'} {_days(i1 - i0, language)}", "sub": f"{lab(D[i0])} → {lab(D[i1])}"}]
    if cue in ("best_day", "worst_day"):
        i, v = f["best_day"] if cue == "best_day" else f["worst_day"]
        word = ("في يوم واحد" if ar else "in one day")
        return [_zoom("6M", i, i, n, pad=12), {"type": "marker", "range": "6M", "i": i, "kind": "day", "tone": tone(v),
                 "label": f"{signed(v)} {word}", "sub": lab(D[i])}]
    if cue == "last_month":
        i0, v = f["month"]
        return [_zoom("6M", i0, n - 1, n, pad=3), {"type": "move", "range": "6M", "i0": i0, "i1": n - 1, "tone": tone(v),
                 "label": f"{signed(v)} {'خلال آخر شهر' if ar else 'in the last month'}"}]
    if cue == "trend":
        t = f["trend"]
        return [{"type": "zoom_out"}, {"type": "trend", "range": "6M", "a": t["a"], "b": t["b"], "tone": tone(t["per_month"]),
                 "label": f"{'الاتجاه' if ar else 'Trend'} {signed(t['per_month'])} {'شهرياً' if ar else 'a month'}"}]
    if cue == "volume_spike":
        i, ratio = f["spike"]
        return [{"type": "volume", "range": "6M", "i": i,
                 "label": (f"حجم التداول {ratio:.1f}× المعتاد" if ar else f"{ratio:.1f}× normal volume"), "sub": lab(D[i])}]
    if cue == "swings":
        sw = f["swings"]
        return [{"type": "swings", "p10": sw["p10"], "p50": sw["p50"], "p90": sw["p90"],
                 "label": "ليس توقعاً" if ar else "Not a forecast",
                 "sub": (f"60 مساراً من تحركاته اليومية الحقيقية" if ar else "60 practice paths from its real daily moves")}]
    if cue == "range_6m":
        return [{"type": "zoom_out"}, {"type": "range", "range": "6M", "lo": f["lo"], "hi": f["hi"],
                 "label": f"{'نطاق 6 أشهر' if ar else '6-month range'} {price(C[f['lo']])} – {price(C[f['hi']])}"}]
    if cue in ("compare_sector", "compare_market", "compare_asked"):
        group = cue.split("_")[1]
        if group == "sector" and not SECTORS[sector]["peers"]:
            group = "market"
        if group == "asked" and len(asked) < 2:
            group = "market"
        return [{"type": "compare", "group": group}]
    if cue == "drivers":
        s = SECTORS[sector]
        title = (f"ما الذي يحرك {s['ar']} عادةً" if ar else f"What usually moves {s['en']}")
        return [{"type": "drivers", "title": title, "items": [{"icon": d[0], "label": d[2] if ar else d[1]} for d in s["drivers"]]}]
    if cue == "whole_move_5y":
        v = f["change_5y"]
        return [{"type": "show", "range": "5Y"}, {"type": "move", "range": "5Y", "i0": 0, "i1": wn - 1, "tone": tone(v),
                 "label": f"{signed(v)} {'خلال 5 سنوات' if ar else 'in 5 years'}"}]
    if cue in ("high_5y", "low_5y"):
        i = f["whi"] if cue == "high_5y" else f["wlo"]
        word = ("أعلى سعر في 5 سنوات" if cue == "high_5y" else "أدنى سعر في 5 سنوات") if ar else ("5-year high" if cue == "high_5y" else "5-year low")
        return [{"type": "show", "range": "5Y"}, {"type": "marker", "range": "5Y", "i": i, "kind": "high" if cue == "high_5y" else "low",
                 "label": f"{word} {price(W[i])}", "sub": month_label(WD[i], language)}]
    if cue == "biggest_drop_5y":
        i0, i1, v = f["wdrop"]
        if i1 <= i0:
            return [{"type": "show", "range": "5Y"}]
        return [{"type": "show", "range": "5Y"}, _zoom("5Y", i0, i1, wn, pad=10), {"type": "move", "range": "5Y", "i0": i0, "i1": i1, "tone": tone(v),
                 "label": signed(v), "sub": f"{month_label(WD[i0], language)} → {month_label(WD[i1], language)}"}]
    if cue == "zoom_out":
        return [{"type": "zoom_out"}]
    return []


def chart_pack(ticker: str, language: str, asked: list[str]) -> dict:
    """Everything the frontend needs to draw this company's chart."""
    data = load_history(ticker)
    f = facts(ticker)
    rows = data["daily"]["rows"]
    ar = language == "ar"
    sector = COMPANIES[ticker]["sector"]

    def rebased(t: str) -> list[float]:
        closes = facts(t)["closes"]
        return [round(pct(closes[0], c), 3) for c in closes]

    compare = {"market": {"title": "مقارنة بمتوسط 12 شركة كبرى" if ar else "vs the average of 12 big QSE stocks",
                          "series": [{"ticker": ticker, "label": company_name(ticker, language), "values": rebased(ticker)},
                                     {"ticker": "AVG", "label": "متوسط 12 شركة" if ar else "12-stock average", "values": market_basket()}]}}
    peers = SECTORS[sector]["peers"]
    if peers:
        group = [ticker] + [p for p in peers if p != ticker]
        compare["sector"] = {"title": (f"مقارنة مع {SECTORS[sector]['ar']}" if ar else f"vs other {SECTORS[sector]['en']}"),
                             "series": [{"ticker": t, "label": company_name(t, language), "values": rebased(t)} for t in group]}
    if len(asked) >= 2:
        compare["asked"] = {"title": "المقارنة التي طلبتها" if ar else "The companies you asked about",
                            "series": [{"ticker": t, "label": company_name(t, language), "values": rebased(t)} for t in asked[:4]]}

    vol = f["vol"]
    calm_word = (("هادئ", "متقلب", "متوسط") if ar else ("calm", "swingy", "average"))
    calm = calm_word[0] if vol["rank"] <= 4 else calm_word[1] if vol["rank"] >= 9 else calm_word[2]
    closes = f["closes"]
    return {
        "ticker": ticker,
        "name": company_name(ticker, language),
        "full_name": data["name"],
        "sector": sector_name(ticker, language),
        "currency": "QAR",
        "source": "StockAnalysis.com",
        "as_of": data["as_of"],
        "ranges": {
            "6M": {"kind": "ohlc", "dates": [r[0] for r in rows],
                   "o": [r[1] for r in rows], "h": [r[2] for r in rows], "l": [r[3] for r in rows],
                   "c": [r[4] for r in rows], "v": [r[5] for r in rows]},
            "5Y": {"kind": "line", "dates": f["wdates"], "c": f["wcloses"]},
        },
        "tiles": [
            {"key": "change", "label": "التغير خلال 6 أشهر" if ar else "6-month change", "value": signed(f["change_6m"]),
             "tone": "up" if f["change_6m"] >= 0 else "down"},
            {"key": "range", "label": "نطاق 6 أشهر" if ar else "6-month range", "value": f"{price(closes[f['lo']])}–{price(closes[f['hi']])}"},
            {"key": "swings", "label": "التذبذب اليومي" if ar else "Typical daily swing", "value": f"±{vol['daily']:.1f}%", "note": calm},
            {"key": "volume", "label": "متوسط حجم التداول" if ar else "Avg daily volume", "value": _compact(f["avg_volume"])},
        ],
        "compare": compare,
        "swings": {"paths": f["swings"]["paths"], "days": 21},
    }


def _compact(value: float) -> str:
    if value >= 1e6:
        return f"{value / 1e6:.1f}M"
    if value >= 1e3:
        return f"{value / 1e3:.0f}K"
    return f"{value:.0f}"


# ---------------------------------------------------------------------------
# The ready-made script (used when the AI is not available)
# ---------------------------------------------------------------------------


def fallback_steps(ticker: str, language: str, asked: list[str]) -> list[dict]:
    f = facts(ticker)
    C = f["closes"]
    ar = language == "ar"
    name = company_name(ticker, language)
    v6, v5 = f["change_6m"], f["change_5y"]
    i0, i1, dp = f["drop"]
    c0, c1, cp = f["climb"]
    use_drop = abs(dp) >= abs(cp)
    big_i0, big_i1, big_v = (i0, i1, dp) if use_drop else (c0, c1, cp)
    sector = SECTORS[COMPANIES[ticker]["sector"]]
    d1, d2 = sector["drivers"][0], sector["drivers"][1]
    peers = bool(sector["peers"])

    if ar:
        return [
            {"say": f"انظر إلى الرسم على اليمين. هذا سهم {name} خلال آخر ستة أشهر.", "cue": "show_6m", "tag": "آخر 6 أشهر"},
            {"say": f"بدأ عند {price(C[0])} ريال، واليوم هو {price(C[-1])}. يعني {'ارتفع' if v6 >= 0 else 'انخفض'} حوالي {abs(round(v6))}٪.", "cue": "whole_move_6m", "tag": "الصورة الكاملة"},
            {"say": f"لاحظ هذا الجزء. {'هبط' if use_drop else 'صعد'} {abs(round(big_v))}٪ خلال {big_i1 - big_i0} يوم تداول تقريباً.", "cue": "biggest_drop" if use_drop else "biggest_climb", "tag": "أكبر هبوط" if use_drop else "أكبر صعود"},
            {"say": f"تحركات مثل هذه ترتبط غالباً بعاملين مهمين: {d1[2]}، و{d2[2]}. وهما يؤثران كثيراً على {sector['ar']}.", "cue": "drivers", "tag": "لماذا يتحرك؟"},
            {"say": "هذه المسارات تُظهر حجم تقلباته الطبيعية في شهر. هي للتعلم فقط، وليست توقعاً.", "cue": "swings", "tag": "حجم التقلبات"},
            {"say": f"وعلى مدى خمس سنوات، {'ارتفع' if v5 >= 0 else 'انخفض'} حوالي {abs(round(v5))}٪. {'هل تريد مقارنته بالبنوك الأخرى؟' if peers else 'هل تريد مقارنته بالسوق؟'}", "cue": "whole_move_5y", "tag": "خمس سنوات"},
        ]
    return [
        {"say": f"Take a look at the chart on the right. This is {name} over the last six months.", "cue": "show_6m", "tag": "Last 6 months"},
        {"say": f"It started at {price(C[0])} riyals, and today it's {price(C[-1])}. That's {'up' if v6 >= 0 else 'down'} about {abs(round(v6))} percent.", "cue": "whole_move_6m", "tag": "The big picture"},
        {"say": f"Now see this part? It {'fell' if use_drop else 'climbed'} about {abs(round(big_v))} percent in {big_i1 - big_i0} trading days.", "cue": "biggest_drop" if use_drop else "biggest_climb", "tag": "Biggest drop" if use_drop else "Biggest climb"},
        {"say": f"Moves like this often come from {d1[1].lower()} or {d2[1].lower()}. Those matter a lot for {sector['en']}.", "cue": "drivers", "tag": "Why it moves"},
        {"say": "These lines show how big its normal swings are over a month. It's practice, not a prediction.", "cue": "swings", "tag": "Normal swings"},
        {"say": f"Zoom out to five years and it's {'up' if v5 >= 0 else 'down'} about {abs(round(v5))} percent. Want me to compare it with {'other banks' if ticker in SECTORS['banks']['peers'] else 'the market'}?", "cue": "whole_move_5y", "tag": "Five years"},
    ]


# ---------------------------------------------------------------------------
# The brain: AI writes the spoken steps
# ---------------------------------------------------------------------------

BRAIN_RULES = """You are Claire, NUMU's video tutor. You talk out loud to a beginner in Qatar while a chart
on the right side of their screen moves with you. You write what you will SAY, split into short steps.
Each step plays one chart cue while you say it. You can only use cues from the menu you are given.

Make it clear, quick and never boring:
- 4 to 6 steps. Each "say" is 1 or 2 short sentences, at most 26 words. Spoken style, warm, direct.
- Talk to the learner: "see this?", "look at the right", "notice how". One idea per step.
- Teach the story of the chart: WHAT happened, WHERE on the chart, HOW BIG, and WHY things like this
  usually happen, using the drivers you are given.
- Round numbers the way people speak: "about 18 riyals", "about 8 percent". Never read decimals beyond two.
- No lists, markdown, emojis or symbols like % or ×. Write "percent". Say "six months", not "6M".
- Explain any finance word in a few plain words the first time you use it (for example volume, trend).
- Step 1 must point the learner to the chart and use show_6m or show_5y (unless no chart is needed).
- The last step gives a one-line takeaway and invites one short follow-up question.

Hard rules:
- Use only the numbers in the facts. Never invent news, earnings, events or reasons.
- When you explain WHY, use "often", "usually" or "can", based on the drivers list.
- Never predict prices and never tell anyone to buy, sell or hold. If asked, say kindly that you
  can't advise, then teach how to think about it with the chart.
- If you use the swings cue, say clearly it is not a prediction.
- If the question is not about prices or companies, you may use the cue "none" for every step.
- "tag" is a 2 to 4 word label shown on screen for the step, in the learner's language."""

BRAIN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "say": {"type": "string"},
                    "cue": {"type": "string", "enum": CUES},
                    "tag": {"type": "string"},
                },
                "required": ["say", "cue", "tag"],
            },
        }
    },
    "required": ["steps"],
}


def brain_prompt(question: str, ticker: str, language: str, asked: list[str], history: list[dict], topic: str | None) -> str:
    menu = cue_menu(ticker, language, asked)
    context = menu.pop("_context")
    lines = [f"- {k}: {v}" for k, v in menu.items()]
    talk = "\n".join(f"{'Learner' if m.get('role') == 'user' else 'Claire'}: {m.get('content', '')[:300]}" for m in history[-4:])
    language_line = (
        "Write every 'say' and 'tag' in simple Modern Standard Arabic that sounds natural in Qatar. "
        f"Use the Arabic company name: {company_name(ticker, 'ar')}."
        if language == "ar" else "Write in simple English."
    )
    return f"""{language_line}

Company on the chart: {COMPANIES[ticker]['short']} ({load_history(ticker)['name']}), sector: {sector_name(ticker, 'en')}.
{context}
Prices are in Qatari riyals. Data: saved daily prices from StockAnalysis.com, last day {day_label(facts(ticker)['dates'][-1], 'en', long=True)}.

Cue menu (name: what the chart does, with the facts you may say):
{chr(10).join(lines)}

{('Recent conversation:' + chr(10) + talk) if talk else ''}
{('Lesson topic the learner picked: ' + topic) if topic else ''}
Learner's question: {question}"""


def ai_steps(question: str, ticker: str, language: str, asked: list[str], history: list[dict], topic: str | None) -> list[dict]:
    from api.openai_api import get_client  # imported here so the module loads without OpenAI configured
    from config import OPENAI_MODEL

    client = get_client()
    request = dict(
        model=OPENAI_MODEL,
        instructions=BRAIN_RULES,
        input=brain_prompt(question, ticker, language, asked, history, topic),
        text={"format": {"type": "json_schema", "name": "lesson_steps", "schema": BRAIN_SCHEMA, "strict": True}},
        store=False,
    )
    try:
        response = client.responses.create(**request, reasoning={"effort": "low"})
    except Exception:
        response = client.responses.create(**request)
    steps = json.loads(response.output_text)["steps"]
    clean = []
    for step in steps[:7]:
        say = re.sub(r"\s+", " ", str(step.get("say", ""))).strip()
        if not say:
            continue
        cue = step.get("cue") if step.get("cue") in CUES else "none"
        clean.append({"say": say[:400], "cue": cue, "tag": str(step.get("tag", ""))[:40]})
    if not clean:
        raise ValueError("empty lesson")
    return clean


def build_lesson(question: str, language: str = "en", ticker: str | None = None, context_ticker: str | None = None,
                 history: list[dict] | None = None, topic: str | None = None, default_ticker: str = "QNBK") -> dict:
    asked = find_tickers(question)
    chosen = (ticker if ticker in COMPANIES else None) or (asked[0] if asked else None) \
        or (context_ticker if context_ticker in COMPANIES else None) or default_ticker
    if ticker in COMPANIES and ticker not in asked:
        asked = [ticker, *asked]

    source = "ai"
    try:
        steps = ai_steps(question, chosen, language, asked, history or [], topic)
    except Exception as error:  # no key, network, bad JSON: use the ready-made script
        source = f"fallback ({type(error).__name__})"
        steps = fallback_steps(chosen, language, asked)

    played = []
    for step in steps:
        actions = resolve_cue(step["cue"], chosen, language, asked)
        played.append({"say": step["say"], "tag": step["tag"], "cue": step["cue"], "actions": actions})

    uses_chart = any(step["actions"] for step in played)
    return {
        "ticker": chosen,
        "language": language,
        "source": source,
        "chart": chart_pack(chosen, language, asked) if uses_chart else None,
        "steps": played,
    }


def stock_list() -> list[dict]:
    return [{"ticker": t, "short": c["short"], "ar": c["ar"], "name": load_history(t)["name"],
             "sector": SECTORS[c["sector"]]["en"]} for t, c in COMPANIES.items()]
