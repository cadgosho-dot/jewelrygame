#!/usr/bin/env python3
"""Validate the public search/SEO surface for JEWELRY×JEWELRY."""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cadgosho-dot.github.io/jewelrygame/'
ABOUT = BASE + 'about.html'
IMAGE = BASE + 'assets/images/main-menu.webp'
TITLE = 'JEWELRY×JEWELRY｜宝石採掘・ジュエリー店経営ブラウザゲーム'
DESC = '宝石を採掘し、原石を研磨してジュエリーを制作。御徒町を舞台に接客・販売・店舗経営を楽しめるブラウザシミュレーションゲーム「JEWELRY×JEWELRY」。'
errors: list[str] = []


def read(rel: str) -> str:
    path = ROOT / rel
    if not path.is_file():
        errors.append(f'SEO必須ファイルがありません: {rel}')
        return ''
    return path.read_text(encoding='utf-8')


index = read('index.html')
about = read('about.html')
game = read('game.html')
auth = read('auth.html')
manifest_text = read('manifest.webmanifest')
robots = read('robots.txt')
sitemap = read('sitemap.xml')

# Primary page metadata.
required_index = [
    f'<title>{TITLE}</title>',
    f'<meta name="description" content="{DESC}">',
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
    f'<link rel="canonical" href="{BASE}">',
    f'<meta property="og:url" content="{BASE}">',
    f'<meta property="og:image" content="{IMAGE}">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<link rel="sitemap" type="application/xml" href="./sitemap.xml">',
]
for marker in required_index:
    if marker not in index:
        errors.append(f'index.html SEO要素がありません: {marker}')

# JSON-LD: valid, canonical app URL, and Google-supported web game co-typing.
match = re.search(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', index, re.S)
if not match:
    errors.append('index.html にJSON-LDがありません')
else:
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        errors.append(f'index.html JSON-LDが不正です: {exc}')
    else:
        types = data.get('@type')
        if not isinstance(types, list) or not {'VideoGame', 'WebApplication'}.issubset(set(types)):
            errors.append('JSON-LD @type は VideoGame + WebApplication の併記が必要です')
        if data.get('url') != BASE:
            errors.append('JSON-LD url が正式公開URLと一致しません')
        if data.get('applicationCategory') != 'GameApplication':
            errors.append('JSON-LD applicationCategory が GameApplication ではありません')
        offers = data.get('offers') or {}
        if str(offers.get('price')) not in {'0', '0.0'} or offers.get('priceCurrency') != 'JPY':
            errors.append('JSON-LD 無料Offer（0 JPY）がありません')
        if data.get('image') != IMAGE:
            errors.append('JSON-LD image がOGP代表画像と一致しません')

# Search landing page must be genuine visible content and link back to play.
required_about = [
    f'<link rel="canonical" href="{ABOUT}">',
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">',
    '<h1>JEWELRY×JEWELRY</h1>',
    '宝石を採掘', '研磨・ジュエリー制作', '接客・販売・店舗経営', '御徒町とランダムイベント',
    '<a class="play" href="./">ゲームを開始する</a>',
]
for marker in required_about:
    if marker not in about:
        errors.append(f'about.html 検索説明要素がありません: {marker}')

# Internal utility/game iframe documents should not compete in search results.
if '<meta name="robots" content="noindex,follow">' not in game:
    errors.append('game.html に noindex,follow がありません')
if '<meta name="robots" content="noindex,nofollow,noarchive">' not in auth:
    errors.append('auth.html に noindex,nofollow,noarchive がありません')

# Manifest description stays aligned with the public description.
try:
    manifest = json.loads(manifest_text)
except json.JSONDecodeError as exc:
    errors.append(f'manifest.webmanifest が不正です: {exc}')
else:
    if manifest.get('description') != DESC:
        errors.append('manifest.webmanifest description がSEO説明と一致しません')

# Sitemap contains only canonical indexable pages.
try:
    tree = ET.fromstring(sitemap)
except ET.ParseError as exc:
    errors.append(f'sitemap.xml が不正です: {exc}')
else:
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls = [n.text.strip() for n in tree.findall('s:url/s:loc', ns) if n.text]
    if urls != [BASE, ABOUT]:
        errors.append(f'sitemap.xml URL一覧が不正です: {urls!r}')

# robots.txt is retained for root/custom-domain hosting and points to the canonical sitemap.
# GitHub Pages project sites live below /jewelrygame/, so Google Search Console submission is still required.
if 'User-agent: *' not in robots or 'Allow: /' not in robots:
    errors.append('robots.txt の基本クロール許可がありません')
if f'Sitemap: {BASE}sitemap.xml' not in robots:
    errors.append('robots.txt のSitemap URLが正式公開URLと一致しません')

if errors:
    print('SEO POLICY: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
print('SEO POLICY: PASS')
print(f'正式公開URL: {BASE}')
print('検索対象: index.html / about.html')
print('noindex: game.html / auth.html')
