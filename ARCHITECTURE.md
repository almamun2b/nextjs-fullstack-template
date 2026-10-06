# Architecture

This is the blueprint for a production-grade full-stack template: **Next.js 16 (App Router) + React 19.3 + Prisma 7 (PostgreSQL)** with authentication, user management, SEO, accessibility, performance, and security built in.

Companion docs: [DESIGN.md](DESIGN.md) is the design system (tokens, theming, typography, component conventions); [AGENTS.md](AGENTS.md) holds the day-to-day rules for coding agents; [README.md](README.md) is the human quick start.

The repository started from the `create-prisma` Next.js scaffold. Much of what follows is the **target** design. Check the [Implementation status](#implementation-status) table before you assume a file or feature exists, and update the table in the same change that implements something.

---

## 1. Stack and decisions

| Concern    | Choice                                                                                                             | Why                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 App Router, Turbopack, `output: "standalone"`                                                           | RSC by default, Server Actions, file-based metadata (robots/sitemap/OG). Standalone output is needed for container and Prisma Compute deploys.                                                                                                                                                                                        |
| Language   | TypeScript `strict`                                                                                                | —                                                                                                                                                                                                                                                                                                                                     |
| Database   | PostgreSQL: a local server in development, a hosted database (for example Prisma Postgres) in production           | —                                                                                                                                                                                                                                                                                                                                     |
| ORM        | Prisma 7 with the `prisma-client` generator and the `@prisma/adapter-pg` driver adapter                            | Prisma 7 requires a driver adapter. The client is generated into `src/generated/prisma`.                                                                                                                                                                                                                                              |
| Auth       | **Auth.js v5** (`next-auth@beta`, exact version pinned) with `@auth/prisma-adapter`                                | The standard Next.js auth library: OAuth providers, adapter-managed users and accounts in our own Postgres, and one `auth()` call for RSC, Server Actions, and route handlers. Email/password, 2FA, rate limiting, and admin features (roles, ban, impersonation, session revocation) are not built in, so we build them on top (§4). |
| Validation | **Zod**                                                                                                            | One schema per input, shared by client forms and the Server Action or route that receives it. Also validates env vars.                                                                                                                                                                                                                |
| UI         | Tailwind CSS v4 + shadcn/ui (Radix primitives), `cva`, `cn`, `lucide-react`, `next-themes`                         | Accessible interactive primitives (dialog, menu, popover, combobox) with focus management built in. The components live in our repo. Tokens and conventions: [DESIGN.md](DESIGN.md).                                                                                                                                                  |
| Forms      | Server Actions + `useActionState` + Zod                                                                            | Forms work before JS loads (progressive enhancement), with one validation path.                                                                                                                                                                                                                                                       |
| Email      | `src/server/email` adapter (console transport in dev, provider in prod)                                            | Needed for verification and reset flows.                                                                                                                                                                                                                                                                                              |
| Testing    | Vitest (unit/integration), Playwright + `@axe-core/playwright` (e2e + a11y), Lighthouse CI (perf/SEO/a11y budgets) | —                                                                                                                                                                                                                                                                                                                                     |
| Deploy     | Prisma Compute (`prisma.compute.ts`), or any Node host running the standalone build                                | —                                                                                                                                                                                                                                                                                                                                     |

To change a decision, edit this table and add a short rationale.

---

## 2. Directory layout (target)

```
prisma/
  schema/               Multi-file Prisma schema (one domain per file)
    schema.prisma         generator + datasource
    auth.prisma           User, Account, Session, VerificationToken, TwoFactor
    audit.prisma          AuditLog
  migrations/
  seed.ts               Idempotent seed: admin user + demo users
prisma.config.ts        Prisma 7 config: schema path, migrations, seed, datasource URL
src/
  proxy.ts              Next 16 "proxy" (formerly middleware): CSP nonce, security headers, optimistic auth redirects
  env.ts                Zod-validated env; the ONLY place that reads process.env
  app/
    layout.tsx          <html lang>, root metadata (metadataBase, title template), skip link, providers
    (marketing)/        Public, indexable pages (home, about, pricing, blog, legal)
    (auth)/             sign-in, sign-up, forgot-password, reset-password, verify-email  → noindex
    (app)/              Authenticated area: dashboard, settings/{profile,security,sessions}  → noindex
    admin/              Role-gated user management  → noindex
    api/auth/[...nextauth]/route.ts   Auth.js handlers (GET, POST)
    robots.ts  sitemap.ts  manifest.ts  opengraph-image.tsx  icon.tsx  apple-icon.tsx
    llms.txt/route.ts   Plain-text site guide for AI agents
    not-found.tsx  error.tsx  global-error.tsx
  components/
    ui/                 shadcn/ui primitives (generated; edit sparingly)
    …                   composite components
  lib/                  Isomorphic helpers: site config, SEO/JSON-LD builders, Zod schemas (cn() comes from the `cn` package)
  server/               `import "server-only"` everywhere below
    db.ts               PrismaClient singleton
    auth.ts             Auth.js config; exports handlers, auth, signIn, signOut
    password.ts         argon2id hash/verify
    rate-limit.ts       DB-backed limiter for auth endpoints and expensive actions
    dal/                Data Access Layer: every DB read/write for a domain, with authz
    actions/            Server Actions (thin: parse → dal → revalidate/redirect)
    email/              Transactional email templates + transport
    audit.ts            writeAudit()
  generated/prisma/     Prisma client output (gitignored, never edit)
tests/
  unit/  e2e/
```

Route groups `(marketing)`, `(auth)`, `(app)` do not appear in URLs. Each group has its own `layout.tsx`, so indexing, shell UI, and auth requirements are set once per group.

---

## 3. Request lifecycle and layering

```
Browser ──► proxy.ts ──► RSC page / Server Action / Route Handler ──► server/dal/* ──► server/db.ts ──► Postgres
             │                    │                                      │
             │ CSP nonce,          │ calls getSession() / requireUser()   │ authorization + DTO shaping
             │ security headers,   │ from dal/auth                        │ (never return raw Prisma rows
             │ optimistic redirect │                                      │  containing secrets)
```

Rules that hold across the codebase:

1. **Only `src/server/dal/*` imports `db`.** Pages, actions, and route handlers call DAL functions. The DAL is where authorization happens.
2. **`proxy.ts` is not a security boundary.** It only does cheap cookie-presence redirects for UX. Every DAL function and Server Action checks the session again. This follows Next's own guidance; a proxy/middleware bypass (for example CVE-2025-29927) must not expose data.
3. **Server Actions are public HTTP endpoints.** Each one: (a) parses input with Zod, (b) authenticates and authorizes through the DAL, (c) returns a typed `ActionResult`, never throws raw errors to the client, (d) calls `revalidatePath`/`updateTag` and `redirect` as needed.
4. **DTOs, not models.** The DAL returns plain objects with only the fields the caller needs. `passwordHash`, tokens, and similar fields never cross into a Client Component. Use `import "server-only"` and React `taintUniqueValue` for secrets.
5. **Env access goes through `src/env.ts`.** Only variables prefixed with `NEXT_PUBLIC_` reach the client, and each one needs a stated reason.

Details: `node_modules/next/dist/docs/01-app/02-guides/data-security.md` and `…/authentication.md`.

---

## 4. Authentication and user management

**Library:** Auth.js v5 (`next-auth@beta`), configured in `src/server/auth.ts` and mounted at `src/app/api/auth/[...nextauth]/route.ts` (`export const { GET, POST } = handlers`). Server code reads the session with `auth()`; Server Actions call `signIn()` / `signOut()`. Avoid `SessionProvider` / `useSession`: pass the session DTO down from a Server Component instead. `proxy.ts` does not call `auth()` (see §3, rule 2).

> **Good to know:** v5 is still published under the `beta` tag, so pin an exact version and read the changelog before bumping. As of `@auth/prisma-adapter@2.11.3`, its peer range stops at Prisma 6. Pass it the Prisma 7 client from `src/server/db.ts` and check that `pnpm typecheck` passes. If the types don't line up, write a small adapter in `src/server/auth-adapter.ts`.

**Providers:** Credentials (email + password, our own sign-up), GitHub, and Google. The Email (magic link) provider is optional.

**Sessions:** `session: { strategy: "jwt" }`, because the Credentials provider only works with JWT sessions. To keep sessions listable and revocable anyway, the `jwt` callback writes a `Session` row on sign-in and stores its `sessionToken` in the JWT as the `sid` claim. On later requests it rejects the token if that row is revoked, expired, or belongs to a banned user, and it updates `lastSeenAt` (throttled). Cookies use Auth.js defaults: `HttpOnly`, `Secure`, `SameSite=Lax`, and `__Secure-` prefixed in prod. Sensitive operations (changing a password or email, disabling 2FA, deleting the account) require a recent sign-in (an `authTime` claim in the last 10 minutes).

**Flows:**

| Flow                       | Notes                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign up (email + password) | Our Server Action: Zod password policy, breached-password check (HIBP k-anonymity), argon2id hash, email verification required before sign-in            |
| Sign in                    | Credentials `authorize()`. Generic error message (no user enumeration); rate limited; optional 2FA (TOTP + backup codes) checked before a session exists |
| OAuth                      | GitHub and Google. `allowDangerousEmailAccountLinking` only for providers that verify email addresses; otherwise Auth.js shows `OAuthAccountNotLinked`   |
| Forgot / reset password    | Single-use, time-limited, hashed token in `VerificationToken`; revokes all other sessions on success                                                     |
| Email change               | Verifies the new address before switching                                                                                                                |
| Session management         | The user can list their sessions (`Session` rows) and revoke one or all others                                                                           |
| Account deletion           | Soft-delete with a grace period, then hard-delete; user data export (JSON) for GDPR                                                                      |

**Roles and authorization:** `User.role` is `user | admin`, copied into the JWT and exposed on `session.user.role` (declare it with module augmentation in `src/types/next-auth.d.ts`). The DAL re-reads the role from the database for admin checks, so a demotion takes effect immediately. Helpers in `src/server/dal/auth.ts`:

- `getSession()`: wraps `auth()` with React `cache()`; returns `null` when there is no session
- `requireUser()`: redirects to `/sign-in?next=…` when there is no session
- `requireRole("admin")`: responds `notFound()` (not 403) for non-admins, so admin routes are not revealed

**Admin user management (`/admin/users`):** a paginated, searchable, sortable table (server-side via `searchParams`). Admins can view a user, change their role, ban or unban (with reason and expiry; banning revokes all sessions), revoke sessions, impersonate (a separate `Session` row with `impersonatedBy` set, always audited, with a visible banner), and trigger a password reset. None of this comes from Auth.js; it lives in the DAL and Server Actions. Every admin mutation writes an `AuditLog` row.

**Data model (target):** the Auth.js Prisma adapter models (`User`, `Account`, `Session`, `VerificationToken`, plus `Authenticator` if passkeys are enabled), extended with our fields: `User.passwordHash`, `role`, `banned`, `banReason`, `banExpires`, `deletedAt`; `Session.userAgent`, `ip`, `lastSeenAt`, `revokedAt`, `impersonatedBy`. Add a `TwoFactor` table (TOTP secret encrypted with `TOTP_ENCRYPTION_KEY`, hashed backup codes) and our `AuditLog { id, actorId, action, targetType, targetId, ip, userAgent, metadata Json, createdAt }`. Copy the base models from the Auth.js Prisma adapter docs into `prisma/schema/auth.prisma`.

---

## 5. SEO

All SEO primitives use Next's file-based metadata APIs. Do not hand-write `<head>` tags.

| Item               | Implementation                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Site config        | `src/lib/site.ts`: name, description, canonical origin (`env.NEXT_PUBLIC_SITE_URL`), locale, social handles, default OG image                                                                                                                                                                                                                          |
| Base metadata      | Root `layout.tsx` exports `metadata` with `metadataBase`, `title: { default, template: "%s · Site" }`, `description`, `openGraph`, `twitter`, `robots`, `icons`, `manifest`, `formatDetection`. `viewport` (with a per-scheme `themeColor` that matches `--background`; see [DESIGN.md §3](DESIGN.md#3-theming-and-dark-mode)) is exported separately. |
| Per-page metadata  | `export const metadata` or `generateMetadata()` in every indexable page, with a unique title (≤ 60 chars) and description (≤ 160 chars)                                                                                                                                                                                                                |
| **Canonical**      | Every indexable page sets `alternates: { canonical: "/path" }` (resolved against `metadataBase`). Canonicals drop tracking params and pagination duplicates. The canonical origin is enforced with a single host (www vs apex) and a trailing-slash policy (`trailingSlash: false`).                                                                   |
| **robots.txt**     | `src/app/robots.ts`. Allow `/`. Disallow `/api/`, `/admin/`, `/dashboard`, `/settings`, and auth routes. Points to the sitemap. Non-production environments return `Disallow: /`. AI-crawler policy (GPTBot, ClaudeBot, Google-Extended, …) is configurable in site config.                                                                            |
| **sitemap.xml**    | `src/app/sitemap.ts` lists static marketing routes plus dynamic content from the DB with real `lastModified`. Use `generateSitemaps()` above 50k URLs. Never lists noindex or authenticated routes.                                                                                                                                                    |
| noindex            | `(auth)`, `(app)`, and `admin` layouts export `robots: { index: false, follow: false }`.                                                                                                                                                                                                                                                               |
| **JSON-LD**        | `src/lib/jsonld.ts` contains typed builders (use `schema-dts` types): `Organization` + `WebSite` in the root layout, `BreadcrumbList` on nested pages, and `Article`/`FAQPage`/`Product` where relevant. Render with `<JsonLd data={…} />`, which escapes `<` as `<` (see `node_modules/next/dist/docs/01-app/02-guides/json-ld.md`).                  |
| Open Graph images  | `opengraph-image.tsx` (static at root, dynamic per content route) using `next/og`. Size 1200×630.                                                                                                                                                                                                                                                      |
| Icons and manifest | `icon.tsx`, `apple-icon.tsx`, `manifest.ts`                                                                                                                                                                                                                                                                                                            |
| Status codes       | `notFound()` returns a real 404, `permanentRedirect()` a 308 for moved content, and `error.tsx` must not mask 5xx as 200                                                                                                                                                                                                                               |
| i18n (optional)    | If added, use `alternates.languages` for hreflang plus a locale segment                                                                                                                                                                                                                                                                                |

---

## 6. Code validation and web standards

- **Static checks:** ESLint (`eslint-config-next` core-web-vitals + typescript, which includes `jsx-a11y` rules, plus typescript-eslint `strictTypeChecked` + `stylisticTypeChecked` with type-aware linting) and `tsc --noEmit` (`strict`, `noUncheckedIndexedAccess`). Size limits are lint errors: `*.tsx` files at most 200 lines and any function at most 150 (AGENTS.md › Code size limits). Prettier formats, and `eslint-config-prettier` turns off conflicting ESLint rules. Husky runs lint-staged and commitlint (Conventional Commits) locally. Since Next 16, `next build` no longer runs ESLint, so CI must run lint separately.
- **Runtime validation:** Zod at every trust boundary: Server Action input, route handler body/query, `searchParams`, env, webhook payloads, and JSON columns read from the DB.
- **HTML validity:** semantic elements (`header`/`nav`/`main`/`footer`/`article`), one `<h1>` per page, no heading level skips, `<button>` for actions and `<a>`/`<Link>` for navigation, no nested interactive elements, valid `lang`, and `<time dateTime>` for dates. Playwright e2e can run the Nu HTML Checker (`vnu`) on key pages.
- **Structured data:** JSON-LD validated in tests against expected `@type` fields (and manually with Google's Rich Results Test).
- **Typed routes:** enable `typedRoutes` in `next.config.ts` so broken internal links fail the type check.

---

## 7. UI interaction

- Server Components by default. Add `"use client"` only at the leaf that needs state, effects, or browser APIs.
- Every mutation has **pending**, **success**, and **error** states: `useActionState` / `useFormStatus` for forms, `useOptimistic` for instant feedback (for example role changes in the admin table), and toasts announced through an `aria-live` region.
- Every async route segment has `loading.tsx` with skeletons that match final layout dimensions (no CLS), and `error.tsx` with a retry button.
- Dialogs, menus, popovers, and comboboxes come from shadcn/Radix. Do not hand-roll focus traps.
- Destructive actions need a confirmation dialog. Account and user deletion additionally require typing a confirmation phrase.
- Tables (admin users): URL-driven state (`?q=&page=&sort=`) so views are shareable and work with back/forward.
- Motion: CSS transitions and View Transitions where they help; always respect `prefers-reduced-motion`.
- Theming: CSS variables with light and dark via `prefers-color-scheme` plus a user override, and no flash of the wrong theme. The default palette is blue-primary and contrast-checked in both themes; adopters re-brand it by swapping tokens. Token names, values, and usage rules are in [DESIGN.md](DESIGN.md).

---

## 8. Performance and speed

Targets (p75, mobile): **LCP < 2.5 s, INP < 200 ms, CLS < 0.1**, and Lighthouse ≥ 95 for Performance, SEO, Accessibility, and Best Practices on marketing pages. Enforced by Lighthouse CI budgets.

- **Rendering:** marketing pages are static or cached (`"use cache"` + `cacheLife`/`cacheTag` once Cache Components is enabled). Authenticated pages are dynamic but stream with `<Suspense>`. Invalidate with `updateTag`/`revalidateTag`, never with blanket `revalidatePath("/")`.
- **Data:** avoid N+1 (use `include`/`select`, or batch). Always `select` only the needed columns. Paginate admin lists and back them with DB indexes (`@@index` on `email`, `createdAt`, `role`). Run independent queries in parallel with `Promise.all`.
- **Assets:** `next/image` with explicit `sizes` and `priority` only on the LCP image. `next/font` (self-hosted, `display: swap`). `next/script` with `strategy="lazyOnload"` for third parties.
- **JS budget:** keep client components small; `dynamic()` import heavy client-only widgets; check `@next/bundle-analyzer` output for regressions.
- **DB connections:** a single `PrismaClient` per process (`globalThis` singleton in dev to survive HMR). Use a pooled connection string in serverless environments.

---

## 9. Web accessibility (a11y)

Target: **WCAG 2.2 AA**.

- Skip-to-content link as the first focusable element. Landmarks (`header`, `nav[aria-label]`, `main#main`, `footer`).
- Every input has a visible `<label>`. Errors are linked with `aria-describedby`, and the field is marked `aria-invalid`. On a failed submit, focus moves to the first invalid field or to an error summary.
- Visible `:focus-visible` styles with at least 3:1 contrast. Text contrast is at least 4.5:1. Target size is at least 24×24 CSS px.
- After client-side navigation, the route announcer (built into Next) and a focus reset to `<h1>` keep screen readers oriented.
- Icon-only buttons have an `aria-label`. Decorative images use `alt=""`.
- Honor `prefers-reduced-motion` and `prefers-color-scheme`. No content conveyed by color alone.
- Automated: `jsx-a11y` lint plus axe in Playwright on every route (zero violations). Manual: keyboard-only pass and a screen-reader smoke test (VoiceOver/NVDA) for auth and admin flows.

---

## 10. Agentic browsing (AI agents as users)

The site must be operable by AI agents and assistive tech alike. Most of this follows from good a11y.

- **Semantic, labelled UI:** agents navigate the accessibility tree. Every control has an accessible name, and forms use standard `autocomplete` tokens (`email`, `current-password`, `new-password`, `one-time-code`).
- **Stable, meaningful URLs:** state lives in the URL (filters, pagination, tabs), and there are no JS-only navigation dead ends. Core flows work without client JS.
- **Machine-readable content:** JSON-LD on public pages, a clean `sitemap.xml`, and `/llms.txt`, a concise markdown map of public pages and what they are for.
- **Predictable responses:** real HTTP status codes, `Retry-After` on 429, and no infinite scroll without paginated URLs.
- **Policy:** `robots.ts` holds explicit, configurable rules for AI crawlers. Bot protection (rate limits, Turnstile on sign-up) must not block read-only access to public pages.
- **Stable test hooks:** Playwright tests select by role and name (`getByRole`), the same way agents do, so a11y regressions surface as test failures.

---

## 11. Security and governance

**HTTP headers** (set in `proxy.ts`, or `next.config.ts` `headers()` for static values):
`Content-Security-Policy` with a per-request nonce and `'strict-dynamic'` (see `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`), `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera, mic, geolocation by default), and `frame-ancestors 'none'`. Also `poweredByHeader: false`.

**Application:**

- Authorization lives in the DAL (§3). Every admin endpoint re-checks the role server-side.
- Rate limiting on auth endpoints and expensive Server Actions (`src/server/rate-limit.ts`, DB-backed; Auth.js has none built in).
- CSRF: Server Actions check the `Origin` header (configure `serverActions.allowedOrigins` behind proxies). Auth.js protects its own endpoints with a double-submit CSRF token and trusts only the configured host (set `AUTH_TRUST_HOST=true` behind a reverse proxy). Never mutate on `GET`.
- Auth.js does not store passwords. We hash them with argon2id (`@node-rs/argon2`) in `src/server/password.ts`. Enforce a minimum length of 12. Check against breached-password lists.
- Uploads (if added): validate MIME type and size server-side, and store off-origin.
- Secrets live only in env and are validated at boot. `.env*` is gitignored except `.env.example`.
- Errors: log full details server-side and return generic messages with a correlation ID to the client.

**Governance:**

- `AuditLog` records auth events (sign-in, failed sign-in, password change, 2FA change) and all admin actions. It is append-only and admins can view it.
- Data lifecycle: user data export and account deletion (§4). Set retention periods for sessions, verification tokens, and audit logs, enforced by a scheduled cleanup job.
- Dependencies: pnpm lockfile committed. `pnpm audit` and Dependabot/Renovate in CI. pnpm `allowBuilds` (in `pnpm-workspace.yaml`) allowlists which packages may run install scripts.
- Migrations: only through `prisma migrate` files that are reviewed in PRs. `db push` is for throwaway local prototyping only.
- `SECURITY.md` with a disclosure contact, and `/.well-known/security.txt`.

---

## 12. Observability

`src/instrumentation.ts` (OpenTelemetry) and `instrumentation-client.ts` for client errors and web-vitals reporting (`useReportWebVitals`). Logs are structured JSON with a request ID. Health check at `/api/health` (checks DB connectivity) for the deploy platform.

---

## 13. Environments and deployment

| Env var                                          | Scope  | Purpose                                                                        |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                                   | server | Postgres connection string                                                     |
| `AUTH_SECRET`                                    | server | JWT encryption and cookie signing (≥ 32 random bytes; `pnpm dlx auth secret`)  |
| `AUTH_URL`                                       | server | Auth base URL; only needed when Auth.js can't infer it from the request        |
| `AUTH_TRUST_HOST`                                | server | `true` when running behind a reverse proxy                                     |
| `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET` | server | OAuth (optional; Auth.js v5 picks up these names automatically)                |
| `TOTP_ENCRYPTION_KEY`                            | server | Encrypts TOTP secrets at rest                                                  |
| `EMAIL_FROM`, `EMAIL_PROVIDER_API_KEY`           | server | Transactional email                                                            |
| `NEXT_PUBLIC_SITE_URL`                           | public | Canonical origin for metadata, sitemap, and JSON-LD                            |
| `APP_ENV`                                        | server | `development`, `preview`, or `production`; controls robots noindex on non-prod |

Build: `pnpm build` produces `.next/standalone`. Deploy with Prisma Compute (`prisma.compute.ts`; `pnpm dlx @prisma/cli@latest app deploy`) or any Node 22.22.1+ host. Run `prisma migrate deploy` before starting the new version.

---

## Implementation status

| Area                                                                                           | Status                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next 16 + Prisma 7 scaffold, `User` model, seed, demo page                                     | ✅ present                                                                                                                                                                                                                    |
| `@/*` path alias                                                                               | ⚠️ currently maps to repo root (`./*`); retarget to `./src/*`                                                                                                                                                                 |
| `src/lib/prisma.ts`                                                                            | ⚠️ no `server-only`, no HMR singleton; move to `src/server/db.ts`                                                                                                                                                             |
| `src/env.ts` Zod env validation                                                                | ⬜ planned                                                                                                                                                                                                                    |
| Tailwind v4 + shadcn/ui, design tokens, dark mode                                              | ⚠️ in progress: deps and the blue-primary light/dark tokens in `globals.css`; no `postcss.config.mjs` (so `pnpm build` fails), ThemeProvider, or `components/ui` yet (see [DESIGN.md › Setup status](DESIGN.md#setup-status)) |
| Auth.js v5 (credentials + OAuth, verification, reset, 2FA, session registry)                   | ⬜ planned                                                                                                                                                                                                                    |
| DAL + authorization helpers                                                                    | ⬜ planned                                                                                                                                                                                                                    |
| Admin user management + AuditLog                                                               | ⬜ planned                                                                                                                                                                                                                    |
| `proxy.ts` (CSP nonce, security headers, optimistic redirects)                                 | ⬜ planned                                                                                                                                                                                                                    |
| SEO: metadata base, canonical, robots.ts, sitemap.ts, JSON-LD, OG images, manifest             | ⬜ planned                                                                                                                                                                                                                    |
| `/llms.txt`                                                                                    | ⬜ planned                                                                                                                                                                                                                    |
| Vitest, Playwright + axe, Lighthouse CI                                                        | ⬜ planned                                                                                                                                                                                                                    |
| Strict TS, ESLint (strictTypeChecked), Prettier, Husky + lint-staged + commitlint, CI workflow | ✅ present (`typecheck`, `lint`, `format` scripts; `.github/workflows/ci.yml`; file and function size limits). `test` scripts come with Vitest/Playwright                                                                     |
| Instrumentation, health check                                                                  | ⬜ planned                                                                                                                                                                                                                    |
| SECURITY.md, security.txt                                                                      | ⬜ planned                                                                                                                                                                                                                    |

Suggested build order: alias + db/env hardening → UI foundation → auth + DAL → proxy/headers → SEO files → admin + audit → tests/CI → observability.
