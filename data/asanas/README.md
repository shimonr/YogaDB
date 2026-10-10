# Asana data

The API loads asanas from a CSV inventory (`ASANAS_CSV_PATH`) and matches photos from an images folder (`ASANAS_IMAGES_DIR`), the layout produced by yoga-image-collector.

`yoga_asanas.sample.csv` is a small sample (10 common poses, no images). `backend/.env.example` points at it, so a fresh setup has data to browse.

## CSV columns

| Column | Used as |
|--------|---------|
| `english_name` | English name (required; rows without it are skipped) |
| `sanskrit_name` | Sanskrit name (defaults to the English name) |
| `alt_names` | Up to two alternative names, separated by `;` |
| `difficulty_score` | Difficulty 1–5 (default 2) |
| `pose_family` | Type, e.g. `standing` |
| `primary_category` | Category, e.g. `balance` |
| `benefits` | Benefits, separated by `;` |

The row number is the asana id, so keep row order stable between imports.

## Images folder layout

```
<ASANAS_IMAGES_DIR>/
  Mountain_Pose/              # English name; spaces, hyphens and apostrophes become _ or are dropped
    Mountain_Pose_01.jpg
    Mountain_Pose_02.jpg
  Downward_Facing_Dog/
    ...
  reference.csv               # optional: file_name,url — fills each photo's original_url
```

Image extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`. Photo paths are stored relative to this folder, so you can move it and only update `ASANAS_IMAGES_DIR`.

## Load into the database

The API imports the CSV automatically when the database has no users. To re-import into an existing database, from the repo root:

```bash
python scripts/init_db.py --csv-path "C:/path/to/yoga_asanas.csv" --images-dir "C:/path/to/asana_images"
```
