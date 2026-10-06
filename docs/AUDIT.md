# Project audit

**Date:** 2026-10-06 · **Commit:** `6b58d42` + uncommitted doc/ESLint/next.config changes · **Scope:** everything tracked in git, plus local tooling config.

## How this was checked

| Check                                                          | Result                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                               | ✅ clean (also clean in a fresh copy without `next-env.d.ts`, the way CI sees it)                 |
| `pnpm lint`                                                    | ✅ clean                                                                                          |
| `pnpm format:check`                                            | ✅ clean                                                                                          |
| `prisma validate` / `prisma migrate status`                    | ✅ schema valid, local DB up to date (1 migration)                                                |
| `pnpm build`                                                   | ❌ fails: `Can't resolve 'tw-animate-css'` (`src/app/globals.css:2`)                              |
| `pnpm dev`, `GET /`                                            | ❌ **HTTP 500** (same CSS error, from the running dev server via next-devtools `get_errors`)      |
| `pnpm build` in a scratch copy **with** a `postcss.config.mjs` | ✅ builds; `/` is dynamic, `/_not-found` static; Prisma + `pg` are traced into `.next/standalone` |
| `pnpm audit`                                                   | ⚠️ 5 advisories (4 high, 1 moderate), all transitive                                              |
| `pnpm outdated`                                                | patch updates available for `next`, `eslint-config-next`, `lucide-react`, `dotenv`, `@types/node` |

The code is small: the repo is still essentially the `create-prisma` scaffold plus tooling and docs. Most of the risk is in **what is broken today** (no CSS pipeline), **CI not catching it**, and a few **foot-guns that will bite once real features land**. The architecture plan is solid. Items already tracked in ARCHITECTURE.md's Implementation status or DESIGN.md's Setup status are marked _(tracked)_. They're listed here so the backlog is in one place.

---

## Summary by priority

