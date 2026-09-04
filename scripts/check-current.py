#!/usr/bin/env python3
"""One-command validation entry point for the current JEWELRY×JEWELRY build."""
from __future__ import annotations

import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKS = [
    ('バージョン同期', [sys.executable, str(ROOT / 'scripts/version-sync.py'), '--check']),
    ('管理資料整合', [sys.executable, str(ROOT / 'scripts/check-management-docs.py')]),
    ('リポジトリ整理状態', [sys.executable, str(ROOT / 'scripts/check-repository-hygiene.py')]),
    ('回帰防止基準', [sys.executable, str(ROOT / 'scripts/check-regression-baseline.py')]),
    ('季節メイン背景', [sys.executable, str(ROOT / 'scripts/check-seasonal-main-background.py')]),
    ('PWAキャッシュ更新', [sys.executable, str(ROOT / 'scripts/check-pwa-cache-policy.py')]),
    ('遅延ロード管理', [sys.executable, str(ROOT / 'scripts/check-lazy-module-loading.py')]),
    ('終了動画キャッシュ管理', [sys.executable, str(ROOT / 'scripts/check-finished-video-cache-warm.py')]),
    ('冬の体調不良文字効果', [sys.executable, str(ROOT / 'scripts/check-winter-cold-text-effect.py')]),
    ('トースト表示管理', [sys.executable, str(ROOT / 'scripts/check-toast-presenter.py')]),
    ('モーダル表示管理', [sys.executable, str(ROOT / 'scripts/check-modal-presenter.py')]),
    ('自動セーブ状態表示', [sys.executable, str(ROOT / 'scripts/check-autosave-status-presenter.py')]),
    ('クリップボードフォールバック', [sys.executable, str(ROOT / 'scripts/check-clipboard-fallback.py')]),
    ('プレゼント表示ラベル', [sys.executable, str(ROOT / 'scripts/check-gift-labels.py')]),
    ('表面仕上げUI変換', [sys.executable, str(ROOT / 'scripts/check-craft-surface.py')]),
    ('工具説明UI', [sys.executable, str(ROOT / 'scripts/check-tool-brief.py')]),
    ('店舗番号表示ラベル', [sys.executable, str(ROOT / 'scripts/check-store-branch-label.py')]),
    ('表示倍率クランプ', [sys.executable, str(ROOT / 'scripts/check-viewport-clamp.py')]),
    ('食事時間不足メッセージ', [sys.executable, str(ROOT / 'scripts/check-meal-time-message.py')]),
    ('ルースカット表示ラベル', [sys.executable, str(ROOT / 'scripts/check-loose-shape-label.py')]),
    ('原石表示ラベル', [sys.executable, str(ROOT / 'scripts/check-rough-display-name.py')]),
    ('残り時間表示ラベル', [sys.executable, str(ROOT / 'scripts/check-time-remaining-label.py')]),
    ('数量長押し管理', [sys.executable, str(ROOT / 'scripts/check-press-hold-controller.py')]),
    ('Pages公開対象', [sys.executable, str(ROOT / 'scripts/check-pages-publish-policy.py')]),
    ('検索・SEO公開', [sys.executable, str(ROOT / 'scripts/check-seo.py')]),
    ('長期セーブ容量対策', [sys.executable, str(ROOT / 'scripts/check-save-storage-policy.py')]),
    ('長期履歴自動整理', [sys.executable, str(ROOT / 'scripts/check-long-term-history.py')]),
    ('長期不要データ整理', [sys.executable, str(ROOT / 'scripts/check-long-term-misc-cleanup.py')]),
    ('クラウド完全削除', [sys.executable, str(ROOT / 'scripts/check-cloud-delete-policy.py')]),
    ('セーブ容量診断（内部）', [sys.executable, str(ROOT / 'scripts/check-save-diagnostics.py')]),
    ('IndexedDB端末セーブ', [sys.executable, str(ROOT / 'scripts/check-indexeddb-save-policy.py')]),
    ('プレゼント分割セーブ', [sys.executable, str(ROOT / 'scripts/check-gift-chunked-save.py')]),
    ('プレゼント取消モーダル', [sys.executable, str(ROOT / 'scripts/check-gift-cancel-modal.py')]),
    ('未参照クラウドチャンク掃除', [sys.executable, str(ROOT / 'scripts/check-orphan-chunk-cleanup.py')]),
    ('加工知識データ', [sys.executable, str(ROOT / 'scripts/check-processing-knowledge.py')]),
    ('地金相場フォールバック', [sys.executable, str(ROOT / 'scripts/check-metal-market-fallback.py')]),
    ('ショーケース画像', [sys.executable, str(ROOT / 'scripts/check-showcase-jewelry-visuals.py')]),
    ('完成画面縦余白', [sys.executable, str(ROOT / 'scripts/check-completion-portrait-header-clearance.py')]),
    ('見習い映画館中央配置', [sys.executable, str(ROOT / 'scripts/check-apprentice-cinema-center.py')]),
    ('エメラルド班班長報酬タップ', [sys.executable, str(ROOT / 'scripts/check-emerald-captain-reward-tap.py')]),
    ('イベント構造整合', [sys.executable, str(ROOT / 'scripts/check-event-integrity.py')]),
    ('イベント保存往復', [sys.executable, str(ROOT / 'scripts/check-event-save-roundtrip.py')]),
    ('食事・クイズ復旧', [sys.executable, str(ROOT / 'scripts/check-meal-quiz-recovery.py')]),
    ('御徒町夜背景', [sys.executable, str(ROOT / 'scripts/check-okachimachi-night-background.py')]),
    ('起動診断', [sys.executable, str(ROOT / 'scripts/check-startup-diagnostics.py')]),
    ('水槽正本・再設置', [sys.executable, str(ROOT / 'scripts/check-aquarium-runtime.py')]),
    ('水槽死亡率・おやつ発生率', [sys.executable, str(ROOT / 'scripts/check-aquarium-mortality-rate.py')]),
    ('水槽縦画面中央配置', [sys.executable, str(ROOT / 'scripts/check-aquarium-portrait-center.py')]),
    ('熱帯魚屋カテゴリ導線', [sys.executable, str(ROOT / 'scripts/check-tropical-shop-navigation.py')]),
    ('ストーリーテラーV2レイアウト', [sys.executable, str(ROOT / 'scripts/check-storyteller-v2-layout.py')]),
    ('終了時セーブ一本化', [sys.executable, str(ROOT / 'scripts/check-lifecycle-save-policy.py')]),
    ('互換DOM監視軽量化', [sys.executable, str(ROOT / 'scripts/check-hosting-guard-policy.py')]),
    ('Firebase App Check準備', [sys.executable, str(ROOT / 'scripts/check-app-check-readiness.py')]),
    ('実ブラウザ主要導線', [sys.executable, str(ROOT / 'scripts/check-browser-smoke.py')]),
]

