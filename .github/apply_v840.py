#!/usr/bin/env python3
from pathlib import Path
import base64, zlib, re, subprocess, sys

APP_PATCH = 'eNrtGmtzE9f1u3/FxcN0pbFWlp/I7wbjBs+QmCAnnZZh8Hr3ytqw2lV3V3ZURzOWFAIJUAJpIEmhNJmGEijQhkxCEh7/pYtk+1P/Qs+59+5LlmzSGdpmpp+093HOPfe87nlI0/N5IssrukuU/jedfqVUSr/pkOXwu0c3NfoWGR0aGRpdpuk01bJ5ZVQlA5nM6PBwjyzLUcievr6+GPTPf07kkezYQCpL+tjvYIbAXL5sqq5umWTNsk85Bau0aFlGzlXcsrNI33ITLgzntRSxqWrZGpmK7TvGJsWeZJKs9xACO92ybRLp2eOnm7+/1bx4f6vxWJroIdUe0iN3PG6+qKzQnK0yRIhFDrAs7V/HyZm0jnvI228TKd2vOA51nX425fTjutNfMhSVFixDo3baWV2RqjOrU/vX35g7lptfeLW6NNHTt/fRKbJKbQe2ULyoa5cpEtNHiGqZjkscq2yrFFZyrq2bK4l/j7DkBGLU8ySxLzwNwDn2tG6qRlmjTkKakYCjgg18kUGGjOGTOy9a7enb7bavKPapcklceJ2oBlD9qlLEi0n0N2W9VKSmK+twZxIZIiSblFJEMVzcDF8aKoDi6qtUMIxU4WO92plv3WU+Ee7OK4axrKincntCpXCvQzsCV4rLlgHA1FGFnBw+hYL6x6eXhRh8Zk46JcXkrJjq3b+OUAFfktVeoimuIvuEyIhQcMQpUMOYRlSETOrFFeLYqo+B33s3cL7gEy1HYONcQBzAdFyMcHwGREDG2RVRInCzwFpMlCdetfntF83T30pVr3Zv8/c/NBsXlxg9gEQDFZ7qVZyKqfb6F4hyodNtfaqAGltX5IKuadSc6kXB907vX49zvzrZj/gYbvG5JNxA6HXghLVfRgR8iLqKbvgeBbSIua2xzGDqALitsYFh+I16rT3h4Vq45xVLU4wEGxLi6q5BxwluYpxK8ellS6uMgy5o+qrPBHZ3jeGUi4gCWCWzzTFpd1fsUHC+JrITkygQLhuv8cPWrbvN+idcPr4sCOmAtpvpjhMpSmlENbm1jvuawQ7vevZS1KDHuXWRarLK2QNXLk1H7sEPQy0TQ0e19RJKJQmiL00HUN34CT+900znomjdSokmfd3hq0Bs6+zTrS8/evbkM/LPR+fEXX5TVgzdrRy1dNN1fIj96+KlmhFWLXA/1/OWDA5eAsOSJBgB8eIm/HspxVRyYHBweBR1Ej5GsvCmxpQSbCqn2pSas5bpgvtctEoL+Ty8DQmhkr7nmcABexh9DwZs1G2qvayUwHs5DAmZmgJvW7IM3SmA0UpwtYFRoC8RXS5SxWArw7hyXHJcy6YgfUk3V4ECy67gAE1BVRyaowZV3egMNxzpRPgAcexJwDm04zTVKpYMipfFMyGSGCfZZDLqiXXnkKWW8e14uaxrNCeAY1cyLMuhL9Mi2yGxR7B9dbbsdl5F7TGO2laeOviGKgbfFqEgxsnO5MyQ4fab/RTYnGRqw29ZoApEFgct17WKcM9V3dGXDXo4MpvgW+aMKFipAHHH4pp1ULEBShO8SfsfcwblY3ifQG3BuFd1lc6iEQs2IbzEVflnPwsRoA8NoPjB4HopB3LXLHlZsUFI3ISGhgdSo2hCQyPDqeF4OOqoBaqVDdrZjnJgYb4tVfmb0tffT1Yz6YFMOjucGSfcZ4Cn8xp3vMYjr/7dPx9d9Orw3fAaZ+G7ee1v22cubX35YPPrv3m1+95GrfneBfCD29c/R6j6d179vte4i7CNO88eX9h8DJPvsGO8xscMzQYsNt+9sHXrbOvhX73aHa9+1qufawP16p97jQfs5EfoeB//ffvGU69+uXnxqle75NU+xZOfnoaP1pUz23+669UAw3vbV855tYveRj0SydkUbu4/dkyNfZ0GJlmGkYhFXSuhnoPMiEnXSA4c0PE2q0u1G1qqq22diISuUezpghKocTJwbAEhkH8YFaAAyJua5hT+GCQ+GpWrACCyLcsF50/tCrcvy05IaQ7KHz0yTfyxgBLhHj/Xx6QDWsVUqZUnhxdfOSJ0PumTSPwjERewF5QPDs9MdF49QvNuZLkaJZ3d8yjGe12IZxKQV2hRLkW4LpcAJEXEqlp2O64yYcVX2HlsPXbvkIw9bx5s7XL39vXdbo90cAWlMV/DIcHTiuMjlEZBIlRFp7sQ1mFLJ9qqbMA0M+FnAiAUx33JhOAJre0XNkRKiZjO7vasC+RRjN1wsj18S5X/rEFmb62lAdGiXqRW2eV7UiSb2WPD4GgmNMqAs3kgz5lJ2+B+K0kSn+azabdATUFJWlVcteBflZGEGWQ0Sqf4th3SFcNaKVP+qhxRKkDHUcV2Hd8RIw2vvT7/65NHXvrVwuuLJ98YPJmbPTY392quk3ETs2wY/kuQzY7xl2BsaLQtwrepCY9IGDgxoueQoEWldBhCv5xbQS1K8OeNcOU2DLYFCxSQZVdQYKALwZ7neV0i+viCg5bkc7j2NsLnuknEp510op2/2vhgA4tcOoMa5QLvQFnY0mGrSFmiEXCbdHZYbLdc1tNqGSKgolwAQBlTvxXbKpualATUIBaKB8B9S9R2KwlJljkc282SFHhtlsq2kYD8iFEUENRGT7U3uZQUyjJ6IJtlkfdotouyvGwoy77CiMcDIhJg1TFrDR8iXmZihk1CP2VY6ilW+NkXzRVeN/m8X6eIAECsBRkIFj4wG2H38ZPDmbaSwgpQJNvWWiSZ7phD/7ikshdoVngebyi/rXTI6/1sxnePM+TH5JQdqJbAZ/magRnSRDSbgUsvl0EVTYJJ3FQvH/TGmODoGNIiVsLGDDWO9q8LAcygFeGXxHMwUT5RmIQFlkgeKZZ1LZZk6xpwKUhB969zWVWFBmXHhAaNDXfWoA4lhcAkovmsU4IMVDaY5YXHTTqUI/N3qRS0HiShUiYSvtp1O78pvN8mNZBJjhN+x67OnvhAorK1ZlJtx3pYsfgP1Cz+F6sWSBOXKlJ00NZpXtAixWtcK9wZRwB3L12E+0TprGsZQ6jd2OgAU7sDmcxYV8f1E1C5/6tUF5V6cbqTzWS47mQzw+26o9G8UjbcQ7aSdxOWDVTN4zOG8VW8JSO0SWwRVU/dpcVxPjeTxgGrG2ODQ0pxMZcdegTDGrELHDSr9I+zE1JcTl33MN6JoyDBEV8sTMoVlBIAmJZdVAz9txwBm0zgzsimpABj8VNALBshtXnddtwF9H4JHkUExRi+x8ECjG5AICglRfkuO3SAl++yw4PDHW0RJTvn9z/mfYSJSGQkuhusmChKI6KOmOaTPOhSVkHsyrJBsYYTHY132m3TkqLbov4UHYFql82yw0An4iRAdA1B1ip4L41ZB9BxEKinipkIQxOM+vZFOld8NhlpOO3oVCXbzgkCnvYDQ3fQHvg8R0PpvxII7RUKJUMDHd/1Sl1aIYEtt7edqpFWCHn+2Ck8FGOlcCScigDlUbTQxvbAaa+YaT4WMu0ImsBQDgiLOTDS0WKY/QaW0v6G+T5xetIBczeAR7qzYOsrOqRBDBL13avf9hq3vfpDr/E+K9yJ2h1T/2CEzaxb97Y/+yMW6Dm2ycKA4Dq4DvG2TPazyfZjQBS6c5QqtuF30JaCxoaD3iYAL00vxToA2APgNc2OzQ1epxESibRD5BVb12JvZtvrywFPmdaaQTWwClWxYT9nVmGwC6dCZtzxan/2au94tZuMTZs3HgB3YtPIisHp4JZ+CpsrWLZ7KCSU8U7nXZDSNL/5/vV97aeDI1kR+e9Lvjdjhr+bAsOVLVNT7Iqvq+2X9vfHdDYsjPGaFmSS5g7lFVSD8nqNq17jbvODS17tUvPedeBE8+5NXuKd7OcHhJ2dICbq+79cXrBcQARe7Spceuv2X1sf/86rX966ec6rn9tFKBE39DwG/OMkF/QBotKIy+LIwkJu7mTu8EtH504emsvNHps/uji/8GruOHMR89oJ0W8PPQaLJh9/vvn+N17tL17tE2+jvhSV2AsTA1aGd4iB0RX8E4HT/FyiCGWwFDZ+Y06wk97zFyA2O2/mrVngu68HXMT8MYG8m4ezYyMZrPztfEwWMMZzOj0fmjv97PuzrcaD5u9uPHvyGdDmwqQGcqtQM0EdF6utVJu1HBfZDytx8nfiOfvl5h/e74YHy3X6npg2v77QunYjggPZrsFbYegmxU5zHIHcKUtYAxH2MmzNh+db1/7Quv7Zsx++acPJYt+06G3Ogs7oyDQHtZHX4jAyLtk0T4GPKjuaBR+t82ea9z71ardB+lLH28DI6JogsmNlZAhEO4YsVqPhwmRhiHnEWUxDeBmH/wOMqduN1vUPWlc+YY6w+fT01s2amEAXOMSTnMGB7MgwloEHB8Yg2xkYiKkFfasEh1LtNd7155oRrIL1QBZQZIdH69H7MLJ5nUXNCelNukYNu3IQGFOI/rmqYK0tWorjJiQWeXzh1W9hFNJ49OzxtdbZD5iTuB/9Oxuwsfn4zvaZS61r33u18/xCgdVjC43atmVLPIBmdKhIGUvR2D8mwAdYeRJOpv0EiuzDLGCZh+9SRxqDF6Z+2efwJ9h3rJ3brj1svf9HxvCb2D6s/cmrfYTerY2oPnzzwn7p0PA42d74tPnwIXY+N863cYGdcw1P2LgAjNj8/Put236ntH65df6GV3vC+5he7TpiwOGT5tlvEIrR0rx3HvjoN1cfbm985dU3WHOTkdF6cKt15UzzQ4C/33zyYev6FxjhsWO8xkeik1q/vPnN3db5GmLcqDUvXgWo5runm/cwHNy6/efWhxcYlZe3P/7Kq30gsLfxPi1y34CvKlcYZEmYTlllG3O5km1pZaZeh3EmEaKJdtKxyQO2iNE4Avkmciwy/QvL7gLMZiGCNZ2Cjo0sNj4anMt8D2huDJiZykh2KMNMZSSbHUwNsHCcVeoVTWO9gSO641KT2iytq7BsniRYH8evfPd0A+Bq0r7dJ9lV7BWKDTW2mhbDSEdRtPPAAcR2jIuGT9AX3pF+YSWd7Z1JqwaYAio7pIHHu/177kTkv5Q7kAVtwy7/KhSZ8A644M8LAYStMgcaa6W2oYPIa29Ei7YObpGZ94AU6Wo+LySDm+gOBdky7IlTFmyPNdRFe3YnioDtx3f/w+MJbPCwlwG1BlUoIRUUR2wJ3UzbydVQi7Cu+Ibu6O4b8OhZnSSP1QWL08GKkPjPFldmsycijjWOKAgX4tMh1nQ7Lhn0FvvkHe/jW4JkUqo5uNVmfyX4F9THeDg='
CUSTOM_CSS = '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'
CHANGELOG_BLOCK = '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'