| #   | Priority | Area       | Finding                                                                                             | Effort | Status                                                                                                                                              |
| --- | -------- | ---------- | --------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 🔴 P0    | Build      | No `postcss.config.mjs`, so **both `dev` and `build` are broken** (every page 500s)                 | 2 min  | ✅ Fixed (`postcss.config.mjs`, commit `01e18c5`)                                                                                                   |
| 2   | 🔴 P0    | CI         | CI never runs `pnpm build`, so it is green while the app cannot build                               | 5 min  | ✅ Fixed: CI runs `pnpm build`                                                                                                                      |
| 3   | 🔴 P0    | Docs       | AGENTS.md says "`pnpm dev` still runs". It doesn't, and the stated cause is wrong                   | 2 min  | ✅ Fixed (commit `01e18c5`)                                                                                                                         |
| 4   | 🟠 P1    | Deploy     | `pnpm start` uses `next start` with `output: "standalone"` (Next warns it does not work)            | 10 min | ✅ Fixed: `start` runs `node .next/standalone/server.js`; `build` copies static assets (`scripts/copy-standalone-assets.mjs`)                       |
| 5   | 🟠 P1    | Deploy     | README tells you to put the **production** `DATABASE_URL` in your local `.env` to deploy            | 15 min | ✅ Fixed: `prisma.compute.ts` reads `.env.compute`; README rewritten                                                                                |
| 6   | 🟠 P1    | Runtime    | Prisma client has no dev HMR singleton → connection pool leak on every edit _(tracked)_             | 10 min | ✅ Fixed: `src/server/db.ts` singleton (connections stayed flat across 10 HMR reloads)                                                              |
| 7   | 🟠 P1    | Runtime    | Demo page swallows every DB error, returns 200, and logs nothing                                    | 10 min | ⚠️ Fixed, with a caveat: setup errors show the hint and are logged, and anything else renders `error.tsx`, but still with HTTP 200 (see Fix status) |
| 8   | 🟠 P1    | Theme      | `--font-sans` is self-referential → page renders in browser serif _(tracked)_                       | 10 min | ✅ Fixed: Geist via `next/font`                                                                                                                     |
| 9   | 🟠 P1    | Security   | No security headers; `X-Powered-By: Next.js` is sent _(tracked as planned)_                         | 30 min | ⚠️ Partly fixed: static headers and `poweredByHeader: false`. The nonce CSP waits for `proxy.ts`                                                    |
| 10  | 🟠 P1    | Deps       | 5 audit advisories; unpinned `latest` deps and `dlx …@latest` tools                                 | 20 min | ⚠️ Partly fixed: 5 → 2 advisories (`braces` has no patch yet; `deepmerge-ts` waits on Prisma). Versions pinned                                      |
| 11  | 🟡 P2    | Data model | `User.email` uniqueness is case-sensitive (`A@x.com` ≠ `a@x.com`)                                   | 20 min | ✅ Fixed: `@db.Citext` (migration `user_email_citext`; verified to return P2002)                                                                    |
| 12  | 🟡 P2    | Runtime    | `dotenv` loaded inside app code: redundant under Next, logs on every load, can mask missing env     | 5 min  | ✅ Fixed: removed from app code; `quiet: true` elsewhere; now a devDependency                                                                       |
| 13  | 🟡 P2    | Tooling    | `@types/node` 26 vs runtime Node 24 (`.nvmrc`) / 22 (`engines`)                                     | 2 min  | ✅ Fixed: `@types/node` ^22                                                                                                                         |
| 14  | 🟡 P2    | Future bug | `prisma/seed.ts` imports the app client; once it gets `server-only`, the seed will crash            | 10 min | ✅ Fixed: the seed builds its own client                                                                                                            |
| 15  | 🟡 P2    | CI         | Missing checks: `prisma validate`/`format`, migration drift, audit, `next typegen`                  | 30 min | ✅ Fixed: validate/format, `next typegen` in `typecheck`, report-only audit, migration drift job, Dependabot                                        |
| 16  | 🟡 P2    | CI         | commitlint on push only checks the **last** commit                                                  | 5 min  | ✅ Fixed: checks the whole pushed range                                                                                                             |
| 17  | 🟡 P2    | Demo page  | "N total" is really "N shown" (`take: 10`); no `select`; dates in server timezone                   | 10 min | ✅ Fixed: "Latest N of M", `select` via the DAL, UTC dates, `createdAt` index                                                                       |
| 18  | 🟡 P2    | Theme      | Popover tokens unmapped, no radius scale, `dark:` variant misses `<html>` itself _(partly tracked)_ | 15 min | ✅ Fixed: popover mapped, Tailwind's default radius scale (no custom `--radius`), `&:where(.dark, .dark *)`, ThemeProvider                          |
| 19  | ⚪ P3    | Docs       | ARCHITECTURE.md §5 JSON-LD line renders "escapes `<` as `<`" (the `\u003c` escape was lost)         | 1 min  | ✅ Fixed                                                                                                                                            |
| 20  | ⚪ P3    | Misc       | Smaller cleanups (see [§ Low-priority cleanups](#low-priority-cleanups))                            | —      | ✅ Fixed or recorded (see Fix status)                                                                                                               |

### Fix status (2026-10-06)

Every finding was worked through. Each row's **Status** column says what changed. Still open:

- **#7, HTTP status for real failures.** `src/app/loading.tsx` wraps the page in a Suspense boundary, so the response streams and the status is committed as 200 before the query fails. `error.tsx` still renders (verified) and the error is logged with a digest, but crawlers and uptime checks see 200. That conflicts with ARCHITECTURE §5 ("`error.tsx` must not mask 5xx as 200") and AGENTS.md ("every async segment gets `loading.tsx`"). Decide which rule wins for this route: drop `loading.tsx` here to get a real 500, or accept 200 and rely on logs plus a `/api/health` check (§12).
- **#9:** the nonce-based CSP comes with `src/proxy.ts`.
- **#10:** `braces` (no patched release yet) and `deepmerge-ts` (waits on Prisma). CI audits in report-only mode until they clear.
- **CI changes** (#2, #15, #16) are syntax-checked locally but only proven once they run on GitHub.

---

## 🔴 P0: Fix now

### 1. Missing PostCSS config breaks dev **and** build

- **Where:** repo root (no `postcss.config.mjs`); symptom at `src/app/globals.css:2`.
- **What happens:** `tw-animate-css` only exports a `"style"` condition (`node_modules/tw-animate-css/package.json`). Without `@tailwindcss/postcss`, Turbopack's plain CSS resolver handles `@import "tw-animate-css"`, ignores that condition, and fails. Tailwind's `@import "tailwindcss"`, `@theme`, `@apply`, and `@custom-variant` are also never compiled.
- **Impact:** every route returns **500** in `pnpm dev` (confirmed on the running server) and `pnpm build` exits 1.
- **Fix (verified in a scratch copy: the build passes):**

  ```js
  // postcss.config.mjs
  const config = { plugins: { "@tailwindcss/postcss": {} } };
  export default config;
  ```

  Then update DESIGN.md Setup status, the ARCHITECTURE.md status row, and the AGENTS.md gotcha in the same change.

### 2. CI does not build the app

- **Where:** `.github/workflows/ci.yml` (`quality` job runs generate → typecheck → lint → format only).
- **Impact:** CI is green on `main` while the app can't build or serve a page. Next 16 `next build` also type-checks routes and catches RSC/Client boundary errors that `tsc` alone misses.
- **Fix:** add `- run: pnpm build` after `format:check`. It needs no real DB: `page.tsx` is `force-dynamic` and imports Prisma lazily. Once Vitest/Playwright exist, add those jobs too.

### 3. AGENTS.md gotcha is wrong

- **Where:** `AGENTS.md:74`.
- **Claims:** "`pnpm dev` still runs", and that the build fails _because_ `page.tsx` uses scaffold classes.
- **Reality:** `pnpm dev` serves 500s. The build failure comes from the missing PostCSS config (#1). The scaffold classes only make the page unstyled. Agents that trust this note will waste time. Fix the wording, or delete it once #1 lands.

---

## 🟠 P1: Fix before building features

### 4. `pnpm start` is wrong for standalone output

- **Where:** `package.json:13` (`"start": "next start"`) with `output: "standalone"` in `next.config.ts`.
- **Evidence:** Next ships the warning _"next start" does not work with "output: standalone"… Use "node .next/standalone/server.js"_ (`node_modules/next/dist/server/next.js`).
- **Also:** the standalone folder does not include `.next/static` or `public/` (confirmed: `.next/standalone/.next/static` is absent after a build). Without them, a standalone deploy serves no JS or CSS.
- **Fix:**

  ```json
  "build": "next build && cp -r .next/static .next/standalone/.next/ && (cp -r public .next/standalone/ 2>/dev/null || true)",
  "start": "node .next/standalone/server.js"
  ```

  Or keep `next start` for local smoke tests and document the standalone command in README › Deployment. Also check whether Prisma Compute copies the static assets itself.

### 5. Production `DATABASE_URL` in the local `.env`

- **Where:** `README.md:75`, `prisma.compute.ts` (`env: ".env"`).
- **Risk:** the documented deploy flow is "set `DATABASE_URL` in `.env` to the hosted DB, then deploy". Anyone who forgets to switch it back will run `pnpm db:migrate` (or a future `migrate reset`) and `pnpm db:seed` **against production**, from their laptop. It also puts production secrets in a file that every local tool (`dotenv`, editors, agents) reads.
- **Fix:** point Compute at a separate, gitignored `.env.production` (or set the variables in the Compute dashboard/CLI), and keep `.env` local-only. Update the README.

### 6. No Prisma singleton across HMR _(tracked)_

- **Where:** `src/lib/prisma.ts:11-15`.
- **Impact:** in `pnpm dev`, every module reload builds a new `PrismaPg` pool. After a few dozen edits, Postgres hits `too many clients already`. No pool limits are set either.
- **Fix (when moving to `src/server/db.ts`):**

  ```ts
  import "server-only";
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    });
  if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
  ```

  Consider `max`/`idleTimeoutMillis` on the pool, and a pooled URL for serverless hosts (ARCHITECTURE §8 already says so).

### 7. Demo page hides database failures

- **Where:** `src/app/page.tsx:16` (`.catch(() => undefined)`).
- **Impact:** any error (DB down, bad credentials, schema drift, even a programming error) is silently swallowed. The page returns **200** with "Could not query users yet", and nothing is logged. That contradicts ARCHITECTURE §5 ("`error.tsx` must not mask 5xx as 200") and §11 ("log full details server-side").
- **Fix:** at minimum, `console.error` in the catch. Better, let it throw into an `error.tsx` boundary (which also covers the "every async segment gets `error.tsx`" rule). Show the "run migrations" hint only for Prisma error codes such as `P2021` (table missing) and `P1001` (can't reach DB).

### 8. `--font-sans` is cyclic _(tracked)_

- **Where:** `src/app/globals.css:7` (`--font-sans: var(--font-sans) sans-serif;`).
- **Evidence:** the compiled CSS in the scratch build still contains `font-sans:var(--font-sans) sans-serif;`. The variable refers to itself and is missing a comma, so it is invalid and `<html>` falls back to the browser's serif font.
- **Fix:** load a font with `next/font` on `<html>` (for example `variable: "--font-geist-sans"`), then `--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;`.

### 9. No security headers _(tracked as planned)_

- **Evidence:** `curl -I localhost:3000` returns `X-Powered-By: Next.js` and no CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`.
- **Quick win now** (no `proxy.ts` needed): add `poweredByHeader: false` and a static `headers()` block in `next.config.ts` for the non-CSP headers. Add the nonce CSP when `proxy.ts` lands, as ARCHITECTURE §11 plans.

### 10. Dependency hygiene

**Audit advisories** (all transitive; real exposure is low because most are build or dev tooling):

| Package         | Severity    | Via                                                       | Patched                          |
| --------------- | ----------- | --------------------------------------------------------- | -------------------------------- |
| `deepmerge-ts`  | high        | `prisma` → `@prisma/config`                               | ≥ 8.0.0 (major; wait for Prisma) |
| `mysql2`        | high + mod. | `prisma` CLI (also reachable via `@prisma/client`'s peer) | ≥ 3.23.1                         |
| `braces`        | high        | `eslint-config-next` → `fast-glob` → `micromatch`         | ≥ 3.0.4                          |
| `source-map-js` | high        | `next` → `postcss`, `prisma` → `c12` → `magicast`         | ≥ 1.2.2                          |

Fix the semver-compatible ones with `overrides` in `pnpm-workspace.yaml` (`braces`, `source-map-js`, `mysql2`), and re-check `deepmerge-ts` on the next Prisma patch. Add `pnpm audit --audit-level high` to CI (non-blocking at first).

**Unpinned versions** (reproducibility and supply-chain risk):

- `package.json:42` `"@prisma/compute-sdk": "latest"` becomes whatever was current at lockfile time, and `pnpm up` can jump majors silently. Pin a caret range.
- `.mcp.json`, `.vscode/mcp.json`, and `opencode.jsonc` run `pnpm dlx next-devtools-mcp@latest`, so every agent session executes the newest published code. Pin a version.
- README deploy uses `pnpm dlx @prisma/cli@latest`. Pin it, or add it as a devDependency.

**Patch bumps available:** `next`/`eslint-config-next` 16.3.6 → 16.3.8, `lucide-react`, `dotenv`, `@types/node`. Leave `eslint` 10 and `typescript` 7 pinned as AGENTS.md says. `cn` 0.4.0 is a 0.x minor, so read its changelog first. `prisma` 8 is still an RC, so stay on 7.

---

## 🟡 P2: Improvements

### 11. Case-sensitive email uniqueness

- **Where:** `prisma/schema/schema.prisma:12` (`email String @unique`).
- **Impact:** once credentials sign-up exists, `Alice@x.com` and `alice@x.com` become two accounts. That allows duplicate sign-ups and confuses password reset. It's cheaper to fix before the auth tables exist.
- **Fix:** normalise in the Zod schema (`.trim().toLowerCase()`) **and** enforce it in the DB: either `@db.Citext` (enable the `citext` extension in a migration) or a unique index on `lower(email)` in raw SQL.

### 12. `dotenv` inside app code

- **Where:** `src/lib/prisma.ts:1`.
- **Issues:** Next already loads `.env*`. dotenv 18 prints `◇ injected env (1) from .env` every time it loads (confirmed), which pollutes server logs. In a standalone or container deploy, a stray `.env` on disk can silently supply values the platform should have provided.
- **Fix:** remove it from app code (it belongs only in `prisma.config.ts` and scripts). Use `import { config } from "dotenv"; config({ quiet: true })` where it stays. `src/env.ts` (planned) should be the only reader of `process.env`.

### 13. `@types/node` major doesn't match the runtime

- **Where:** `package.json:44` (`^26.6.3`), with `.nvmrc` = 24 and `engines` ≥ 22.22.1.
- **Impact:** types allow Node 26-only APIs that crash on the supported runtimes.
- **Fix:** `@types/node@^22` (matching the `engines` floor), or raise `engines` to 24 and use `@types/node@^24`.

### 14. Seed script will break when the client moves to `server/db.ts`

- **Where:** `prisma/seed.ts:1` imports `../src/lib/prisma`.
- **Impact:** the planned `src/server/db.ts` starts with `import "server-only"`, which **throws** outside the React Server Components condition. `tsx prisma/seed.ts` will crash the day the move happens.
- **Fix:** give the seed its own `new PrismaClient({ adapter })`, or create the client in a `server-only`-free factory (`src/server/create-client.ts`) that both `db.ts` and the seed import.

### 15. CI gaps beyond the build

Add these to the `quality` job:

- `pnpm exec prisma validate` and `pnpm exec prisma format --check`. `.prisma` files are not covered by Prettier or lint-staged.
- **Migration drift:** with a Postgres service container, run `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema --exit-code` so a schema edit without a migration fails CI (AGENTS rule 7).
- `pnpm exec next typegen` before `typecheck`. AGENTS.md tells agents to use the global `PageProps<'/route'>`/`LayoutProps` types, which only exist after typegen. `next-env.d.ts` is gitignored, so CI typecheck will fail as soon as the first page uses them. Add it to the `pre-push` hook too, or make `typecheck` run `next typegen && tsc --noEmit`.
- `pnpm audit --audit-level high` (see #10).
- Renovate or Dependabot (ARCHITECTURE §11 already plans it).

### 16. commitlint only checks the last pushed commit

- **Where:** `.github/workflows/ci.yml:53` (`commitlint --last`).
- **Fix:** on `push`, use `--from ${{ github.event.before }} --to ${{ github.sha }}`, and fall back to `--last` when `before` is all zeros (a new branch).

### 17. Demo page details

`src/app/page.tsx` is getting rewritten anyway, but don't carry these over:

- Line 32: `{users.length} total` shows at most 10 (`take: 10`). Label it "latest 10", or `count()` in parallel.
- Lines 10–15: no `select`; it fetches whole rows (AGENTS rule 4).
- Line 5: `Intl.DateTimeFormat("en")` on the server formats in the **server's** time zone (UTC in prod). Pass `timeZone`, or format on the client.
- Classes `shell`, `panel`, `users`, … no longer exist in `globals.css` _(tracked)_.
- `layout.tsx:5-6`: title "next-app-prisma", description "Generated by create-prisma", no `metadataBase`/title template/`viewport` _(tracked under SEO)_.
- Ordering by `createdAt` on a users list needs `@@index([createdAt])` once the table grows (ARCHITECTURE §8).

### 18. Theme CSS gaps

- `--popover`/`--popover-foreground` aren't mapped in `@theme inline` _(tracked)_. `--radius*` is missing _(tracked)_.
- `src/app/globals.css:4`: `@custom-variant dark (&:is(.dark *))` matches only **descendants** of `.dark`. `next-themes` puts `.dark` on `<html>`, so `dark:` utilities on `<html>` itself never apply. Use `(&:where(.dark, .dark *))`.
- No `prefers-color-scheme` fallback before the ThemeProvider exists, so dark-mode users get light mode.
- `* { outline-ring/50 }` halves focus contrast _(tracked)_.

---

## ⚪ P3

### 19. Docs rendering bug

`ARCHITECTURE.md:146` reads "which escapes `<` as `<`" (the `<` was lost). It should say: escapes `<` as `<`.

### Low-priority cleanups

- **`src/lib/prisma.ts`** exports both `prisma` and `default prisma`. Pick one (named) to keep imports consistent.
- **`prisma.config.ts`** `env("DATABASE_URL")` throws when unset, so `prisma generate` needs a dummy URL (as CI does). That's fine, but document it in README Quick start, or read the URL via `process.env` for `generate`-only contexts.
- **Production migrations:** `prisma` is a devDependency and isn't in the standalone output, so `prisma migrate deploy` must run from CI or a separate job, not inside the app container. Say so in README › Deployment.
- **`tsconfig.json`** type-checks `src/generated/**` on every run. Harmless today, but slower as the schema grows.
- **`.vscode/settings.json`** commits personal cursor and terminal preferences (`cursorWidth: 5`, blinking, …). Keep only project-relevant settings (formatter, ESLint, tsdk, Tailwind) in the shared file.
- **`.impeccable/`** is ignored through `.git/info/exclude` (local only). Teammates' clones will show it as untracked. Add `/.impeccable/*.local.json` and `/.impeccable/hook.*.json` to `.gitignore`.
- **Performance, when the UI exists:** consider `reactCompiler: true` (Next 16, needs `babel-plugin-react-compiler`) and `typedRoutes: true` (ARCHITECTURE §6 already wants it). Enable `cacheComponents` before writing the marketing pages, so `"use cache"` works from the start.
- **Architecture note (auth):** the planned JWT + DB `Session` registry check (§4) adds a DB read to every `auth()` call. Wrap it in `cache()` per request (planned), add an index on `Session.sessionToken`, and throttle the `lastSeenAt` writes as planned. Measure p95 once it exists.

---

## Suggested order of work

1. `postcss.config.mjs` (#1) → fix the AGENTS.md note (#3) → add `pnpm build` to CI (#2). **Get to green first.**
2. `src/env.ts` + `src/server/db.ts` with the singleton, `server-only`, and no `dotenv` (#6, #12), plus a seed-safe client factory (#14).
3. Fix fonts and theme tokens (#8, #18), rewrite `page.tsx` with utilities and real error handling (#7, #17), and add `error.tsx`/`loading.tsx`.
4. Fix `start` and the standalone assets, and separate prod env from `.env` (#4, #5).
5. Static security headers and `poweredByHeader: false` (#9). The nonce CSP comes with `proxy.ts`.
6. Dependency overrides and pinning, `@types/node` (#10, #13), and the CI extras (#15, #16).
7. Email case-insensitivity (#11) **before** the auth schema migration.
