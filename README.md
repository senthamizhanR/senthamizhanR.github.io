# R. Senthamizhan — CV Website

A polished, animated personal CV site built with **Vite + React 18 + Framer Motion + Tailwind CSS**.
Inspired by [React Bits](https://www.reactbits.dev/) animation patterns: split-text reveals, blur-up
scroll reveals, magnetic buttons, 3D tilt cards, particle field with linkages, aurora background,
marquee strip, animated counters, cursor glow, and a scroll-progress bar.

Includes a **dark/light theme toggle** that persists in `localStorage` and respects the OS
`prefers-color-scheme` setting on first load. Layout works across mobile, tablet, desktop-mode
phones, and full-screen desktop.

## Quick start

```bash
npm install
npm run dev              # dev server at http://localhost:5173
npm run build            # multi-file production build → dist/
npm run build:single     # single-file build → dist-single/index.html
npm run preview          # preview the multi-file build
```

Requires **Node 18+** (tested on Node 22).

## Two build modes

| Command | Output | When to use |
|---|---|---|
| `npm run build` | `dist/` (HTML + JS + CSS + images as separate files) | **Web hosting** — Netlify, Vercel, GitHub Pages, Cloudflare Pages, any static host |
| `npm run build:single` | `dist-single/index.html` (everything inlined as one ~4 MB file) | **Offline / local viewing** — open by double-click, email, drop on Drive, send as attachment |

The single-file build base64-encodes the JS bundle, CSS, and all three images directly into
the HTML so it works under the `file://` protocol with no server.

## Deploy the multi-file build

`dist/` is fully self-contained. The Vite config uses `base: "./"` so it works at any subpath.

- **Netlify**: drag-and-drop the `dist/` folder into the Netlify dashboard
- **Vercel**: `vercel deploy dist/`
- **GitHub Pages**: push `dist/` to the `gh-pages` branch
- **Cloudflare Pages**: connect the repo, build cmd `npm run build`, output dir `dist`

## Project structure

```
cv-site/
├── src/
│   ├── App.jsx             # all sections (Hero, Research, Publications, etc.)
│   ├── animations.jsx      # React Bits–style animation primitives
│   ├── data.js             # ALL CV CONTENT (single source of truth)
│   ├── index.css           # Tailwind + theme variables (dark/light)
│   ├── main.jsx            # React entry point
│   └── assets/             # portrait.jpg, poster.jpg, award.jpg
├── index.html              # Google Fonts loaded here
├── tailwind.config.js      # Semantic color tokens (bg/fg/accent etc.)
├── postcss.config.js
├── vite.config.js          # Multi-file build config
├── vite.config.single.js   # Single-file build config (inlines images as base64)
└── package.json
```

## Editing your content

### Text content — `src/data.js`

Everything you'd want to change lives here:

- `profile` — name, role, location, email, phone, summary, Scholar/ORCID/GitHub URLs, hero timeline
- `navLinks` — top-bar navigation
- `metrics` — the 4 number tiles (papers, conferences, awards, tenure)
- `marqueeItems` — the scrolling text strip below the hero
- `researchInterests` — the topic cards in the Research section
- `skills` — grouped skill chips in the CV section
- `education`, `experience` — timelines
- `publications` — your papers (year, title, venue, DOI, etc.)
- `projects` — ongoing work-in-progress cards
- `conferences` — talks and posters
- `references` — referee contacts
- `images` — image imports for the build pipeline

After editing, `npm run dev` shows changes live; `npm run build` (or `build:single`) regenerates the deliverable.

### Photos — `src/assets/`

Replace `portrait.jpg`, `poster.jpg`, or `award.jpg` (keep the filenames). They're imported in `data.js`
so Vite handles them — for the multi-file build they're emitted as separate files; for the single-file
build they're base64-inlined into the HTML.

### Theme colors — `src/index.css`

Two CSS variable blocks at the top of `index.css` define every color in the site:

```css
:root, html.dark { --bg: 5 6 10; --fg: 244 239 230; --accent: 255 87 34; ... }
html.light       { --bg: 244 240 232; --fg: 14 18 28; --accent: 204 60 11; ... }
```

Change the RGB triplets to recolor the whole site. All Tailwind classes (`bg-bg`, `text-fg`,
`border-line`, `text-accent`, `text-accent2`, `text-accent3`) read from these variables, so a single
edit retones every section, the particle field, the aurora background, and the shimmer text.

## Animation primitives (in `src/animations.jsx`)

| Component         | What it does                                              |
|-------------------|-----------------------------------------------------------|
| `SplitText`       | Letter-by-letter reveal on scroll                          |
| `ShinyText`       | Animated gradient shimmer sweep over text                  |
| `BlurReveal`      | Fade-up + blur-out on scroll                               |
| `TiltCard`        | 3D pointer-tracked tilt with spring physics                |
| `MagnetButton`    | Magnetic hover for buttons/links                           |
| `ParticleField`   | Canvas particle network with proximity linkages            |
| `AuroraBackground`| Conic gradient + radial accents + grid + grain             |
| `Marquee`         | Continuous horizontal scrolling strip                      |
| `Counter`         | Animated count-up on view                                  |
| `CursorGlow`      | Soft gradient blob following the cursor                    |
| `ScrollProgress`  | Top progress bar tied to page scroll                       |

All respect `prefers-reduced-motion` via `src/index.css`.

## Typography

Loaded from Google Fonts in `index.html` with `preconnect` for fast delivery:

- **Display:** Fraunces (variable, opsz-aware, italic supported)
- **Body:** Manrope
- **Mono:** JetBrains Mono

To swap, edit the `<link>` in `index.html` and the `fontFamily` block in `tailwind.config.js`.

## Responsive layout

The hero uses a fixed-width portrait column (`18rem` on tablet/desktop-mode-mobile, `22rem` on full
desktop) that kicks in at the `md:` breakpoint (768px). This means phones in Chrome's "desktop site"
mode (which report ~980px wide) get the proper side-by-side layout, not the mobile stacked layout.

Real mobile viewports (under 768px) keep the stacked layout with text first, portrait below.

## Common tweaks

**Add another publication:** push a new object to the `publications` array in `data.js` with
`{ title, authors, venue, cite, year, status, doi, href, tag }`.

**Add a new project:** push to the `projects` array with `{ n, title, description, tags }`.

**Change the theme default:** edit the `useState` initializer in `App.jsx`'s `ThemeProvider`.
Currently it reads `localStorage`, then falls back to OS preference, then to dark.

**Tune marquee speed:** edit `animation: marquee-scroll 40s linear infinite;` in `src/index.css`.

**Tune other animation speeds:** the keyframes live in `tailwind.config.js` (`animation` block).

## License

The code is yours to use however you like. The CV content is © R. Senthamizhan.
