#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
css = (root / 'styles.css').read_text(encoding='utf-8')

assert 'タップして食事へ' not in app
assert 'hunger-meal-shortcut' not in app
assert '<div class="hunger-lock-notice" role="status" aria-live="polite">' in app
assert '<strong>空腹で動けません</strong><span>食事をするか、今日は休んでください。</span></div>' in app
assert 'data-screen="meal" ${mealDisabled}' in app
assert '.hunger-meal-shortcut{' not in css
assert 'v0.10.497: 空腹時の案内を非操作のメッセージ表示へ変更' in css
print('v0.10.497 空腹時メッセージ検査: OK（ショートカットボタンなし・警告文と通常の食事メニューを維持）')
