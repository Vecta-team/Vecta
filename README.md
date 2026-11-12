# Vecta

Crystal-clear lessons for the price of a voice note.
Live site: https://vecta-team.github.io/Vecta/

Vecta sends a lesson as the teacher's voice plus a small file of drawing
instructions, not video. The student's phone draws the board itself.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Front page: the problem, how Vecta works, a live demo lesson, measured results, mission, team, contact. |
| `app.html` | The lesson app: library, player, offline downloads, `.vecta` files. |
| `record.html` | Record a lesson with microphone and pen. |
| `results.html` | Full test results. |

There is no build step. The site is plain HTML, CSS and JavaScript, served by
GitHub Pages from the `main` branch. `CLAUDE.md` explains every file.

## Before you edit

- After changing any file, change the cache name at the top of `sw.js`
  (for example the date in `vecta-app-site-2026-11-12`). Otherwise phones that
  saved the app for offline use keep showing the old version.
- Use only the measured numbers listed in `CLAUDE.md`.
- Search `index.html` for `TEAM:` to find the places waiting for your own
  words, names and contact email.

## Credits

Built by the Vecta team. Website and app code written with help from Claude,
an AI assistant made by Anthropic. Equations use KaTeX (MIT licence). Headings
use Bricolage Grotesque (SIL Open Font License).
