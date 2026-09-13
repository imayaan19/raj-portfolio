# 🎂 Viral Birthday App

A self-contained, single-file interactive birthday website — a romantic, scrollable
experience with a tap-to-open envelope, confetti, floating hearts, a typed love letter,
a photo gallery, "reasons I love you" cards, a blow-out-the-candle cake, and a finale.

No build step, no dependencies, no server. Just **open `index.html`** in a browser.

## Make it yours

Open `index.html` and scroll to the **`<script id="CONFIG">`** block near the bottom.
Everything you edit is there:

| Field | What it does |
|---|---|
| `name` | Who the birthday is for |
| `fromName` | Your name (shown in the finale) |
| `age` | Optional — shows a "24 today 🎉" badge. Leave `""` to hide |
| `heroSub` | Subtitle under "Happy Birthday" |
| `letter` | The love note that types itself out (use `\n` for new lines) |
| `photos` | Array of `{ src, caption }`. Put images in this folder (e.g. `"photo1.jpg"`) or use URLs. Empty = pretty placeholders |
| `reasons` | List of reasons — each becomes a numbered card |
| `finaleText` | The closing line |
| `musicUrl` | Direct link to an `.mp3`, or drop `song.mp3` in this folder. Empty = no music |
| `theme` | Tweak the accent/gold colors |

### Photos & music
Drop your image/audio files right inside this `birthday/` folder and reference them by
name, e.g. `{ src: "us.jpg", caption: "our first trip" }` or `musicUrl: "song.mp3"`.
Only use music you have the rights to share.

## Features
- 💌 Tap-to-open envelope intro (also unlocks autoplay music)
- 🎊 Dependency-free confetti engine + floating-hearts background
- ⌨️ Self-typing love letter
- 📸 Polaroid photo gallery
- 💕 "Reasons I love you" cards
- 🎂 Interactive candle — tap the cake **or blow into your mic** to blow it out
- 🔊 Music toggle, mobile-friendly, respects `prefers-reduced-motion`

## Share it
It's just static files, so host it free anywhere:
- **Netlify / Vercel:** drag-and-drop this folder, or point it at the repo
- **GitHub Pages:** enable Pages and link to `/birthday/`
- Or zip it and send — it even works opened straight from disk
