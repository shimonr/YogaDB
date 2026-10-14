# Asana data

The API loads asanas from a CSV inventory (`ASANAS_CSV_PATH`) and matches photos from an images folder (`ASANAS_IMAGES_DIR`), the layout produced by yoga-image-collector.

`yoga_asanas.sample.csv` is a small sample (10 common poses, no images). `backend/.env.example` points at it, so a fresh setup has data to browse.

## CSV columns

| Column | Used as |
|--------|---------|
| `id` | Asana id (optional; defaults to the row number) |
| `english_name` | English name (required; rows without it are skipped) |
| `sanskrit_name` | Sanskrit name; leave it blank or write `No Sanskrit` for poses without one (stored as `No Sanskrit`, and the Sanskrit games skip them) |
| `alt_names` | Up to two alternative names, separated by `;` |
| `difficulty_score` | Difficulty 1–5 (default 2) |
| `pose_family` | Type, e.g. `standing` |
| `primary_category` | Category, e.g. `balance` |
| `benefits` | Benefits, separated by `;` |

Ratings, photos and transitions refer to the asana id, so ids must stay stable between imports. With an `id` column you can delete or reorder rows safely; without it the row number is the id, so keep row order stable. Removing a row does not delete the asana from the database: delete it in the admin panel too.

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
