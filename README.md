# Anish Gupta — Himalayan Signal

A static Astro portfolio for **guptaanish.com.np**, with a procedural Three.js landscape and an optional Nepali soundtrack. Built around monumental Devanagari typography, a quiet crimson sun, and abstract Himalayan contours.

## Develop

Use Node.js 22.16+ (or a current supported release).

```sh
npm ci
npm run dev
```

Astro 7 manages its development server in the background. Use `npx astro dev status`, `npx astro dev logs`, and `npx astro dev stop` as needed.

```sh
npm run check        # Strict Astro / TypeScript diagnostics
npm run format:check # Prettier formatting check
npm run build        # Static production files in dist/
npm run preview     # Preview the built site
```

The original project had no lint or test commands. This redesign adds strict type checking, Prettier, and browser regression tests; it does not add a separate linter.

## Browser tests

```sh
npx playwright install chromium
npm run build
npm test
```

Tests serve the production build on port 4322. Set `CHROME_PATH` to use an existing Chrome executable. The suite covers navigation, mobile focus handling, responsive layout at 320–2560 px, metadata and local assets, reduced motion, unavailable WebGL, GPU context loss/restoration, page restoration, music controls and failures, JavaScript-disabled navigation, and automated WCAG AA checks. Music tests use an explicit YouTube API double; they do not establish regional playback availability.

## Structure

- `src/pages/index.astro`: composes the complete single-page portfolio.
- `src/layouts/BaseLayout.astro`: metadata, canonical URL, structured data, fonts.
- `src/components/`: semantic Astro sections and narrowly scoped interactive custom elements.
- `src/data/portfolio.ts`: verified identity, interests, and the learning journey.
- `src/scripts/terrain-math.ts`: deterministic ridge function shared by WebGL and SVG generation.
- `src/scripts/three-scene.ts`: GPU resources, adaptive rendering, pointer/scroll response, and disposal.
- `src/scripts/landscape.ts`: lazy loading, reduced-motion preferences, scene lifecycle, and manual pause.
- `src/scripts/audio.ts`: opt-in official YouTube IFrame API, playback state, volume, retry, and cleanup.
- `src/styles/`: responsive design tokens, typography, component styles, and self-hosted fonts.
- `public/`: static mountain fallback, social preview, favicon, crawler files, font licenses, and the preserved domain configuration.

## Content and editing

The original repository contained a botanical coming-soon page, Kathmandu location/coordinates, email, Instagram, and a Nepal clock. It did not contain client projects, professional experience, or measurable achievements. The new site preserves the identity, links, location, clock, and the original garden as part of the learning journey.

**Himalayan Signal** is the actual portfolio project. The second project card is explicitly labeled as a future-project placeholder. Replace it only when real project content is available. Technology labels describe the site's tools and areas of interest, rather than proficiency ratings. The journey is a creative/learning narrative, not an invented employment timeline.

## Motion and performance

All portfolio content is rendered to HTML. No React or other hydration runtime is shipped. The renderer is dynamically imported; visitors requesting reduced motion never download it. A deterministic SVG remains usable without JavaScript or WebGL and during initialization.

The scene caps pixel ratio, uses fewer vertices/particles on weaker devices, reduces resolution when rendering is slow, and pauses offscreen, when hidden, or on explicit request. The previous context is disposed and its canvas replaced when restarting after a motion preference change or page restoration. Geometries, materials, renderer caches, animation frames, observers, and listeners are released. No GPU textures are used.

The Three.js scene is about 131 KB gzip (534 KB minified), which triggers Vite's default 500 KB chunk advisory. It remains separate from the small interface scripts and is never required to read or navigate the site. The SVG fallback is about 45 KB gzip. The two font subsets are served locally.

## Soundtrack

The original song URL is preserved: <https://www.youtube.com/watch?v=taNFbSuESXA>.

Opening the control panel does not contact YouTube. The first **Play** action loads the official API and a visible privacy-enhanced embed. The embedded video keeps native controls and a viewport exceeding 200 × 200 px. Closing the panel or hiding the page pauses playback; returning never resumes sound automatically. The UI handles API failure, video errors, blocked autoplay, and supports a retry or direct YouTube link. Volume control follows the YouTube API; mobile platforms may reserve final volume control for hardware buttons.

The remote song was unavailable in the development browser. The fallback was verified, and playback, pause, mute, volume, and retry behavior are tested with the API double. Verify actual regional playback on the deployed domain. No audio has been downloaded or bundled.

Implementation references: [Astro client scripts](https://docs.astro.build/en/guides/client-side-scripts/) and the [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference).

## Assets

The mountain illustration and favicon are original procedural/vector artwork. Space Grotesk and Noto Sans Devanagari are bundled from Fontsource under the SIL Open Font License; copies are in `public/licenses/`.

```sh
npm run assets:generate                         # Regenerate the static landscape
node scripts/generate-social.mjs               # Regenerate the 1200 × 630 social image
```

The social-image generator uses Playwright and requires a browser installed as described above.

## Deployment

The existing GitHub Pages setup is retained in `.github/workflows/astro.yml`, `astro.config.mjs`, `public/CNAME`, and `public/.nojekyll`. The canonical domain remains **https://guptaanish.com.np/**. Set GitHub Pages to use GitHub Actions. A push to `main` runs the checks, builds, tests, and deploys the `dist/` artifact.

No backend, environment secrets, or contact-form service is required. Contact actions use the real email and Instagram links. No deployment is performed by local development commands.
