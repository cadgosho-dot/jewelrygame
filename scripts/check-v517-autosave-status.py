from pathlib import Path
root=Path(__file__).resolve().parents[1]
app=(root/'js/app.js').read_text(encoding='utf-8')
css=(root/'styles.css').read_text(encoding='utf-8')
checks={
 'version': "0.10.517" in app and "VERSION = '0.10.517'" in (root/'js/game-data.js').read_text(encoding='utf-8'),
 'status element': 'data-autosave-status' in app,
 'saving status': "showAutosaveStatus('saving', '保存中…'" in app,
 'local saved status': '端末に保存しました' in app,
 'cloud error status': '端末には保存済み／クラウド保存に失敗' in app,
 'last save timestamp': 'localLastSaveAtKey' in app and 'lastSuccessfulSaveAt' in app,
 'duplicate save suppression': 'fingerprint === lastSavedFingerprint' in app,
 'post-load verification': '前回の保存を読み込みました' in app,
 'status css': '.autosave-status' in css and 'data-autosave-status="error"' in css,
 'no manual save UI': '手動保存' not in app,
}
failed=[name for name,ok in checks.items() if not ok]
for name,ok in checks.items(): print(('PASS' if ok else 'FAIL'), name)
if failed: raise SystemExit('failed: '+', '.join(failed))
