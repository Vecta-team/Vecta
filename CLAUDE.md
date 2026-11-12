# Vecta Academy: project handoff

Read this first. It explains what Vecta is, how this repository works, the
measured results, and what we want to build next.

## What Vecta is

Vecta sends lessons as **the teacher's voice plus a small file of drawing
instructions**, not video. The student's phone draws the board itself, in time
with the voice, so text and equations stay sharp on any screen while using
much less data.

- Users: secondary students (ages ~13-18) learning maths and science on cheap
  phones with expensive prepaid data, who watch video at 144p to save data.
- Model: nonprofit, free for students; funded by grants, NGO partners, and
  licensing the player to edtech companies.
- Tagline: "Crystal-clear lessons for the price of a voice note."
- Team: 5 high-school students entering the 2026-27 Conrad Challenge
  (category: Cyber-Technology & Security).

## This repository

- Hosted with GitHub Pages from the `main` branch, root folder:
  https://vecta-team.github.io/Vecta/
- The website itself is **flat (no folders)**. This is deliberate: the team
  uploads through the GitHub website in Safari, which drops folder structure.
  The one folder is `tools/` (build scripts, reference only, not part of the
  website). Change it by merging through GitHub, not by dragging folders in
  Safari.
- No build step and no framework. Plain HTML, CSS and JavaScript.
- Changes go live only after they are merged into `main`.

### Files

| File | What it is |
|---|---|
| `index.html` + `site.js` + `site.css` | Landing page (front page): problem, how it works, live demo, results, mission, team, contact. `site.js` plays one real lesson with `board.js`. It does not register the service worker, so a first visit stays small. |
| `app.html` + `player.js` | Lesson library and player. Routes: `#lesson/<id>` (built-in), `#mine/<id>` (saved on the phone). Old links to `./#lesson/<id>` are redirected here by `site.js`. |
| `record.html` + `record.js` | Record mode: microphone + pen, text and equation tools. Saves a lesson to IndexedDB or as a `.vecta` file. |
| `results.html` + `results.js` + `benchmark.json` | Test results page (measured numbers, charts, comparison images `cmp_*.png`). |
| `board.js` | Shared renderer. Shapes/strokes on a canvas; text and equations as real text (KaTeX). |
| `store.js` | IndexedDB storage and the `.vecta` file format (a plain zip: `lesson.json` + audio). |
| `sw.js` | Offline service worker. App files are cached on first visit; lesson files are cached by "Download all" or when played. Serves audio byte ranges from cache. |
| `app.css` | Shared styles (colours, buttons, player). Light/dark via `prefers-color-scheme`. |
| `BricolageGrotesque-700.woff2` | Heading font, self-hosted (22 KB, SIL Open Font License). |
| `lessons.json` | Lesson index with real file sizes. |
| `<id>-lesson.json`, `<id>-voice.opus`, `<id>-voice.m4a` | One lesson: instructions, voice (Opus 16 kbps), iPhone fallback audio (AAC). |
| `katex.min.js`, `katex.min.css`, `KaTeX_*.woff2` | KaTeX 0.16.11, self-hosted so it works offline. |
| `manifest.webmanifest`, `icon-*.png` | Install-as-app support. `start_url` is `app.html`, so the installed app opens the lesson library. |
| `tools/` | Python build tools from `vecta-prototype-v2.zip`. They expect the old foldered `site/` layout; see `tools/README.md`. |

If `sw.js` or any cached file changes (including text edits to `index.html`),
change the cache name inside `sw.js` (`vecta-app-...`; and `vecta-lessons-...`
if lesson files changed) so phones that already saved the app fetch the new
version. New files must also be added to the `FILES` list in `sw.js`.

### Lesson format (`vecta/0.1`)

```json
{"format":"vecta/0.1","id":"area-of-a-circle","title":"Area of a circle",
 "duration":48.66,"audio":[{"src":"voice.opus","type":"audio/ogg; codecs=opus"},
 {"src":"voice.m4a","type":"audio/mp4"}],
 "captions":[{"t":0.3,"text":"Today, we're going to find the area of a circle."}],
 "elements":[{"t":14.81,"type":"math","value":"A = \\pi r^2","x":72,"y":42,"size":9}]}
```

- `t` = seconds into the audio. The audio is the clock.
- `x`, `y` = % of board width/height (board is 16:9). `size`, `r` = % of board height.
- Element types: `text`, `math` (KaTeX), `line`, `arrow`, `circle`, `dot`,
  `fill`, `highlight`, `stroke` (pen: `pts` = `[x, y, ms]`), `clear` (new page).
- Built-in lessons: in the flat layout, audio `src` values are rewritten to
  `<id>-voice.opus` etc. by the player (see `lbase` in `player.js`).

### Lessons

| id | Length | Voice |
|---|---|---|
| area-of-a-circle | 0:49 | real recording |
| solving-equations | 0:30 | placeholder robot voice |
| pythagoras | 0:43 | placeholder robot voice |
| speed-distance-time | 0:25 | placeholder robot voice |

The Python build tools (lesson scripts, voice alignment) are in `tools/`.
They need Python 3, ffmpeg, espeak-ng, pocketsphinx and Pillow.

## Measured results (use only these; do not invent numbers)

Same 49-second "Area of a circle" lesson, teacher's recorded voice:

| | 144p video | Vecta |
|---|---|---|
| Whole lesson | 523 KB | 103 KB (about 5x smaller) |
| Board | 192 KB of pixels | 1.1 KB of drawings (about 175x smaller) |
| Sound | 293 KB (48 kbps AAC) | 101 KB (16 kbps Opus) |
| Per hour | 38.7 MB | 7.6 MB |

- Part of the 5x is the audio bitrate. With the same voice file in both
  (best case for video, robot-voice version), Vecta was 1.7-3.9x smaller.
- OCR readability, text at 3% of screen height: Vecta 100%, 144p video 3%.
  Large headings and equations survive 144p; small labels and symbols do not.
- Context: low-income-country users average 2.2 GB of mobile data a month
  (ITU, Facts and Figures 2025).
- Not yet done: student test, real-phone test on a cheap Android, a filmed
  whiteboard benchmark, an NGO/school partner.

Never claim "20x less data" or results from tests that haven't been run.

## Website status

The public website is built (landing page + app on `app.html`). It covers the
Conrad Innovation Stage requirements (due **January 7, 2027**): story
(mission, vision, values), the working prototype with imagery, the brand, and
a direct link. Still to do by the team:

- Rewrite the mission, vision, values and model text in `index.html` in the
  team's own words (the current wording is an AI-written draft).
- Add team names and a contact email (marked `TEAM:` in `index.html`).
- Keep numbers identical across the website, the Innovation Brief and the
  video. The headline numbers appear in `index.html` and `results.html`.

## Rules for working on this

- Explain changes in plain language. The team are high-school students who
  must be able to explain how Vecta works to judges.
- Test offline mode, record mode and audio on a real phone after changes.
- Conrad rules: AI help must be cited, and AI must not be the primary author
  of submission text (brief, video script). Code help is fine but disclose it.
- Do not add analytics, trackers or external scripts that send student data.
