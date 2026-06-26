# Asana images folder

Place your asana image folders here (or anywhere on disk — point `ASANAS_IMAGES_DIR` at that path).

## Folder layout

```
<ASANAS_IMAGES_DIR>/
  1-mountain-pose/
    1-mountain-pose-1.jpg
    1-mountain-pose-2.jpg
    1-mountain-pose-3.jpg
    1-mountain-pose-0.png   # optional icon
  2-downward-dog/
    ...
```

- Subfolder name: `<id>-<slug>` (e.g. `42-warrior-ii`)
- Image extensions: `.jpg`, `.jpeg`, `.png`, `.webp`

## Optional metadata

Add `asanas.json` in the same folder (or `data/asanas/asanas.json`) to override names, difficulty, benefits, etc. See `asanas.metadata.example.json`.

## Load into database

```bash
python scripts/init_db.py --images-dir "C:/path/to/your/asanas"
```

Set the same path in `backend/.env` as `ASANAS_IMAGES_DIR` so the API can serve those files.
