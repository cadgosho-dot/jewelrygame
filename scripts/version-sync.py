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
    Rule('sw.js', 'app.js precache key', qparam(r'\./js/app\.js'), keep_prefix),
    Rule('sw.js', 'audio.js precache key', qparam(r'\./js/audio\.js'), keep_prefix),
    Rule('sw.js', 'audio-scene-map.js precache key', qparam(r'\./js/audio-scene-map\.js'), keep_prefix),
    Rule('sw.js', 'game-data.js precache key', qparam(r'\./js/game-data\.js'), keep_prefix),
    Rule('sw.js', 'memories-screen.js precache key', qparam(r'\./js/memories-screen\.js'), keep_prefix),
    Rule('sw.js', 'memories-backgrounds.js precache key', qparam(r'\./js/memories-backgrounds\.js'), keep_prefix),
    Rule('sw.js', 'google-auth-bridge.js precache key', qparam(r'\./js/google-auth-bridge\.js'), keep_prefix),
    Rule('sw.js', 'firebase-service.js precache key', qparam(r'\./js/firebase-service\.js'), keep_prefix),

    # compatibility loaders
    Rule('hosting-origin-guard.js', 'memories override cache key', qparam(r'\./memories-event-image-overrides-v751\.js'), keep_prefix),
    Rule('hosting-origin-guard.js', 'workshop staff cache key', qparam(r'\./workshop-staff-images-v754\.js'), keep_prefix),
    Rule('auth-cache-recovery.js', 'Service Worker recovery build version', quoted_constant('BUILD_VERSION'), keep_quote),

    # main modules
    Rule('js/app.js', 'game-data.js import key', qparam(r'\./game-data\.js'), keep_prefix),
    Rule('js/app.js', 'UI build version', quoted_constant('UI_BUILD_VERSION'), keep_quote),
    Rule('js/app.js', 'audio.js import key', qparam(r'\./audio\.js'), keep_prefix),
    Rule('js/app.js', 'audio-scene-map.js import key', qparam(r'\./audio-scene-map\.js'), keep_prefix),
    Rule('js/app.js', 'firebase-service.js import key', qparam(r'\./firebase-service\.js'), keep_prefix),
    Rule('js/game-data.js', 'game data VERSION', export_constant('VERSION'), keep_quote),
    Rule('js/memories-screen.js', 'memories-backgrounds import key', qparam(r'\./memories-backgrounds\.js'), keep_prefix),
    Rule('js/memories-screen.js', 'memories VERSION', quoted_constant('VERSION'), keep_quote),
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
