#!/usr/bin/env python3
"""Metals.Devから相場を取得し、ゲーム用の地金価格JSONを安全に更新する。"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import NoReturn
from zoneinfo import ZoneInfo

API_ENDPOINT = "https://api.metals.dev/v1/latest"
OUTPUT_PATH = Path("data/metals.json")
JST = ZoneInfo("Asia/Tokyo")
HISTORY_YEARS = 5

ALLOYS = {
    "K18": {
        "baseMetal": "gold",
        "purity": Decimal("0.75"),
        "purchaseMultiplier": Decimal("1.15"),
        "sellMultiplier": Decimal("0.98"),
        "roundingYenPerGram": 10,
    },
    "Pt900": {
        "baseMetal": "platinum",
        "purity": Decimal("0.90"),
        "purchaseMultiplier": Decimal("1.15"),
        "sellMultiplier": Decimal("0.94"),
        "roundingYenPerGram": 10,
    },
    "SV925": {
        "baseMetal": "silver",
        "purity": Decimal("0.925"),
        "purchaseMultiplier": Decimal("1.30"),
        "sellMultiplier": Decimal("0.90"),
        "roundingYenPerGram": 1,
    },
}

GAME_PRODUCTS = {
    "gold": {"alloy": "K18", "grams": 1},
    "platinum": {"alloy": "Pt900", "grams": 1},
    "silver": {"alloy": "SV925", "grams": 1},
}


def fail(message: str) -> NoReturn:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def positive_decimal(value: object, label: str) -> Decimal:
    try:
        number = Decimal(str(value))
    except Exception:
        fail(f"{label}が数値ではありません。")
    if not number.is_finite() or number <= 0:
        fail(f"{label}が正の有限値ではありません。")
    return number


def round_to_yen_unit(value: Decimal, unit: int) -> int:
    rounding_unit = Decimal(str(unit))
    return int((value / rounding_unit).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * rounding_unit)


def fetch_latest(api_key: str) -> dict:
    query = urllib.parse.urlencode({"api_key": api_key, "currency": "JPY", "unit": "g"})
    request = urllib.request.Request(
        f"{API_ENDPOINT}?{query}",
        headers={"Accept": "application/json", "User-Agent": "JEWELRYxJEWELRY-metal-updater/1.2"},
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            if response.status != 200:
                fail(f"Metals.DevがHTTP {response.status}を返しました。")
            return json.load(response)
    except SystemExit:
        raise
    except Exception:
        # URLやAPIキーをログへ出さない。
        fail("Metals.Devへの接続または応答の読み取りに失敗しました。")


def read_existing_output(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def parse_iso_date_jst(value: object) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    if len(text) == 10 and text[4] == "-" and text[7] == "-":
        try:
            return datetime.strptime(text, "%Y-%m-%d").date().isoformat()
        except ValueError:
            return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(JST).date().isoformat()


def valid_spot_map(value: object) -> dict[str, Decimal] | None:
    if not isinstance(value, dict):
        return None
    result: dict[str, Decimal] = {}
    for metal in ("gold", "silver", "platinum"):
        try:
            number = Decimal(str(value.get(metal)))
        except Exception:
            return None
        if not number.is_finite() or number <= 0:
            return None
        result[metal] = number
    return result


def previous_day_context(existing: dict, today_jst: str) -> tuple[str | None, dict[str, Decimal] | None]:
    existing_spot = valid_spot_map(existing.get("spotPerGram"))
    existing_date = parse_iso_date_jst(existing.get("marketDateJst")) or parse_iso_date_jst(existing.get("updatedAt"))

    # 日付が変わった最初の更新では、直前に保存されていた相場を比較対象へ移す。
    if existing.get("status") == "live" and existing_spot and existing_date and existing_date < today_jst:
        return existing_date, existing_spot

    # 同じ日の2回目以降の更新では、朝に確定した前日データを維持する。
    previous_spot = valid_spot_map(existing.get("previousSpotPerGram"))
    previous_date = parse_iso_date_jst(existing.get("previousMarketDateJst"))
    if previous_spot and previous_date and previous_date < today_jst:
        return previous_date, previous_spot

    return None, None


def five_year_cutoff(today: date) -> date:
    """当日からおおむね5年前。うるう日も安全に処理する。"""
    try:
        return today.replace(year=today.year - HISTORY_YEARS)
    except ValueError:
        return today.replace(year=today.year - HISTORY_YEARS, day=28)


def normalized_history(existing: dict, today_jst: str, spot: dict[str, Decimal]) -> list[dict]:
    """既存の日次履歴へ本日の最新値を上書きし、5年間だけ保持する。"""
    today = datetime.strptime(today_jst, "%Y-%m-%d").date()
    cutoff = five_year_cutoff(today)
    by_date: dict[str, dict] = {}

    raw_history = existing.get("historyDaily")
    if isinstance(raw_history, list):
        for item in raw_history:
            if not isinstance(item, dict):
                continue
            item_date_text = parse_iso_date_jst(item.get("date"))
            item_spot = valid_spot_map(item.get("spotPerGram"))
            if not item_date_text or not item_spot:
                continue
            item_date = datetime.strptime(item_date_text, "%Y-%m-%d").date()
            if cutoff <= item_date <= today:
                by_date[item_date_text] = {
                    "date": item_date_text,
                    "spotPerGram": {key: float(value) for key, value in item_spot.items()},
                }

    # 同日に2回更新する場合は、午後の値でその日の記録を更新する。
    by_date[today_jst] = {
        "date": today_jst,
        "spotPerGram": {key: float(value) for key, value in spot.items()},
    }
    return [by_date[key] for key in sorted(by_date)]


def build_output(payload: dict, existing: dict | None = None, now: datetime | None = None) -> dict:
    if payload.get("status") != "success":
        code = payload.get("error_code", "unknown")
        fail(f"Metals.Dev APIが失敗を返しました（error_code={code}）。")

    metals = payload.get("metals") or {}
    spot = {
        "gold": positive_decimal(metals.get("gold"), "gold"),
        "silver": positive_decimal(metals.get("silver"), "silver"),
        "platinum": positive_decimal(metals.get("platinum"), "platinum"),
    }

    # 明らかな単位・通貨誤りや異常値を拒否し、既存の正常JSONを守る。
    reasonable_ranges = {
        "gold": (Decimal("1000"), Decimal("1000000")),
        "silver": (Decimal("1"), Decimal("100000")),
        "platinum": (Decimal("100"), Decimal("1000000")),
    }
    for metal, value in spot.items():
        low, high = reasonable_ranges[metal]
        if value < low or value > high:
            fail(f"{metal}の価格が検証範囲外です。通貨または単位を確認してください。")

    purchase_per_gram: dict[str, int] = {}
    sell_per_gram: dict[str, int] = {}
    calculation: dict[str, dict] = {}
    for alloy, config in ALLOYS.items():
        base = config["baseMetal"]
        rounding_unit = int(config["roundingYenPerGram"])
        purchase_value = spot[base] * config["purity"] * config["purchaseMultiplier"]
        sell_value = spot[base] * config["purity"] * config["sellMultiplier"]
        purchase_per_gram[alloy] = round_to_yen_unit(purchase_value, rounding_unit)
        sell_per_gram[alloy] = round_to_yen_unit(sell_value, rounding_unit)
        if sell_per_gram[alloy] >= purchase_per_gram[alloy]:
            fail(f"{alloy}の売却価格が購入価格以上になっています。係数を確認してください。")
        calculation[alloy] = {
            "baseMetal": base,
            "purity": float(config["purity"]),
            "purchaseMultiplier": float(config["purchaseMultiplier"]),
            "sellMultiplier": float(config["sellMultiplier"]),
            "roundingYenPerGram": rounding_unit,
        }

    purchase_prices = {
        product_id: {
            "alloy": product["alloy"],
            "grams": product["grams"],
            "price": purchase_per_gram[product["alloy"]] * product["grams"],
        }
        for product_id, product in GAME_PRODUCTS.items()
    }
    sell_prices = {
        product_id: {
            "alloy": product["alloy"],
            "grams": product["grams"],
            "price": sell_per_gram[product["alloy"]] * product["grams"],
        }
        for product_id, product in GAME_PRODUCTS.items()
    }

    now_utc = now or datetime.now(timezone.utc)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)
    now_utc = now_utc.astimezone(timezone.utc)
    today_jst = now_utc.astimezone(JST).date().isoformat()
    existing_value = existing or {}
    previous_date, previous_spot = previous_day_context(existing_value, today_jst)
    changes = {
        metal: float(spot[metal] - previous_spot[metal]) if previous_spot else None
        for metal in ("gold", "silver", "platinum")
    }
    history_daily = normalized_history(existing_value, today_jst, spot)

    market_timestamp = (
        (payload.get("timestamps") or {}).get("metal")
        or payload.get("timestamp")
        or now_utc.isoformat().replace("+00:00", "Z")
    )
    updated_at = now_utc.replace(microsecond=0).isoformat().replace("+00:00", "Z")

    return {
        "schemaVersion": 4,
        "status": "live",
        "source": {"name": "Metals.Dev", "endpoint": "latest", "currency": "JPY", "unit": "g"},
        "marketTimestamp": market_timestamp,
        "updatedAt": updated_at,
        "marketDateJst": today_jst,
        "previousMarketDateJst": previous_date,
        "spotPerGram": {key: float(value) for key, value in spot.items()},
        "previousSpotPerGram": {key: float(value) for key, value in previous_spot.items()} if previous_spot else None,
        "changeFromPreviousDayPerGram": changes,
        "historyRetentionYears": HISTORY_YEARS,
        "historyDaily": history_daily,
        # gamePricesPerGramは旧版互換のため購入価格を残す。
        "gamePricesPerGram": purchase_per_gram,
        "gamePurchasePricesPerGram": purchase_per_gram,
        "gameSellPricesPerGram": sell_per_gram,
        "gamePurchasePrices": purchase_prices,
        "gameSellPrices": sell_prices,
        "calculation": calculation,
    }


def atomic_write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as temp:
        temp.write(content)
        temp_path = Path(temp.name)
    temp_path.replace(path)


def main() -> None:
    api_key = os.environ.get("METALS_DEV_API_KEY", "").strip()
    if not api_key:
        fail("GitHub Secret『METALS_DEV_API_KEY』が設定されていません。")
    existing = read_existing_output(OUTPUT_PATH)
    payload = fetch_latest(api_key)
    output = build_output(payload, existing=existing)
    atomic_write_json(OUTPUT_PATH, output)
    print(f"地金相場を更新しました: {output['updatedAt']} / 履歴{len(output['historyDaily'])}日分")


if __name__ == "__main__":
    main()
