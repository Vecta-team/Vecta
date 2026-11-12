# tools (reference)

The Python build tools from `vecta-prototype-v2.zip`. They are not part of the
website; nothing here is loaded by the pages.

- `lessons_src/` : the four lesson scripts (what is said, what is drawn).
- `build_lessons.py`, `align_recording.py` : build lesson files and line the
  drawings up with a voice recording.
- `build_site.py` : makes the icons, manifest and offline file list.
- `recordings/` : the original voice recording for "Area of a circle".
- `PROTOTYPE-README.md` : the README that came with the prototype zip.

Two things to know before running them:

1. They read and write a `site/` folder next to `tools/`, with sub-folders
   (`site/lessons/<id>/lesson.json` ...). This repository is flat instead, and
   the zip's `site/` folder was left out because it was a second copy of the
   app. Unzip the prototype somewhere else to run the tools, then copy the
   results here using the flat names (`<id>-lesson.json`, `<id>-voice.opus`).
2. Do not copy the generated `sw.js` or `manifest.webmanifest` over the ones
   here. The ones here know about the landing page and `app.html`.

Needs Python 3, ffmpeg, espeak-ng, pocketsphinx and Pillow.
