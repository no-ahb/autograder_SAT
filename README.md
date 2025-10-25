# SAT Worksheet Autograder (Browser)

A fast, client-only SAT autograder for English/Math worksheets. Upload a PDF/TXT or paste answers; pick a worksheet; get copy-ready results.

## Features

* Paste **or** upload PDF/TXT; robust parsing (`27 C`, `27.)C`, `(27) d`, `34.b`, `32.c`).
* Partial submissions (evens/odds/ranges/mixed).
* Option to **skip missing** from denominator.
* Copy-ready output: title, `X / Y correct`, wrong list, manual review, notes.
* PDF parsing with **no external worker/CDN**.

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

MIT (adjust as needed).
