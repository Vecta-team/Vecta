# Vecta Academy prototype (v2)

A working prototype of Vecta: lessons sent as the teacher's voice plus a tiny
drawing file, drawn live on the student's phone.

## What's inside

| Folder | What it is |
|---|---|
| `site/` | The app. Upload everything in this folder to GitHub Pages. |
| `tools/` | Scripts that build the lessons and the offline file list (Python + ffmpeg). |
| `tools/lessons_src/` | The four lesson scripts: what is said and what is drawn. |

**The app has three pages:**

- **Lessons** (`index.html`): the lesson library and player. It also shows each lesson's download size and opens `.vecta` files people send you.
- **Test results** (`results.html`): the measured numbers from the first prototype test, with a chart of data per hour, a readability table and the 3% text comparison. The data is in `data/benchmark.json`. When you run new tests, replace that file and the page updates.
- **Record a lesson** (`record.html`): press Record, then talk and draw. Vecta saves your voice and every stroke as a lesson, not a video. Tools: pen, blue pen, text, equation (typed like `A = \pi r^2`), undo, new page.

**Built-in lessons:**

1. Area of a circle (0:49), real voice
2. Solving a linear equation (0:30)
3. Pythagoras' theorem (0:43)
4. Speed, distance and time (0:25)

Lessons 2–4 still use a placeholder robot voice.

## Put it online with GitHub Pages (about 10 minutes)

**Easiest way:** upload the files in `vecta-site-upload.zip` instead of the `site` folder. They're the same app with no folders inside, so Safari's "choose your files" button can upload them all at once (select all with Cmd+A). To make it yourself, run `python3 tools/make_flat.py`.


1. Create a free account at github.com (one for the team is fine).
2. Click **New repository**. Name it `vecta`, set it to **Public**, and tick **Add a README file**. Click **Create repository**.
3. Click **Add file → Upload files**. Drag in everything **inside** the `site` folder (not the folder itself): `index.html`, `record.html`, `results.html`, `sw.js`, `manifest.webmanifest`, and the `css`, `data`, `icons`, `img`, `js`, `lessons` and `vendor` folders. Click **Commit changes**.
4. Go to **Settings → Pages**. Under **Branch**, choose `main` and `/ (root)`, then click **Save**.
5. Wait 1–2 minutes and refresh. Your link appears at the top, like `https://your-team.github.io/vecta/`.

The link must start with `https://`. Record mode needs it to use the microphone.

## Test it on a phone

1. Open the link once with internet, and wait until the top right says **App works offline**.
2. Tap **Download all** in the lesson library. Each lesson gets a **✓ Saved offline** tag. (Playing a lesson also saves it.)
3. Turn on airplane mode. Close and reopen the page. The saved lessons should still play.
4. Optional: use the browser menu's **Add to Home screen** so it opens like an app.
5. Open **Record a lesson**, allow the microphone, and record a 20-second test. Press **Save to My lessons**, then play it back from the library.
6. Open any lesson, tap **Save as .vecta file** and send it to a teammate on WhatsApp. They open it with **Open a .vecta file**.

## Replace the robot voice with a real one

Record each lesson script in one take, reading the sentences in order. Normal
short pauses are fine: the build lines the script up with your speech to find
each sentence. Then send the file to Claude to rebuild it, or run the tools yourself:

```
cd tools
mkdir recordings
cp ~/your-recording.m4a recordings/area-of-a-circle.m4a   # file name = lesson id
python3 build_lessons.py   # finds each sentence in your recording and re-times the drawings to it
python3 build_site.py      # updates the offline file list
```

Then upload the changed `lessons/` folder and `sw.js` to GitHub again.

The tools need Python 3, ffmpeg, espeak-ng and the `pocketsphinx` Python package
(`pip install pocketsphinx`). Pillow is needed for `build_site.py`.

## Known limits (be honest about these in the pitch)

- **Not yet tested on a real phone.** It was tested in a simulated browser: library, player, captions, record, save, open, and the `.vecta` file format all passed. Test on the team's cheapest Android phone first.
- **Placeholder voices.** Three of the built-in lessons use a robot voice until real recordings replace them.
- **Seeking in recorded lessons.** Lessons recorded in Chrome are saved as WebM audio. Some browsers seek imprecisely in these files, so dragging the slider may land slightly off.
- **Recorded lessons stay on the phone that made them.** To move one, use **Save as .vecta file** and send the file. Built-in lessons can be shared the same way.

## Sizes (measured)

- **Each built-in lesson:** about 7 MB per hour of lesson (voice at 16 kbps plus drawings).
- **Drawing instructions:** about 1 KB per lesson.
- **First visit:** about 730 KB for the app and maths fonts, saved for offline automatically.
- **Download all lessons:** about 290 KB more for all four lessons.
