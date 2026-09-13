#!/usr/bin/env python3
from pathlib import Path
import re

s = Path("js/app.js").read_text(encoding="utf-8")
m = re.search(r"const HUNGER_ALLOWED_ACTIONS = new Set\(\[(.*?)\]\);", s, re.S)
assert m, "HUNGER_ALLOWED_ACTIONS not found"
block = m.group(1)
for action in ("storyteller-event-next", "storyteller-quiz-answer", "storyteller-reward-next"):
    assert f"\'{action}\'" in block, f"{action} must remain allowed while hungry"
assert "case 'storyteller-quiz-answer':" in s, "storyteller answer dispatcher missing"
assert "answerStorytellerQuiz(String(button.dataset.key || ''));" in s, "storyteller answer dispatch changed"
assert "e.stage = e.correct ? 'correct' : 'incorrect';" in s, "storyteller answer stage transition changed"
print("PASS: storyteller event progression remains available while hunger lock is active")