def run_check(item):
    label, command = item
    try:
        proc = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=90)
        return label, proc.returncode, proc.stdout, proc.stderr, False
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or '')
        stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or '')
        return label, 124, stdout, stderr, True


# 各checkは現行ファイルを読む独立検査。全件を省略せず、最大4本まで並列実行して
# 総合監査そのものが長時間化し過ぎないようにする。JXJ_CHECK_WORKERS=1で逐次実行も可能。
try:
    worker_count = int(os.environ.get('JXJ_CHECK_WORKERS', '4'))
except ValueError:
    worker_count = 4
worker_count = max(1, min(4, worker_count, len(CHECKS)))
results = {}
with ThreadPoolExecutor(max_workers=worker_count) as executor:
    futures = {executor.submit(run_check, item): item[0] for item in CHECKS}
    for future in as_completed(futures):
        label, returncode, stdout, stderr, timed_out = future.result()
        results[label] = (returncode, stdout, stderr, timed_out)

failed = []
for label, _command in CHECKS:
    print(f'\n===== {label} =====', flush=True)
    returncode, stdout, stderr, timed_out = results[label]
    if stdout:
        print(stdout, end='' if stdout.endswith('\n') else '\n', flush=True)
    if stderr:
        print(stderr, end='' if stderr.endswith('\n') else '\n', file=sys.stderr, flush=True)
    if timed_out:
        print(f'NG: {label} が90秒以内に完了しませんでした。', flush=True)
        failed.append(f'{label}（タイムアウト）')
    elif returncode != 0:
        failed.append(label)

if failed:
    print('\nCURRENT BUILD AUDIT: FAIL', flush=True)
    for label in failed:
        print(f'- {label}', flush=True)
    sys.exit(1)

print('\nCURRENT BUILD AUDIT: PASS', flush=True)
print(f'現行仕様の自動検査をすべて通過しました。（並列数: {worker_count}）', flush=True)