def dec(s):
    return zlib.decompress(base64.b64decode(s)).decode('utf-8')

def run(*args):
    print('+', ' '.join(args))
    subprocess.run(args, check=True)

root = Path(__file__).resolve().parents[1]
if Path.cwd() != root:
    import os
    os.chdir(root)

# Synchronize all build references first, preserving current GitHub main content.
run(sys.executable, 'scripts/version-sync.py', '--set', '0.10.840')

# Apply the workshop/UI logic changes to the exact v0.10.840-synced app baseline.
app = Path('js/app.js').read_text(encoding='utf-8')
if 'function workshopToolImageMarkup(tool,' not in app:
    patch_path = Path('.github/jxj-v840-app.patch.tmp')
    patch_path.write_text(dec(APP_PATCH), encoding='utf-8')
    try:
        run('git', 'apply', '--whitespace=nowarn', str(patch_path))
    finally:
        patch_path.unlink(missing_ok=True)

# Slightly thicken standard frame/border lines in the finalized set of UI files.
border_files = [
    'styles.css', 'quiz-event-v2.css', 'auth.html', 'about.html', 'game.html',
    'hosting-origin-guard.js', 'js/memories-screen.js'
]
pattern = re.compile(r'((?:border(?:-top|-right|-bottom|-left|-width)?|outline)\s*:\s*)1px\b')
for name in border_files:
    p = Path(name)
    s = p.read_text(encoding='utf-8')
    s = pattern.sub(r'\g<1>1.25px', s)
    if name == 'styles.css':
        # These intentionally dashed/dotted guide placeholders stay at 1px in the approved build.
        s = s.replace('border:1.25px dashed rgba(255,255,255,.24)', 'border:1px dashed rgba(255,255,255,.24)')
        s = s.replace('border:1.25px dashed rgba(231,190,104,.34)', 'border:1px dashed rgba(231,190,104,.34)')
        s = s.replace('border-bottom:1.25px dotted rgba(255,255,255,.35)', 'border-bottom:1px dotted rgba(255,255,255,.35)')
        marker = '/* v0.10.833: Craft + rough-polishing selected-option visibility.'
        if marker not in s:
            s = s.rstrip() + '\n\n\n' + dec(CUSTOM_CSS)
    p.write_text(s, encoding='utf-8')

