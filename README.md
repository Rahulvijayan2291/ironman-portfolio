# STARK SYSTEMS // Rahul Vijayan: 3D Portfolio

An interactive Iron Man "command centre" portfolio. React + TypeScript + Vite, with Three.js (React Three Fiber + Drei), Framer Motion and GSAP.
The 3D hero uses the **supplied GLB**, not a stand-in model.

> *"I don't just write code. I engineer systems that move ideas into reality."*

## Requirements

- Node.js **20.19+** or **22.12+** (built and tested on Node 25)
- npm 10+
- A browser with WebGL2/WebGL1. Without WebGL the site shows a static poster and stays fully readable.

## Setup

```bash
npm install
cp .env.example .env     # optional; see "Configuration"
npm run dev              # http://localhost:5173
```

```bash
npm run build            # typecheck (tsc -b) + production build -> dist/
npm run preview          # serve dist/ locally on http://localhost:4173
```

## Configuration (`.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_LINKEDIN_URL` | Your LinkedIn profile URL. **Until set, Contact shows a visible "replace before launch" placeholder** (no dead link). |
| `VITE_FORM_ENDPOINT` | Optional form backend (e.g. Formspree `https://formspree.io/f/xxxx`). If empty, the contact form validates and then opens a prefilled email draft. Nothing is faked as "sent". |
| `VITE_SITE_URL` | Production origin (e.g. `https://rahulvijayan.dev`). Used for absolute Open Graph/Twitter image URLs. |

## Launch checklist (placeholders that need your confirmation)

Content lives in one file: [`src/data/content.ts`](src/data/content.ts). Anything unknown is `null` and rendered as an explicit placeholder.

- [ ] **LinkedIn URL**: set `VITE_LINKEDIN_URL`.
- [ ] **Employment dates** for IBM ISL, TCS and ClaySys (`period: null`).
- [ ] **ClaySys**: role title, dates and responsibilities (nothing was invented).
- [ ] **Vervue**: live URL (`links[0].href`, currently `null`).
- [ ] **DSA Visualizers**: repository/demo URLs. Add only verified links.
- [ ] **LeetCode "global top 1%"**: held back (`verified: false`) until your latest profile confirms it; flip the flag to publish.
- [ ] **Profile photo**: placeholder in `About.tsx`; add `public/profile.jpg` and swap the placeholder block for an `<img>` with real alt text.
- [ ] Confirm the **"3.5+ years"** hero indicator and the **2221 / 60% / 130+ / 100+ / 6** figures (taken verbatim from your brief).
- [ ] Set `VITE_SITE_URL` before deploying so social previews resolve.

## Project structure

```
src/
  data/content.ts          all copy, links and placeholders
  components/
    Intro.tsx              cinematic intro (GSAP, lazy-loaded, skippable)
    Navbar.tsx  Cursor.tsx  HeroScene.tsx  Reveal.tsx  SectionHead.tsx
    sections/              Hero, About, Experience, Skills, Projects, Achievements, Contact
  three/
    Stage.tsx              Canvas, lights, studio env, atmosphere, camera rig, reset
    Armor.tsx              GLB fit, bone-attached FX, action state machine, idle life, head-tracking
    actions.ts             procedural poses + timelines (fire / flight / scan)
    anchors.ts             measured reactor/palm/boot anchors + bone parenting helper
    Fx.tsx                 chest reactor, palm repulsors + beams, boot thrusters, floor/scan rings
    quality.ts webgl.ts glow.ts bus.ts
  lib/ sound.ts session.ts    hooks/ useCountUp.ts
  styles/                  base, layout, sections, intro CSS
public/models/             ironman.glb (2K) + ironman-lite.glb (1K)
model-source/              original untouched GLB (not served)
scripts/optimize-model.mjs reproducible GLB optimisation
```

## The 3D model: what was inspected and what was done

Inspected (glTF JSON + three.js bind-pose bounds):

- 1 skinned mesh (`Iron_Man_mark_7_Subsurf_`, ~137k verts / ~143k tris), 1 PBR material (base colour, normal, metal-rough, **baked emissive**), four 4096² PNG textures.
- The mesh is skinned **only** to the `iron man_Rigify` armature (`DEF-*` bones). Two other armatures (CC rig, metarig) and IK helper nodes are unused.
- **3 animation clips, all T-pose** (`…0_T-Pose`). They are **not** suit-up/flight/combat, so they are not played. Motion is procedural instead.

