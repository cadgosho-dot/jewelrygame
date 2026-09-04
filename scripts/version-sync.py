#!/usr/bin/env python3
"""Synchronize JEWELRY×JEWELRY's active build version from one source of truth.

Usage:
  python3 scripts/version-sync.py --check
  python3 scripts/version-sync.py --set 0.10.760
  python3 scripts/version-sync.py --bump-patch

The canonical version is stored in the repository-root VERSION file.  Only active
build-version references are touched; historical version comments and legacy
asset filenames are intentionally left unchanged.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / 'VERSION'
VERSION_RE = re.compile(r'^0\.10\.(\d+)$')


@dataclass(frozen=True)
class Rule:
    path: str
    label: str
    pattern: re.Pattern[str]
    replacement: Callable[[re.Match[str], str], str]
    expected_count: int = 1


def qparam(resource_re: str) -> re.Pattern[str]:
    return re.compile(rf'(?P<prefix>{resource_re}\?v=)0\.10\.\d+')


def keep_prefix(match: re.Match[str], version: str) -> str:
    return f"{match.group('prefix')}{version}"


def quoted_constant(name: str) -> re.Pattern[str]:
    return re.compile(rf"(?P<prefix>\b{re.escape(name)}\s*=\s*['\"])0\.10\.\d+(?P<suffix>['\"])")


def export_constant(name: str) -> re.Pattern[str]:
    return re.compile(rf"(?P<prefix>\bexport\s+const\s+{re.escape(name)}\s*=\s*['\"])0\.10\.\d+(?P<suffix>['\"])")


def keep_quote(match: re.Match[str], version: str) -> str:
    return f"{match.group('prefix')}{version}{match.group('suffix')}"


RULES = [
    # game.html shell
    Rule('game.html', 'PWA recovery cache key', qparam(r'\./auth-cache-recovery\.js'), keep_prefix),
    Rule('game.html', 'hosting-origin-guard cache key', qparam(r'\./hosting-origin-guard\.js'), keep_prefix),
    Rule('game.html', 'styles.css cache key', qparam(r'\./styles\.css'), keep_prefix),
    Rule('game.html', 'quiz-event-v2.css cache key', qparam(r'\./quiz-event-v2\.css'), keep_prefix),
    Rule('game.html', 'app.js cache key', qparam(r'\./js/app\.js'), keep_prefix),
    Rule('game.html', 'memories-screen.js cache key', qparam(r'\./js/memories-screen\.js'), keep_prefix),

    # outer shell
    Rule('index.html', 'PWA recovery cache key', qparam(r'\./auth-cache-recovery\.js'), keep_prefix),
    Rule('index.html', 'hosting-origin-guard cache key', qparam(r'\./hosting-origin-guard\.js'), keep_prefix),
    Rule('index.html', 'viewport-shell.css cache key', qparam(r'\./viewport-shell\.css'), keep_prefix),
    Rule('index.html', 'game.html cache key', qparam(r'\./game\.html'), keep_prefix),
    Rule('index.html', 'viewport-shell.js cache key', qparam(r'\./viewport-shell\.js'), keep_prefix),

    # service worker
    Rule('sw.js', 'Service Worker VERSION', quoted_constant('VERSION'), keep_quote),
    Rule('sw.js', 'PWA recovery precache key', qparam(r'\./auth-cache-recovery\.js'), keep_prefix),
    Rule('sw.js', 'quiz-event-v2.css precache key', qparam(r'\./quiz-event-v2\.css'), keep_prefix),
    Rule('sw.js', 'app.js precache key', qparam(r'\./js/app\.js'), keep_prefix),
    Rule('sw.js', 'lazy-modules.js precache key', qparam(r'\./js/runtime/lazy-modules\.js'), keep_prefix),
    Rule('sw.js', 'finished-video-cache-warm.js precache key', qparam(r'\./js/runtime/finished-video-cache-warm\.js'), keep_prefix),
    Rule('sw.js', 'winter-cold-text-effect.js precache key', qparam(r'\./js/ui/winter-cold-text-effect\.js'), keep_prefix),
    Rule('sw.js', 'toast-presenter.js precache key', qparam(r'\./js/ui/toast-presenter\.js'), keep_prefix),
    Rule('sw.js', 'modal-presenter.js precache key', qparam(r'\./js/ui/modal-presenter\.js'), keep_prefix),
    Rule('sw.js', 'autosave-status-presenter.js precache key', qparam(r'\./js/ui/autosave-status-presenter\.js'), keep_prefix),
    Rule('sw.js', 'clipboard-fallback.js precache key', qparam(r'\./js/ui/clipboard-fallback\.js'), keep_prefix),
    Rule('sw.js', 'gift-labels.js precache key', qparam(r'\./js/ui/gift-labels\.js'), keep_prefix),
    Rule('sw.js', 'craft-surface.js precache key', qparam(r'\./js/ui/craft-surface\.js'), keep_prefix),
    Rule('sw.js', 'tool-brief.js precache key', qparam(r'\./js/ui/tool-brief\.js'), keep_prefix),
    Rule('sw.js', 'store-branch-label.js precache key', qparam(r'\./js/ui/store-branch-label\.js'), keep_prefix),
    Rule('sw.js', 'viewport-clamp.js precache key', qparam(r'\./js/ui/viewport-clamp\.js'), keep_prefix),
    Rule('sw.js', 'meal-time-message.js precache key', qparam(r'\./js/ui/meal-time-message\.js'), keep_prefix),
    Rule('sw.js', 'loose-shape-label.js precache key', qparam(r'\./js/ui/loose-shape-label\.js'), keep_prefix),
    Rule('sw.js', 'rough-display-name.js precache key', qparam(r'\./js/ui/rough-display-name\.js'), keep_prefix),
    Rule('sw.js', 'time-remaining-label.js precache key', qparam(r'\./js/ui/time-remaining-label\.js'), keep_prefix),
    Rule('sw.js', 'workshop-staff-quality-description.js precache key', qparam(r'\./js/ui/workshop-staff-quality-description\.js'), keep_prefix),
    Rule('sw.js', 'workshop-loose-display-name.js precache key', qparam(r'\./js/ui/workshop-loose-display-name\.js'), keep_prefix),
    Rule('sw.js', 'metal-market-date-label.js precache key', qparam(r'\./js/ui/metal-market-date-label\.js'), keep_prefix),
    Rule('sw.js', 'metal-price-date-label.js precache key', qparam(r'\./js/ui/metal-price-date-label\.js'), keep_prefix),
    Rule('sw.js', 'phone-item-effect-text.js precache key', qparam(r'\./js/ui/phone-item-effect-text\.js'), keep_prefix),
    Rule('sw.js', 'save-diagnostic-date-label.js precache key', qparam(r'\./js/ui/save-diagnostic-date-label\.js'), keep_prefix),
    Rule('sw.js', 'save-diagnostic-bytes-label.js precache key', qparam(r'\./js/ui/save-diagnostic-bytes-label\.js'), keep_prefix),
    Rule('sw.js', 'metal-weight-label.js precache key', qparam(r'\./js/ui/metal-weight-label\.js'), keep_prefix),
    Rule('sw.js', 'press-hold-controller.js precache key', qparam(r'\./js/ui/press-hold-controller\.js'), keep_prefix),
    Rule('sw.js', 'audio.js precache key', qparam(r'\./js/audio\.js'), keep_prefix),
    Rule('sw.js', 'audio-scene-map.js precache key', qparam(r'\./js/audio-scene-map\.js'), keep_prefix),
    Rule('sw.js', 'game-data.js precache key', qparam(r'\./js/game-data\.js'), keep_prefix),
    Rule('sw.js', 'memories-screen.js precache key', qparam(r'\./js/memories-screen\.js'), keep_prefix),
    Rule('sw.js', 'memories-backgrounds.js precache key', qparam(r'\./js/memories-backgrounds\.js'), keep_prefix),
    Rule('sw.js', 'daily-gems-index.js precache key', qparam(r'\./js/daily-gems-index\.js'), keep_prefix),
    Rule('sw.js', 'google-auth-bridge.js precache key', qparam(r'\./js/google-auth-bridge\.js'), keep_prefix),
    Rule('sw.js', 'firebase-service.js precache key', qparam(r'\./js/firebase-service\.js'), keep_prefix),
    Rule('sw.js', 'local-save-storage.js precache key', qparam(r'\./js/local-save-storage\.js'), keep_prefix),

    # auth shell
    Rule('auth.html', 'PWA recovery cache key', qparam(r'\./auth-cache-recovery\.js'), keep_prefix),
    Rule('auth.html', 'google-auth-bridge.js cache key', qparam(r'\./js/google-auth-bridge\.js'), keep_prefix),

    # compatibility loaders
    Rule('hosting-origin-guard.js', 'memories override cache key', qparam(r'\./memories-event-image-overrides-v751\.js'), keep_prefix),
    Rule('hosting-origin-guard.js', 'workshop staff cache key', qparam(r'\./workshop-staff-images-v754\.js'), keep_prefix),
    Rule('auth-cache-recovery.js', 'Service Worker recovery build version', quoted_constant('BUILD_VERSION'), keep_quote),

    # main modules
    Rule('js/app.js', 'game-data.js import key', qparam(r'\./game-data\.js'), keep_prefix),
    Rule('js/app.js', 'UI build version', quoted_constant('UI_BUILD_VERSION'), keep_quote),
    Rule('js/app.js', 'audio.js import key', qparam(r'\./audio\.js'), keep_prefix),
    Rule('js/app.js', 'audio-scene-map.js import key', qparam(r'\./audio-scene-map\.js'), keep_prefix),
    Rule('js/app.js', 'daily-gems-index.js import key', qparam(r'\./daily-gems-index\.js'), keep_prefix),
    Rule('js/app.js', 'firebase-service.js import key', qparam(r'\./firebase-service\.js'), keep_prefix),
    Rule('js/app.js', 'local-save-storage.js import key', qparam(r'\./local-save-storage\.js'), keep_prefix),
    Rule('js/app.js', 'lazy-modules.js import key', qparam(r'\./runtime/lazy-modules\.js'), keep_prefix),
    Rule('js/app.js', 'finished-video-cache-warm.js import key', qparam(r'\./runtime/finished-video-cache-warm\.js'), keep_prefix),
    Rule('js/app.js', 'winter-cold-text-effect.js import key', qparam(r'\./ui/winter-cold-text-effect\.js'), keep_prefix),
    Rule('js/app.js', 'toast-presenter.js import key', qparam(r'\./ui/toast-presenter\.js'), keep_prefix),
    Rule('js/app.js', 'modal-presenter.js import key', qparam(r'\./ui/modal-presenter\.js'), keep_prefix),
    Rule('js/app.js', 'autosave-status-presenter.js import key', qparam(r'\./ui/autosave-status-presenter\.js'), keep_prefix),
    Rule('js/app.js', 'clipboard-fallback.js import key', qparam(r'\./ui/clipboard-fallback\.js'), keep_prefix),
    Rule('js/app.js', 'gift-labels.js import key', qparam(r'\./ui/gift-labels\.js'), keep_prefix),
    Rule('js/app.js', 'craft-surface.js import key', qparam(r'\./ui/craft-surface\.js'), keep_prefix),
    Rule('js/app.js', 'tool-brief.js import key', qparam(r'\./ui/tool-brief\.js'), keep_prefix),
    Rule('js/app.js', 'store-branch-label.js import key', qparam(r'\./ui/store-branch-label\.js'), keep_prefix),
    Rule('js/app.js', 'viewport-clamp.js import key', qparam(r'\./ui/viewport-clamp\.js'), keep_prefix),
    Rule('js/app.js', 'meal-time-message.js import key', qparam(r'\./ui/meal-time-message\.js'), keep_prefix),
    Rule('js/app.js', 'loose-shape-label.js import key', qparam(r'\./ui/loose-shape-label\.js'), keep_prefix),
    Rule('js/app.js', 'rough-display-name.js import key', qparam(r'\./ui/rough-display-name\.js'), keep_prefix),
    Rule('js/app.js', 'time-remaining-label.js import key', qparam(r'\./ui/time-remaining-label\.js'), keep_prefix),
    Rule('js/app.js', 'workshop-staff-quality-description.js import key', qparam(r'\./ui/workshop-staff-quality-description\.js'), keep_prefix),
    Rule('js/app.js', 'workshop-loose-display-name.js import key', qparam(r'\./ui/workshop-loose-display-name\.js'), keep_prefix),
    Rule('js/app.js', 'metal-market-date-label.js import key', qparam(r'\./ui/metal-market-date-label\.js'), keep_prefix),
    Rule('js/app.js', 'metal-price-date-label.js import key', qparam(r'\./ui/metal-price-date-label\.js'), keep_prefix),
    Rule('js/app.js', 'phone-item-effect-text.js import key', qparam(r'\./ui/phone-item-effect-text\.js'), keep_prefix),
    Rule('js/app.js', 'save-diagnostic-date-label.js import key', qparam(r'\./ui/save-diagnostic-date-label\.js'), keep_prefix),
    Rule('js/app.js', 'save-diagnostic-bytes-label.js import key', qparam(r'\./ui/save-diagnostic-bytes-label\.js'), keep_prefix),
    Rule('js/app.js', 'metal-weight-label.js import key', qparam(r'\./ui/metal-weight-label\.js'), keep_prefix),
    Rule('js/app.js', 'press-hold-controller.js import key', qparam(r'\./ui/press-hold-controller\.js'), keep_prefix),
    Rule('js/firebase-service.js', 'local-save-storage.js import key', qparam(r'\./local-save-storage\.js'), keep_prefix),
    Rule('js/audio.js', 'audio-scene-map.js import key', qparam(r'\./audio-scene-map\.js'), keep_prefix),
    Rule('js/game-data.js', 'game data VERSION', export_constant('VERSION'), keep_quote),
    Rule('js/game-data-core.js', 'game data core VERSION', export_constant('VERSION'), keep_quote),
    Rule('js/memories-screen.js', 'memories-backgrounds import key', qparam(r'\./memories-backgrounds\.js'), keep_prefix),
    Rule('js/memories-screen.js', 'memories VERSION', quoted_constant('VERSION'), keep_quote),

    # current management documents; historical archive files are intentionally excluded
    Rule('README.md', 'README current version', re.compile(r'(?P<prefix>現在の開発基準は、リポジトリ直下 `VERSION` に記録された \*\*v)0\.10\.\d+(?P<suffix>\*\*)'), keep_quote),
    Rule('CHANGELOG.md', 'CHANGELOG current version', re.compile(r'(?P<prefix>現行基準: \*\*v)0\.10\.\d+(?P<suffix>\*\*)'), keep_quote),
    Rule('GAME_RULES.md', 'GAME_RULES current version', re.compile(r'(?P<prefix>現行実装基準: \*\*v)0\.10\.\d+(?P<suffix>\*\*)'), keep_quote),
    Rule('ASSETS.md', 'ASSETS current version', re.compile(r'(?P<prefix>対象: \*\*v)0\.10\.\d+(?P<suffix>\*\*)'), keep_quote),
    Rule('TODO.md', 'TODO current version', re.compile(r'(?P<prefix>現行基準: \*\*v)0\.10\.\d+(?P<suffix>\*\*)'), keep_quote),
    Rule('EVENT_PROBABILITY_LIST.md', 'event probability doc version', re.compile(r'(?P<prefix>現行実装基準: \*\*v)0\.10\.\d+(?P<suffix>\*\*)'), keep_quote),
]


def validate_version(value: str) -> str:
    value = value.strip()
    if not VERSION_RE.fullmatch(value):
        raise ValueError(f'バージョン形式が不正です: {value!r}（例: 0.10.760）')
    return value


def read_canonical_version() -> str:
    if not VERSION_FILE.is_file():
        raise FileNotFoundError('VERSION ファイルがありません')
    return validate_version(VERSION_FILE.read_text(encoding='utf-8').strip())


def bump_patch(version: str) -> str:
    match = VERSION_RE.fullmatch(version)
    assert match
    return f'0.10.{int(match.group(1)) + 1}'


ACTIVE_QUERY_VERSION_PATHS = [
    'index.html', 'game.html', 'auth.html', 'sw.js',
    'hosting-origin-guard.js', 'auth-cache-recovery.js',
]
ACTIVE_QUERY_VERSION_RE = re.compile(r"\?v=(0\.10\.\d+)")


def inspect_stale_active_query_versions(version: str) -> list[str]:
    """Catch cache-busting build refs that were added without a synchronization Rule."""
    errors: list[str] = []
    paths = [ROOT / rel for rel in ACTIVE_QUERY_VERSION_PATHS]
    paths.extend(sorted((ROOT / 'js').glob('*.js')))
    for path in paths:
        if not path.is_file():
            continue
        text = path.read_text(encoding='utf-8')
        for match in ACTIVE_QUERY_VERSION_RE.finditer(text):
            found = match.group(1)
            if found == version:
                continue
            line = text.count('\n', 0, match.start()) + 1
            errors.append(
                f'{path.relative_to(ROOT)}:{line}: active cache-busting version = {found}（期待 {version}）'
            )
    return errors


def inspect(version: str) -> list[str]:
    errors: list[str] = []
    grouped: dict[str, list[Rule]] = {}
    for rule in RULES:
        grouped.setdefault(rule.path, []).append(rule)

    for rel_path, rules in grouped.items():
        path = ROOT / rel_path
        if not path.is_file():
            errors.append(f'{rel_path}: ファイルがありません')
            continue
        text = path.read_text(encoding='utf-8')
        for rule in rules:
            matches = list(rule.pattern.finditer(text))
            if len(matches) != rule.expected_count:
                errors.append(
                    f'{rel_path}: {rule.label} の対象数が {len(matches)} 件 '
                    f'（期待 {rule.expected_count} 件）'
                )
                continue
            for match in matches:
                rendered = rule.replacement(match, version)
                if match.group(0) != rendered:
                    found_versions = re.findall(r'0\.10\.\d+', match.group(0))
                    found = found_versions[-1] if found_versions else match.group(0)
                    errors.append(f'{rel_path}: {rule.label} = {found}（期待 {version}）')
    errors.extend(inspect_stale_active_query_versions(version))
    return errors


def synchronize(version: str) -> tuple[int, list[str]]:
    changed_files = 0
    grouped: dict[str, list[Rule]] = {}
    for rule in RULES:
        grouped.setdefault(rule.path, []).append(rule)

    for rel_path, rules in grouped.items():
        path = ROOT / rel_path
        if not path.is_file():
            raise FileNotFoundError(f'{rel_path}: ファイルがありません')
        original = path.read_text(encoding='utf-8')
        text = original
        for rule in rules:
            matches = list(rule.pattern.finditer(text))
            if len(matches) != rule.expected_count:
                raise RuntimeError(
                    f'{rel_path}: {rule.label} の対象数が {len(matches)} 件 '
                    f'（期待 {rule.expected_count} 件）'
                )
            text, count = rule.pattern.subn(lambda m, v=version, r=rule: r.replacement(m, v), text)
            if count != rule.expected_count:
                raise RuntimeError(f'{rel_path}: {rule.label} の更新件数が不正です')
        if text != original:
            path.write_text(text, encoding='utf-8')
            changed_files += 1

    VERSION_FILE.write_text(version + '\n', encoding='utf-8')
    errors = inspect(version)
    return changed_files, errors


def main() -> int:
    parser = argparse.ArgumentParser(description='JEWELRY×JEWELRY build version synchronizer')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--check', action='store_true', help='VERSION と実ファイルの同期だけを確認')
    group.add_argument('--set', dest='set_version', metavar='VERSION', help='指定バージョンへ全参照を同期')
    group.add_argument('--bump-patch', action='store_true', help='0.10.N の N を1つ上げて全参照を同期')
    args = parser.parse_args()

    try:
        current = read_canonical_version()
        if args.check:
            errors = inspect(current)
            if errors:
                print('VERSION SYNC: FAIL')
                for error in errors:
                    print(f'- {error}')
                return 1
            print(f'VERSION SYNC: PASS ({current})')
            return 0

        target = validate_version(args.set_version) if args.set_version else bump_patch(current)
        changed, errors = synchronize(target)
        if errors:
            print('VERSION SYNC: FAIL after update')
            for error in errors:
                print(f'- {error}')
            return 1
        print(f'VERSION SYNC: PASS ({current} -> {target})')
        print(f'更新ファイル数: {changed} + VERSION')
        return 0
    except (OSError, ValueError, RuntimeError) as exc:
        print(f'VERSION SYNC: FAIL\n- {exc}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