# Keep the full v0.10.830 and v0.10.831-v0.10.840 history in CHANGELOG.
p = Path('CHANGELOG.md')
s = p.read_text(encoding='utf-8')
anchor = s.find('## v0.10.829')
if anchor < 0:
    raise SystemExit('CHANGELOG anchor v0.10.829 not found')
starts = []
for n in range(830, 841):
    pos = s.find(f'## v0.10.{n}')
    if 0 <= pos < anchor:
        starts.append(pos)
if starts:
    start = min(starts)
    s = s[:start].rstrip() + '\n\n' + s[anchor:]
    anchor = s.find('## v0.10.829')
block = dec(CHANGELOG_BLOCK)
s = s[:anchor] + block + s[anchor:]
p.write_text(s, encoding='utf-8')

# Guardrails for the requested behavior.
app = Path('js/app.js').read_text(encoding='utf-8')
styles = Path('styles.css').read_text(encoding='utf-8')
checks = [
    ('VERSION', Path('VERSION').read_text(encoding='utf-8').strip() == '0.10.840'),
    ('craft loose default', 'useLoose: order ? true : false' in app),
    ('direct normal craft', 'if (!craftDraft.orderId) return craft();' in app),
    ('order desired conditions hidden', 'desiredConditions || customer?.preferenceText' not in app),
    ('guide label', '>詳しい説明を見る</button>' in app),
    ('tool image retry', 'data-workshop-tool-image' in app and 'data-fallback-src' in app),
    ('craft selection check', 'content:"✓"' in styles),
    ('metal guide scroll', 'body[data-screen="metalProfessionalGuide"] .screen-shell > .screen-content' in styles),
]
failed = [name for name, ok in checks if not ok]
if failed:
    raise SystemExit('v0.10.840 checks failed: ' + ', '.join(failed))
print('v0.10.840 integration checks: PASS')
