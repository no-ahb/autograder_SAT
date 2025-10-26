# SAT Worksheet Autograder (Browser)

A fast, client-only SAT autograder for English/Math worksheets. Upload a PDF/TXT or paste answers; pick a worksheet; get copy-ready results.

## Features

* Paste **or** upload PDF/TXT; robust parsing (`27 C`, `27.)C`, `(27) d`, `34.b`, `32.c`).
* Partial submissions (evens/odds/ranges/mixed).
* Option to **skip missing** from denominator.
* Copy-ready output: title, `X / Y correct`, wrong list, manual review, notes.
* PDF parsing with **no external worker/CDN**.
* Live scorecard: every worksheet shows a color-coded question grid that updates as students upload new attempts.
* Student analytics dashboard with per-attempt history logs, aggregated progress, and reminders for what is still outstanding.

## Quick start

```bash
npm i
npm run dev
# open http://localhost:5173
```

## Build & deploy (GitHub Pages)

1. Create repo -> push.
2. Enable Actions.
3. Add Pages workflow (see `.github/workflows/pages.yml`).
4. On push to `main`, site deploys to Pages.

## Keys

Answer keys live in `src/keys/*.txt` (raw PDF text lines). Add more by:

1. Drop a `txt` with lines like `34. D`,
2. Register it in `App.jsx` `RAW_KEYS`/metadata, or load via Vite raw import.

## PDF parsing

```js
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
```

## Tests

```bash
npm run test
```

Covers parsing variants, duplicates, missing policy, and grading math/english sets.

## Accessibility

* Labels on controls; keyboard navigable; sufficient contrast.

## Roadmap

* CSV export; saved presets (Evens/Odds/Range).
* Per-skill analytics; error heatmaps.

## License

The project currently ships under the MIT License (see `LICENSE`), which keeps the code permissive and easy to reuse in tutoring businesses.

If you need to change the licensing, pick the path that matches how you plan to share the tool:

1. **Keep MIT (default)** – do nothing; update attribution in forks as usual.
2. **Switch to another permissive license (e.g., Apache 2.0)** – replace the text in `LICENSE`, add any required NOTICE file, and update the `license` field in `package.json` and this section.
3. **Offer it under a proprietary/commercial license** – swap `LICENSE` with your terms, remove MIT headers from source files if required, and document how clients may use the app.

Whichever option you pick, make sure both the `LICENSE` file and this README clearly state the choice so downstream tutors know the rules.
