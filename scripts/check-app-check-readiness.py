#!/usr/bin/env python3
"""Validate Firebase App Check configuration is either safely staged or fully configured."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
config = (ROOT / 'js/security-config.js').read_text(encoding='utf-8')
service = (ROOT / 'js/firebase-service.js').read_text(encoding='utf-8')
doc = (ROOT / 'SECURITY_SETUP.md').read_text(encoding='utf-8')
errors = []

enabled_match = re.search(r"enabled:\s*(true|false)", config)
key_match = re.search(r"siteKey:\s*'([^']+)'", config)
enabled = enabled_match and enabled_match.group(1) == 'true'
site_key = key_match.group(1) if key_match else ''
placeholder = (not site_key) or 'REPLACE_WITH_' in site_key

if not enabled_match or not key_match:
    errors.append('security-config.js のApp Check設定を解析できません。')
if enabled and (placeholder or len(site_key) <= 20):
    errors.append('App Checkがenabled=trueですが、有効なreCAPTCHA Enterprise site keyがありません。')
if 'initializeAppCheck(app' not in service or 'ReCaptchaEnterpriseProvider' not in service:
    errors.append('firebase-service.js にApp Check初期化処理がありません。')
if "throw new Error('App Checkの設定が不完全です。SECURITY_SETUP.mdを確認してください。')" not in service:
    errors.append('不完全なApp Check設定を起動時に拒否する安全処理がありません。')
for phrase in ['reCAPTCHA Enterprise', 'enabled: true', 'Enforce']:
    if phrase not in doc:
        errors.append(f'SECURITY_SETUP.md に必要な手順がありません: {phrase}')

if errors:
    print('APP CHECK READINESS: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
if enabled:
    print('APP CHECK READINESS: PASS (enabled)')
    print('App Checkはコード上、有効なsite keyで有効化されています。')
else:
    print('APP CHECK READINESS: PASS (staged)')
    print('App Checkは管理画面設定待ちの安全な無効状態です。site key取得後のみ有効化してください。')
