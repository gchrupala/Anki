"""Writes tests/fsrs_reference.json: review sequences scheduled by py-fsrs.

The scheduler tests replay these sequences through srs.js and compare the
results. To regenerate:

    pip install fsrs
    python tests/make_fsrs_reference.py
"""

import json
from datetime import datetime, timedelta, timezone
from importlib.metadata import version
from pathlib import Path

from fsrs import Card, Rating, Scheduler

# Each review is (minutes after the first review, rating 1-4).
# py-fsrs counts elapsed days as full 24-hour periods; srs.js counts calendar
# days, as Anki does. Reviews on later days are placed at least a whole number
# of days after the previous review, so that both counts agree.
SEQUENCES = {
    "good-path": [(0, 3), (10, 3), (2 * 1440 + 60, 3), (14 * 1440 + 60, 3)],
    "easy-first": [(0, 4), (8 * 1440, 4)],
    "lapse": [(0, 3), (10, 3), (2 * 1440 + 60, 1), (2 * 1440 + 70, 3), (5 * 1440 + 120, 2), (12 * 1440 + 120, 3)],
    "struggle": [(0, 1), (1, 1), (2, 2), (8, 3), (18, 3), (3 * 1440 + 60, 1), (3 * 1440 + 70, 1), (3 * 1440 + 80, 3)],
    "late": [(0, 3), (10, 3), (30 * 1440 + 60, 3)],
}

scheduler = Scheduler(enable_fuzzing=False)
start = datetime(2026, 10, 15, 8, 0, tzinfo=timezone.utc)
out = {"source": f"py-fsrs {version('fsrs')}, default parameters, no fuzz", "sequences": {}}
for name, reviews in SEQUENCES.items():
    card = Card()
    rows = []
    for minutes, rating in reviews:
        t = start + timedelta(minutes=minutes)
        card, _ = scheduler.review_card(card, Rating(rating), t)
        rows.append({
            "minutes": minutes,
            "rating": rating,
            "state": card.state.name.lower(),
            "stability": card.stability,
            "difficulty": card.difficulty,
            "dueMinutes": (card.due - t).total_seconds() / 60,
        })
    out["sequences"][name] = rows

path = Path(__file__).with_name("fsrs_reference.json")
path.write_text(json.dumps(out, indent=1) + "\n")
print(f"wrote {path}")
