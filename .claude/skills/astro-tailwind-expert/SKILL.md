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
- **Dockerized Deployment**: The project is containerized using Docker. Ensure changes are compatible with the `Dockerfile` environment.
- **Node Adapter**: Uses `@astrojs/node` in standalone mode for server-side rendering features where needed.

## Workflow: Database Access
- **Client**: Use Bun's native SQL client: `import { sql } from "bun";`. Do NOT install external drivers like `pg` or `postgres` unless strictly necessary.
- **Connection**: configure via `DATABASE_URL` environment variable.
- **Pattern**: Create a `src/lib/db.ts` to export the `sql` instance and initialization logic.
- **Initialization**: Run table creation queries (CREATE TABLE IF NOT EXISTS) lazily on app startup or first request.
- **Safety**: Use parameterized queries (template literals) to prevent SQL injection (e.g., `sql`SELECT * FROM users WHERE id = ${id}``).

## Workflow: Server-Side Logic (API & SSR)
- **Adapter**: Configured with `@astrojs/node` in `standalone` mode (`output: 'server'` in astro config).
- **Entry Point**: The build generates a standalone server at `dist/server/entry.mjs`.
- **Docker Command**: Run the server directly with `CMD ["bun", "./dist/server/entry.mjs"]`.
- **API Routes**: Place endpoints in `src/pages/api/*.ts`. Use `APIRoute` type for type safety.

## Workflow: create or update a page
1) Create or edit a file in `src/pages/`.
2) Import the layout with `import Layout from '@/layouts/Layout.astro';`.
3) Wrap page content in `<Layout>...</Layout>`.
4) Use Tailwind utility classes for styling.
5) If the page needs a sub-route, create a folder in `src/pages/` and add `index.astro`.
6) **Static vs SSR**: Explicitly set `export const prerender = true;` in the frontmatter for any page that does not require dynamic server-side logic (e.g., API calls, dynamic routing based on request). This ensures images and static assets are optimized at build time.

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
- **Note**: Ensure `prerender = true` is set on pages using `astro:assets` to enable build-time optimization.

## Workflow: environment variables
- For build-time config, use `import.meta.env`.
- For runtime server config (SSR/API routes on Node), prefer `process.env`.
- Never expose secrets to the client; only use public vars in client code.
- Use `.env.example` as a template for required variables.

## Workflow: style with Tailwind
- Prefer utility classes over custom CSS for one-off styles.
- Place shared or base styles in `src/styles/global.css`.
- If you need design tokens or theme extension, add a Tailwind config and include Astro file globs in `content`.
- Keep class names readable and scoped to the element they affect.
- **Dark Mode**: Use `dark:` variants for dark mode styling. The system preference is automatically detected (media strategy). Avoid manual theme togglers unless requested.

## Workflow: author Markdown routes
- Add `.md` files under `src/pages/` for simple content routes.
- Use frontmatter for titles, metadata, or layout selection.
- Keep Markdown lightweight; move advanced layouts to `.astro`.

## Astro patterns to use
- Use frontmatter for imports and server-side logic.
- Use `class:list` only when conditional classes are necessary.
- Keep layout structure in `Layout` folder; keep page-specific markup in pages.
- Make use of @/ alias for cleaner imports. Implement it if not configured.
- Prefer `export const prerender = false` ONLY for API routes or pages that strictly require request-time data. Default to `prerender = true` for everything else.
- Refer to latest docs online for new features or best practices.

## Quality checks
- **ALWAYS** run `bun run check` (which runs `astro check`) before building or shipping. This catches type errors and template issues.
- Run `bun dev` for local development.
- Run `bun build` before shipping changes.
- Use `bun preview` to verify the built output.

## Key Configuration Details
- **Tailwind v4**: Uses `@tailwindcss/vite` plugin in `astro.config.mjs`
- **No tailwind.config**: Theme customization done via `@theme` in `src/styles/global.css`
- **Path alias**: `@/*` maps to `src/*` (configured in `tsconfig.json`)
- **Package manager**: Bun (use `bun install`, `bun add`, etc.)
- **Available scripts**: `dev`, `build`, `preview`, `check`

## Responsive Design Best Practices
- Use mobile-first approach with Tailwind breakpoints (`sm:`, `md:`, `lg:`)
- Test on small screens: ensure logos, titles, and content don't overlap
- Use `min-h-screen` instead of `h-screen` for flexible hero sections
- Hide secondary text on mobile: `hidden sm:block`
- Scale typography responsively: `text-3xl sm:text-5xl lg:text-7xl`

## Change discipline
- Make minimal, focused edits.
- Avoid editing generated output in `dist/`.
- Avoid editing dependency artifacts in `node_modules/` or lockfiles unless asked.
