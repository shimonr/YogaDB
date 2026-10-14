"""Sample transitions, flows and classes built from existing asanas, for QA and demos.

Run `python -m app.services.sample_content`. Idempotent: items are matched by name, and anything
whose asanas (or transitions/flows) are missing is skipped.
"""

from __future__ import annotations

import json

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Asana, Class, Flow, Transition

# (name, start asana, end asana, difficulty)
TRANSITIONS = [
    ("Mountain to Forward Fold", "Mountain Pose", "Standing Forward Fold", 1),
    ("Forward Fold to Half Lift", "Standing Forward Fold", "Half Forward Fold", 1),
    ("Half Lift to Plank", "Half Forward Fold", "Plank Pose", 2),
    ("Plank to Cobra", "Plank Pose", "Cobra Pose", 2),
    ("Cobra to Down Dog", "Cobra Pose", "Downward-Facing Dog", 1),
    ("Down Dog to Low Lunge", "Downward-Facing Dog", "Low Lunge", 2),
    ("Low Lunge to Warrior I", "Low Lunge", "Warrior I", 2),
    ("Warrior I to Warrior II", "Warrior I", "Warrior II", 2),
    ("Warrior II to Reverse Warrior", "Warrior II", "Reverse Warrior", 2),
    ("Warrior II to Triangle", "Warrior II", "Triangle Pose", 2),
    ("Cat to Cow", "Cat Pose", "Cow Pose", 1),
    ("Child's Pose to Down Dog", "Child's Pose", "Downward-Facing Dog", 1),
    ("Mountain to Chair", "Mountain Pose", "Chair Pose", 1),
    ("Tree to Mountain", "Tree Pose", "Mountain Pose", 1),
]

# (name, transition names, difficulty)
FLOWS = [
    ("Short Sun Salutation", ["Mountain to Forward Fold", "Forward Fold to Half Lift", "Half Lift to Plank",
                              "Plank to Cobra", "Cobra to Down Dog"], 2),
    ("Warrior Sequence", ["Down Dog to Low Lunge", "Low Lunge to Warrior I", "Warrior I to Warrior II",
                          "Warrior II to Reverse Warrior", "Warrior II to Triangle"], 2),
    ("Gentle Warm-up", ["Cat to Cow", "Child's Pose to Down Dog"], 1),
    ("Standing Basics", ["Mountain to Chair", "Tree to Mountain"], 1),
]

# (name, description, flow names, difficulty)
CLASSES = [
    ("Morning Flow", "Warm up, then a short sun salutation.", ["Gentle Warm-up", "Short Sun Salutation"], 2),
    ("Strength and Balance", "Standing work and a warrior sequence.", ["Standing Basics", "Warrior Sequence"], 2),
]


def _key(name: str) -> str:
    return name.replace("\u2019", "'").strip().lower()


def seed_sample_content(db: Session) -> dict[str, int]:
    created = {"transitions": 0, "flows": 0, "classes": 0}
    asanas = {_key(a.english_name): a.id for a in db.query(Asana)}

    transitions = {_key(t.name): t.id for t in db.query(Transition)}
    for name, start, end, difficulty in TRANSITIONS:
        if _key(name) in transitions or _key(start) not in asanas or _key(end) not in asanas:
            continue
        item = Transition(name=name, start_asana_id=asanas[_key(start)], end_asana_id=asanas[_key(end)],
                          difficulty_level=difficulty, rank=50)
        db.add(item)
        db.flush()
        transitions[_key(name)] = item.id
        created["transitions"] += 1

    flows = {_key(f.name): f.id for f in db.query(Flow)}
    for name, steps, difficulty in FLOWS:
        ids = [transitions[_key(s)] for s in steps if _key(s) in transitions]
        if _key(name) in flows or len(ids) < 2:
            continue
        item = Flow(name=name, transition_ids=json.dumps(ids), difficulty_level=difficulty, rank=50)
        db.add(item)
        db.flush()
        flows[_key(name)] = item.id
        created["flows"] += 1

    existing_classes = {_key(c[0]) for c in db.query(func.lower(Class.name))}
    for name, description, flow_names, difficulty in CLASSES:
        ids = [flows[_key(f)] for f in flow_names if _key(f) in flows]
        if _key(name) in existing_classes or not ids:
            continue
        db.add(Class(name=name, description=description, flow_ids=json.dumps(ids), difficulty_level=difficulty, rank=50))
        created["classes"] += 1
    return created


def main() -> None:
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        created = seed_sample_content(db)
        db.commit()
    finally:
        db.close()
    print("Sample content created: " + ", ".join(f"{n} {k}" for k, n in created.items()))


if __name__ == "__main__":
    main()
