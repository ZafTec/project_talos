---
name: astro-tailwind-expert
description: Expert workflows for developing Astro sites in this repository with Tailwind CSS v4 (via @tailwindcss/vite). Use when creating or modifying Astro pages, layouts, components, routes, Markdown pages, or Tailwind styling/configuration for this project.
---

# Astro + Tailwind Expert (Repo Skill)

## Use these project facts
- Treat `src/pages/` as the routing surface. Each `.astro` or `.md` file becomes a route.
- Keep shared structure in `src/layouts/`. The default layout is `src/layouts/Layout.astro`.
- Load global styles from `src/styles/global.css` (already imported in `Layout.astro`).
- Rely on Tailwind v4 via `@tailwindcss/vite` in `astro.config.mjs`.
- Use the `@/*` alias for `src/*` (configured in `tsconfig.json`).
- Leave build output in `dist/` and dependencies in `node_modules/` untouched.
- Refer to Astro docs: https://docs.astro.build/llms-full.txt and Tailwind docs: https://tailwindcss.com/docs for guidance. Use Context7 and/or Astro Docs MCP for up-to-date info.
- Use Bun for all package operations (`bun add`, `bun remove`, `bun update`) instead of npm.

## Workflow: create or update a page
1) Create or edit a file in `src/pages/`.
2) Import the layout with `import Layout from '@/layouts/Layout.astro';`.
3) Wrap page content in `<Layout>...</Layout>`.
4) Use Tailwind utility classes for styling.
5) If the page needs a sub-route, create a folder in `src/pages/` and add `index.astro`.

## Workflow: add a new layout or shared wrapper
1) Create a new layout in `src/layouts/`.
2) Import `@/styles/global.css` once in the layout frontmatter.
3) Provide a `<slot />` for page content.
4) Use this layout by importing it in pages that need it.

## Workflow: add a reusable component
1) Create `src/components/` if it does not exist.
2) Add `.astro` components there.
3) Keep components focused and stateless unless state is required.
4) Use component props with `Astro.props` in frontmatter.
5) Import components with `@/components/...`.

## Workflow: use client islands
- Keep pages mostly static; hydrate only what needs interactivity.
- Use `client:load`, `client:visible`, or `client:idle` on React/TSX islands.
- Avoid global client JS when an island will do.
- Prefer `is:inline` scripts for small interactions scoped to a section.

## Workflow: use images
- Use `import { Image } from 'astro:assets'` for optimized images.
- Store optimized images under `src/assets/` and import them.
- Keep unoptimized/static files (favicons, robots.txt, manifest) under `public/`.
- Provide explicit `width`, `height`, and `sizes` for `Image`.

## Workflow: environment variables
- For build-time config, use `import.meta.env`.
- For runtime server config (SSR/API routes on Node), prefer `process.env`.
- Never expose secrets to the client; only use public vars in client code.

## Workflow: style with Tailwind
- Prefer utility classes over custom CSS for one-off styles.
- Place shared or base styles in `src/styles/global.css`.
- If you need design tokens or theme extension, add a Tailwind config and include Astro file globs in `content`.
- Keep class names readable and scoped to the element they affect.

## Workflow: author Markdown routes
- Add `.md` files under `src/pages/` for simple content routes.
- Use frontmatter for titles, metadata, or layout selection.
- Keep Markdown lightweight; move advanced layouts to `.astro`.

## Astro patterns to use
- Use frontmatter for imports and server-side logic.
- Use `class:list` only when conditional classes are necessary.
- Keep layout structure in `Layout` folder; keep page-specific markup in pages.
- Make use of @/ alias for cleaner imports. Implement it if not configured.
- Prefer `export const prerender = false` for API routes that must run at request time.
- Refer to latest docs online for new features or best practices.

## Quality checks
- Run `bun dev` for local development.
- Run `bun build` before shipping changes.
- Use `bun preview` to verify the built output.

## Change discipline
- Make minimal, focused edits.
- Avoid editing generated output in `dist/`.
- Avoid editing dependency artifacts in `node_modules/` or lockfiles unless asked.
