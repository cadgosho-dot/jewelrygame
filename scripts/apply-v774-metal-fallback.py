#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = "0.10.773"
NEW_VERSION = "0.10.774"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


app_path = Path("js/app.js")
app = app_path.read_text(encoding="utf-8")

app = replace_once(
    app,
    "const METAL_MARKET_TRADE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;",
    "const METAL_MARKET_STALE_NOTICE_MS = 72 * 60 * 60 * 1000;",
    "metal stale constant",
)

app = replace_once(
    app,
    """function metalMarketTradeReady() {
  if (!['live', 'cached'].includes(metalMarket.status)) return false;
  const purchase = metalMarket.purchasePerGramByMetalId || {};
  const sell = metalMarket.sellPerGramByMetalId || {};
  if (!['silver', 'gold', 'platinum'].every((id) => validPositivePrice(purchase[id]) && validPositivePrice(sell[id]))) return false;
  const timestamp = metalMarketTimestampMs();
  if (!timestamp) return false;
  return Date.now() - timestamp <= METAL_MARKET_TRADE_MAX_AGE_MS;
}
""",
    """function metalMarketTradeReady() {
  if (!['live', 'cached'].includes(metalMarket.status)) return false;
  const purchase = metalMarket.purchasePerGramByMetalId || {};
  const sell = metalMarket.sellPerGramByMetalId || {};
  if (!['silver', 'gold', 'platinum'].every((id) => validPositivePrice(purchase[id]) && validPositivePrice(sell[id]))) return false;
  // 最終正常取得値は、経過日数だけを理由に売買停止しない。
  // 価格形式と取得日時が正常な「最後に検証済みの相場」であることだけを必須とする。
  return metalMarketTimestampMs() > 0;
}
""",
    "metal trade readiness",
)

app = replace_once(
    app,
    """  const cachedTimestamp = new Date(cached.data.updatedAt || cached.data.marketTimestamp || cached.savedAt || '').getTime();
  if (!Number.isFinite(cachedTimestamp) || Date.now() - cachedTimestamp > METAL_MARKET_TRADE_MAX_AGE_MS) return false;
""",
    """  const cachedTimestamp = new Date(cached.data.updatedAt || cached.data.marketTimestamp || cached.savedAt || '').getTime();
  // オフラインやAPI停止が長期化しても、最後に検証済みの正常キャッシュを利用できるようにする。
  if (!Number.isFinite(cachedTimestamp)) return false;
""",
    "cached market age gate",
)

app = replace_once(
    app,
    """function metalMarketIsStale() {
  const date = new Date(metalMarket.updatedAt || metalMarket.marketTimestamp || '');
  return Number.isFinite(date.getTime()) && Date.now() - date.getTime() > 72 * 60 * 60 * 1000;
}
""",
    """function metalMarketIsStale() {
  const date = new Date(metalMarket.updatedAt || metalMarket.marketTimestamp || '');
  return Number.isFinite(date.getTime()) && Date.now() - date.getTime() > METAL_MARKET_STALE_NOTICE_MS;
}
""",
    "metal stale display",
)

app = replace_once(
    app,
    """  const stale = metalMarketIsStale();
  const tradeReady = metalMarketTradeReady();
  const title = metalMarket.status === 'cached' || stale ? '前回取得した地金相場' : '現実の地金相場と連動してます';
  const caution = tradeReady ? '' : '　価格が古いため売買停止中';
  return `<div class=\"metal-market-summary ${stale || !tradeReady ? 'stale' : ''}\"><strong>${title}</strong><small>最終更新：${esc(timestamp)}　取得元：${esc(metalMarket.sourceName)}${caution}</small></div>`;
""",
    """  const stale = metalMarketIsStale();
  const tradeReady = metalMarketTradeReady();
  const title = metalMarket.status === 'cached' || stale ? '前回取得した地金相場' : '現実の地金相場と連動してます';
  const caution = !tradeReady ? '　価格情報が不完全なため売買停止中' : stale ? '　最終取得価格で売買中' : '';
  return `<div class=\"metal-market-summary ${stale || !tradeReady ? 'stale' : ''}\"><strong>${title}</strong><small>最終更新：${esc(timestamp)}　取得元：${esc(metalMarket.sourceName)}${caution}</small></div>`;
""",
    "metal market summary",
)

app_path.write_text(app, encoding="utf-8")

workflow_path = Path(".github/workflows/update-metals.yml")
workflow = workflow_path.read_text(encoding="utf-8")
workflow = replace_once(
    workflow,
    """      - name: Metals.Devから価格を取得して計算
        env:
""",
    """      - name: Metals.Devから価格を取得して計算
        # ゲーム本体のpushではAPI枠を消費しない。定期実行・手動実行時だけ取得する。
        if: github.event_name != 'push'
        env:
""",
    "skip Metals.Dev on push",
)
workflow_path.write_text(workflow, encoding="utf-8")

updater_path = Path("scripts/update-metals.py")
updater = updater_path.read_text(encoding="utf-8")
updater = replace_once(
    updater,
    "import urllib.parse\nimport urllib.request\n",
    "import urllib.error\nimport urllib.parse\nimport urllib.request\n",
    "urllib error import",
)
updater = replace_once(
    updater,
    """    except SystemExit:
        raise
    except Exception:
        # URLやAPIキーをログへ出さない。
        fail(\"Metals.Devへの接続または応答の読み取りに失敗しました。\")
""",
    """    except urllib.error.HTTPError as error:
        # APIキーやリクエストURLはログへ出さず、原因判別に必要なHTTP状態とerror_codeだけを残す。
        api_error_code = None
        try:
            error_payload = json.loads(error.read().decode(\"utf-8\", errors=\"replace\"))
            if isinstance(error_payload, dict):
                api_error_code = error_payload.get(\"error_code\") or error_payload.get(\"code\")
        except Exception:
            api_error_code = None
        detail = f\" / error_code={api_error_code}\" if api_error_code else \"\"
        fail(f\"Metals.DevがHTTP {error.code}を返しました{detail}。\")
    except SystemExit:
        raise
    except Exception:
        # URLやAPIキーをログへ出さない。
        fail(\"Metals.Devへの接続または応答の読み取りに失敗しました。\")
""",
    "Metals.Dev HTTP diagnostics",
)
updater_path.write_text(updater, encoding="utf-8")

# Cache busting / displayed version. Only runtime and validation source files are updated;
# historical Markdown/TXT handoff documents are intentionally left untouched.
allowed_suffixes = {".js", ".html", ".py", ".yml", ".yaml"}
changed_version_files = []
for path in Path(".").rglob("*"):
    if not path.is_file() or ".git" in path.parts:
        continue
    if path.name != "VERSION" and path.suffix.lower() not in allowed_suffixes:
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    if OLD_VERSION not in text:
        continue
    path.write_text(text.replace(OLD_VERSION, NEW_VERSION), encoding="utf-8")
    changed_version_files.append(str(path))

Path("VERSION").write_text(NEW_VERSION + "\n", encoding="utf-8")

# Permanent static regression check for this policy.
check_path = Path("scripts/check-metal-market-fallback.py")
check_path.write_text(
    '''#!/usr/bin/env python3
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
''',
    encoding="utf-8",
)

print("Applied v0.10.774 metal fallback policy")
print("Version-updated runtime/test files:")
for item in changed_version_files:
    print(" -", item)
