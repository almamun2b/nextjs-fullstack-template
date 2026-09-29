# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences carry equal weight, and every shipped surface has to work for both:

- **Developers evaluating or adopting the template.** They run the demo, read the code, and decide whether to build their own SaaS or app on it. After adopting it, they re-brand and extend it.
- **End users and admins of the app a developer builds.** Signed-in users manage their profile, security settings (password, 2FA), and active sessions. Admins search and manage users: change roles, ban, revoke sessions, impersonate. The template's UI has to work as a real product UI for these people, not only as a demo.

## Product Purpose

A reusable, production-grade full-stack starter: Next.js 16 App Router + React 19.2 + Prisma 7 (PostgreSQL) with Auth.js v5 (NextAuth). It exists so a developer can start a real app with authentication, user management, SEO, accessibility, performance, and security already done properly, instead of rebuilding them each time.

Success means a developer can clone it, re-brand it, and ship, with the UI already meeting the accessibility, performance, and security bars without extra work.

## Positioning

The claim is completeness and correctness out of the box: auth and user management, SEO, WCAG 2.2 AA accessibility, Core Web Vitals budgets, hardened security, and operability by AI agents are designed in from the start and recorded in ARCHITECTURE.md, not bolted on. The code is meant to be read, so it has to be a credible reference implementation as well as a working app.

## Operating Context

- Developers meet the product in the repo (README, ARCHITECTURE.md, AGENTS.md), in the running demo at `localhost:3000`, and in their editor, often alongside AI coding agents.
- End users meet it in the surfaces the template ships: public marketing pages, the auth flows (sign-in, sign-up, verification, password reset), the authenticated app (dashboard, settings for profile, security, and sessions), and the admin area (users table, user detail, audit log).
- AI agents are a first-class operator: they navigate by the accessibility tree and URL state, as ARCHITECTURE.md §10 describes.

## Capabilities and Constraints

- ARCHITECTURE.md is the authority for target capabilities and technical rules. Its Implementation status table says what exists. Today that is the scaffold, the `User` model, the seed, and a demo page. Auth, admin, SEO files, and the rest are planned.
- UI stack is fixed: Tailwind CSS v4, shadcn/ui (Radix), `cva`, `cn`, `lucide-react`, `next-themes`. Server Components by default, and forms have to work without JS.
- Terminology: "template" for the product; "adopter" for the developer who builds on it; roles are `user` and `admin`.
- **Undecided:** the template's name. `next-app-prisma` is a placeholder only, and future work must not present it as a final brand.

## Brand Commitments

- **Neutral and re-brandable.** The template carries no brand identity in its UI: no name, logo, or brand-specific styling. It ships a default blue palette modelled on the LinkedIn colour system ([DESIGN.md §2](DESIGN.md#2-design-tokens)) as a familiar, accessible starting point, not as an identity or an affiliation. Adopters re-brand by swapping design tokens (for example `--primary`), not by restyling components, so nothing may hard-code a brand look that fights that swap.
- Name: not decided (see above).

## Evidence on Hand

- Demo data: seeded demo users from `prisma/seed.ts`.
- No testimonials, adopters, customers, benchmarks, download counts, or press exist. Future work must not fabricate them, including on marketing or showcase pages.
- No logo or brand assets exist.

## Product Principles

1. **Serve both audiences at once.** Each surface should convince a developer evaluating it and work well for the end user or admin using it. Don't optimise for a demo screenshot at the expense of real use, or the reverse.
2. **Production-correct by default.** Accessibility, performance, security, and SEO are the product, not extras. A surface that misses those bars isn't done.
3. **Re-brandable, not branded.** Identity comes from tokens adopters own, and structure and components must survive a brand swap unchanged.
4. **Reference-quality code.** Adopters copy what they see, so every pattern shipped is a pattern endorsed.
5. **Operable by people and agents alike.** Semantic, labelled, URL-driven UI serves assistive tech and AI agents with the same work.

## Accessibility & Inclusion

WCAG 2.2 AA is required on every surface (ARCHITECTURE.md §9): keyboard-only operation, visible focus, 4.5:1 text contrast, 24×24px minimum targets, labelled forms with linked errors, `prefers-reduced-motion` and `prefers-color-scheme` honoured, and no meaning carried by colour alone. Layouts must work at 375px wide.
