#!/usr/bin/env python3
from pathlib import Path

app = Path("js/app.js").read_text(encoding="utf-8")
workflow = Path(".github/workflows/update-metals.yml").read_text(encoding="utf-8")
updater = Path("scripts/update-metals.py").read_text(encoding="utf-8")

required = {
    "stale prices remain tradeable": "return metalMarketTimestampMs() > 0;",
    "old cache remains usable": "if (!Number.isFinite(cachedTimestamp)) return false;",
    "stale UI says last price trading": "最終取得価格で売買中",
    "push skips Metals.Dev": "if: github.event_name != 'push'",
    "HTTP diagnostics": "Metals.DevがHTTP {error.code}を返しました{detail}",
}
for label, needle in required.items():
    haystack = app if label in {"stale prices remain tradeable", "old cache remains usable", "stale UI says last price trading"} else workflow if label == "push skips Metals.Dev" else updater
    if needle not in haystack:
        raise SystemExit(f"FAIL: {label}")

for forbidden in ("Date.now() - timestamp <= METAL_MARKET_TRADE_MAX_AGE_MS", "価格が古いため売買停止中"):
    if forbidden in app:
        raise SystemExit(f"FAIL: obsolete stale trade block remains: {forbidden}")

print("METAL MARKET FALLBACK CHECK: PASS")