Optimisation (`scripts/optimize-model.mjs`): drops the T-pose clips and unused armatures, resizes textures to 2048/1024 WebP, quantises and meshopt-compresses.
**37.5 MB -> 4.7 MB (full) / 3.3 MB (lite).** Original preserved in `model-source/`. Materials and textures are otherwise untouched.

Effect alignment, measured on the real geometry (ray-casts + bone world positions):

- **Arc reactor** centre ≈ `(0, 3.81, 0.451)`, surface normal ≈ `(-0.05, 0.32, 0.95)`, parented to bone `DEF-spine.003`.
- **Palms**: inner palm surface ≈ `(±0.905, 2.57, 0.045)`, parented to `DEF-hand.L/.R`. In this A-pose the palms face the thighs, and the glow follows that.
- The effects are children of those bones, so they move with the skeleton. They never float independently (verified by rotating the camera and by the head/breath rig).

### Procedural actions

Because the supplied clips are T-pose only, every action is authored in code (`src/three/actions.ts`) as joint deltas on top of the bind pose, driven through the real skeleton so the reactor, repulsors and thrusters stay attached while the suit moves.

| Control | What happens |
| --- | --- |
| **FIRE** (or click the armour) | Right arm raises and aims, torso twists, a repulsor beam fires with recoil; the left arm follows. |
| **FLIGHT** | Suit leans forward, arms sweep back, lifts and hovers; boot thrusters ignite and shockwave rings pulse on the floor. |
| **SCAN** | Arms open, head sweeps side to side while a holographic ring scans up the body; the reactor flickers. |
| **CHARGE REPULSORS** | Palm glows ramp up for 6 s. |

- Pressing the running action again cancels it. Dragging the model rotates the camera and does not fire.
- **Idle life:** breathing, weight shift, arm sway, occasional glances, pointer head-tracking. If the visitor is inactive for ~9 s, a demo action (fire, scan, flight) plays by itself, silently. The demo is not announced to screen readers.
- Sound effects for each action only play if the visitor has turned sound on.
- Under `prefers-reduced-motion` there is no idle motion, no auto-demo and no lift/lean; actions (on click) show the pose and glow without animated movement.
- To tune a pose, edit `POSES` and `sampleAction` in `src/three/actions.ts`. Angles are model-space radians layered on the bind rotation.

## Performance and accessibility

- 3D chunk is **lazy-loaded after the poster paints** and the browser is idle. A WebP poster is the LCP element and the WebGL fallback.
- Device-aware quality (`quality.ts`): full/lite GLB, DPR caps, sparkle count; `PerformanceMonitor` lowers DPR at runtime.
- Render loop pauses when the hero is off-screen or the tab is hidden; shadows are baked once.
- Reduced motion: no intro, no pointer/idle motion, no parallax/sparkles, instant scrolling.
- Intro is an overlay (page is already rendered beneath), skippable (button / `Esc`), remembered for the session.
- Sound is **off by default**, procedural (no audio files), and enabled only by the visitor.
- Custom cursor is decorative only (native cursor is kept) and is disabled on touch/reduced motion.
- Keyboard: skip link, visible focus rings, focusable skill nodes, accessible mobile menu, form errors announced.

Lighthouse (mobile profile, headless Chrome, software-throttled): Performance ~88-90, Accessibility 100, Best Practices 100, SEO 100.

## Deployment

The build is a static site with a relative base (`base: './'`), so it works at a domain root or sub-path.

**Vercel / Netlify / Cloudflare Pages**: import the repo, then:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: the three `VITE_*` values above.

**GitHub Pages**: build with `npm run build`, publish `dist/` (e.g. with `actions/deploy-pages`). Relative asset paths work under `/<repo>/`.

**Any static host**: upload `dist/`. Serve `.glb`/`.webp` with long-lived cache headers (`Cache-Control: public, max-age=31536000, immutable` for `/assets/*` and `/models/*`).

## Re-optimising the model

```bash
npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer sharp
node scripts/optimize-model.mjs
```

## Credits and notes

Original design inspired by the Iron Man universe; the brand mark, copy and UI are original and not affiliated with Marvel, Disney or Stark Industries. The 3D model is the one supplied by the site owner. Confirm you hold the rights to publish it.
