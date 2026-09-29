# Design system

How the UI looks and how to build it: tokens, theming, typography, components, and the accessibility rules that shape them. [PRODUCT.md](PRODUCT.md) says who the UI serves and why it must stay re-brandable; [ARCHITECTURE.md](ARCHITECTURE.md) §7 (UI interaction) and §9 (a11y) set the behavioural rules; this file covers the visual layer that implements them.

> **Status:** in progress. Tailwind v4 and the design tokens live in `src/app/globals.css`, and the UI dependencies are installed, but the setup is not wired end to end yet. See [Setup status](#setup-status) before you rely on anything here.

---

## 1. Stack

| Piece           | Package                                    | Role                                                                                                                                                                    |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Styling         | `tailwindcss` v4 + `@tailwindcss/postcss`  | CSS-first config: tokens are declared in `globals.css` with `@theme`. There is no `tailwind.config.js`.                                                                 |
| Animation       | `tw-animate-css`                           | `animate-in`/`animate-out`, `fade-in`, `zoom-in`, `slide-in-from-*` utilities used by shadcn/Radix components                                                           |
| Components      | shadcn/ui (Radix primitives)               | Copied into `src/components/ui/`, so we own and edit the source. Use them for dialog, menu, popover, tabs, combobox, and anything else that manages focus.              |
| Variants        | `class-variance-authority` (`cva`)         | Declares a component's `variant`/`size` props as a typed class map                                                                                                      |
| Class merging   | `cn`                                       | `import { cn } from "cn"`. A drop-in replacement for `clsx` + `tailwind-merge` (same API), so neither of those is installed and there is no local `lib/utils.ts` `cn()` |
| Icons           | `lucide-react`                             | One icon set, tree-shaken per import                                                                                                                                    |
| Theme switching | `next-themes`                              | Toggles the `.dark` class on `<html>` and persists the user's choice without a flash of the wrong theme                                                                 |
| Formatting      | `prettier` + `prettier-plugin-tailwindcss` | Sorts utility classes into Tailwind's canonical order                                                                                                                   |

---

## 2. Design tokens

Every colour is a **semantic** CSS variable defined twice in `src/app/globals.css`: under `:root` (light) and under `.dark`. The `@theme inline` block maps each one to a Tailwind colour, so `--primary` becomes `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, and so on.

**Use semantic utilities only.** Write `bg-background text-foreground`, not `bg-white text-neutral-900`, `bg-[#fff]`, or `dark:bg-black`. Semantic tokens switch automatically with the theme; raw palette colours and hex values don't, and they bypass the contrast checks below.

### Surfaces and text

Surfaces come in pairs: put `*-foreground` text on the matching background.

| Token                                    | Utility                                      | Use for                                                                                                                            |
| ---------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--background` / `--foreground`          | `bg-background` / `text-foreground`          | Page canvas and body text (already applied to `<body>` in the base layer). The canvas is not the same as `--card` in either theme. |
| `--card` / `--card-foreground`           | `bg-card` / `text-card-foreground`           | Cards, panels, table containers                                                                                                    |
| `--popover` / `--popover-foreground`     | ⚠️ not mapped yet                            | Menus, popovers, dropdowns. In dark mode `--popover` sits one step above `--card`. See [Setup status](#setup-status).              |
| `--primary` / `--primary-foreground`     | `bg-primary` / `text-primary-foreground`     | The single main action per view                                                                                                    |
| `--secondary` / `--secondary-foreground` | `bg-secondary` / `text-secondary-foreground` | Secondary buttons (a tint of `--primary`)                                                                                          |
| `--muted` / `--muted-foreground`         | `bg-muted` / `text-muted-foreground`         | Subdued backgrounds; helper text, captions, timestamps                                                                             |
| `--accent` / `--accent-foreground`       | `bg-accent` / `text-accent-foreground`       | Hover and highlighted states (menu items, table rows)                                                                              |

The palette is modelled on the LinkedIn colour system: a blue `--primary`, a warm off-white page canvas with white cards in light mode, and a black canvas with slate cards in dark mode. The values live only in `globals.css` (as `oklch()`); refer to them by variable name, never by value. Brand colour comes from changing `--primary`, `--ring`, and the `--secondary` pair rather than restyling components. Because the page canvas is not white, put content on `bg-card` and check contrast against both `--background` and `--card`.

### Lines and focus

| Token      | Utility                     | Use for                                                                                                                                                                                                                                                   |
| ---------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--border` | `border-border`             | Default border colour. The base layer applies it to every element, so a bare `border` class already uses it.                                                                                                                                              |
| `--input`  | `border-input`              | Form control borders. Kept at 3:1 or more against `--card`, `--background`, and `--muted` in both themes (WCAG 1.4.11), so it is darker than `--border`.                                                                                                  |
| `--ring`   | `ring-ring`, `outline-ring` | Focus indicators; the same blue as `--primary` (5:1 or more on every surface at full opacity). The base layer sets `outline-ring/50` on every element, which halves that contrast, so `focus-visible:` rings on controls should use the full `ring-ring`. |

### Status colours

| Token           | Utility                              | Use for                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--destructive` | `bg-destructive`, `text-destructive` | Destructive buttons (delete, ban, revoke). This is the name shadcn components expect. White text on light-mode `--destructive` is 5.75:1, but on dark-mode `--destructive` it is only about 3:1, so dark-mode filled buttons must dim it (`dark:bg-destructive/60`, the shadcn default). |
| `--error`       | `text-error`, `border-error`         | Form validation messages and `aria-invalid` field borders. Same value as `--destructive` in both themes.                                                                                                                                                                                 |
| `--success`     | `text-success`                       | Confirmations, "saved" toasts                                                                                                                                                                                                                                                            |
| `--warning`     | `text-warning`                       | Non-blocking warnings                                                                                                                                                                                                                                                                    |
| `--danger`      | `text-danger`                        | Alerts that are not tied to an action (for example a "banned" badge). Same value as `--destructive` in light mode.                                                                                                                                                                       |

Every status colour is at least 5:1 as text on both `--card` and `--background` in both themes. There is no `*-foreground` pair for the status colours yet, so use them for text, icons, and borders, not as filled backgrounds with text on top. Status must never rely on colour alone: pair it with an icon or a text label (ARCHITECTURE.md §9).

### Adding or changing a token

1. Define the variable in **both** `:root` and `.dark` in `globals.css`. Prefer `oklch()`.
2. Map it in `@theme inline` as `--color-<name>: var(--<name>);` so Tailwind generates utilities for it.
3. If text sits on it, add a `<name>-foreground` pair.
4. Check contrast in both themes against both `--background` and `--card` (they differ in both themes): at least 4.5:1 for text, 3:1 for focus indicators and UI boundaries.
5. Update the tables above.

---

## 3. Theming and dark mode

- The dark variant is class-based: `@custom-variant dark (&:is(.dark *));`. `dark:` utilities apply inside an element with the `.dark` class, not from the media query directly.
- `next-themes` sets that class. The target setup is a `ThemeProvider` (a small `"use client"` wrapper) in the root layout with `attribute="class"`, `defaultTheme="system"`, and `enableSystem`, plus `suppressHydrationWarning` on `<html>`. This follows `prefers-color-scheme` by default, lets the user override it, and avoids a flash of the wrong theme.
- Because every token has a dark value, components rarely need `dark:` utilities. If you reach for one, consider whether a token is missing instead.
- The browser chrome follows the page canvas: the root layout's `viewport.themeColor` should use the `--background` value from `:root` for `(prefers-color-scheme: light)` and from `.dark` for `(prefers-color-scheme: dark)`. Update it whenever `--background` changes.

---

## 4. Typography

- `html` gets `font-sans` in the base layer; `font-mono` resolves to the system monospace stack.
- Load fonts with `next/font` only (self-hosted, `display: swap`). Expose the font as a CSS variable on `<html>` (for example `--font-geist-sans`) and point the theme at it: `--font-sans: var(--font-geist-sans), sans-serif;`.
- Use Tailwind's type scale (`text-sm`, `text-base`, `text-xl`, …) rather than arbitrary sizes. Body text is at least `text-sm`; secondary text uses `text-muted-foreground`, not a smaller size alone.
- One `<h1>` per page and no skipped heading levels. Choose the heading element for structure and the utility classes for looks.

---

## 5. Components

- **Location:** shadcn primitives in `src/components/ui/` (generated; edit sparingly and keep their API). Composite, app-specific components in `src/components/`.
- **Variants:** declare them with `cva`, export the variant function next to the component, and accept `className` last so callers can override:

  ```tsx
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "cn";

  const badgeVariants = cva(
    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
    {
      variants: {
        variant: {
          default: "bg-primary text-primary-foreground",
          muted: "bg-muted text-muted-foreground",
        },
      },
      defaultVariants: { variant: "default" },
    },
  );

  export function Badge({
    className,
    variant,
    ...props
  }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
    return (
      <span className={cn(badgeVariants({ variant }), className)} {...props} />
    );
  }
  ```

- **Class names:** always combine conditional or caller-supplied classes with `cn()`, which also resolves conflicts (`cn("px-2", "px-4")` → `px-4`). Don't concatenate class strings by hand.
- **Icons:** import each icon from `lucide-react` by name. Decorative icons get `aria-hidden="true"`. Icon-only buttons need an `aria-label`. Size icons with `size-4` / `size-5` so they track the text.
- **Server first:** styling doesn't require a Client Component. Only add `"use client"` for state, effects, or Radix interactivity.

---

## 6. Accessibility in the visual layer

These restate the WCAG 2.2 AA rules from ARCHITECTURE.md §9 as styling rules.

- **Focus:** never remove an outline without replacing it. Interactive elements use a visible `focus-visible:` ring built on `--ring` at full opacity with at least 3:1 contrast against the surface (the default blue is 5.1:1 or more on every surface).
- **Contrast:** text at least 4.5:1 (3:1 for 24px+ or 18.66px+ bold). `text-muted-foreground` on `bg-muted` is the tightest pairing (4.7:1 light, 5.2:1 dark), so check it whenever the muted, canvas, or card values change.
- **Target size:** interactive targets are at least 24×24 CSS px (`min-h-6 min-w-6`); aim for 40px+ on touch-first controls.
- **Motion:** wrap non-essential animation in `motion-safe:` (or disable it under `motion-reduce:`). `tw-animate-css` enter/exit animations count as non-essential.
- **Colour:** never the only carrier of meaning (status, validation, charts).
- **Responsive:** layouts work at 375px wide without horizontal scrolling; test that width for every UI change.

---

## Setup status

What is in place and what still has to happen before the design system works end to end. Keep this list in step with the "Tailwind v4 + shadcn/ui" row of ARCHITECTURE.md's Implementation status table.

| Item                                                                                                       | Status                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependencies (Tailwind v4, tw-animate-css, cva, cn, lucide-react, next-themes, Prettier + Tailwind plugin) | ✅ installed                                                                                                                                                                                                                                                                                                |
| Colour tokens (light + dark) and `@theme inline` mapping in `globals.css`                                  | ✅ present: blue-primary palette modelled on the LinkedIn colour system, written as `oklch()`, with every text/surface pair contrast-checked in both themes                                                                                                                                                 |
| Base layer (`border-border`, `outline-ring/50`, body colours, `font-sans`)                                 | ✅ present. ⚠️ `outline-ring/50` halves the ring's contrast, so it is below 3:1 on some surfaces. Controls must set their own full-opacity `focus-visible:` ring (§6).                                                                                                                                      |
| `postcss.config.mjs` with `@tailwindcss/postcss`                                                           | ⬜ missing. Next compiles Tailwind v4 through PostCSS, so utilities and `@apply` don't work until it exists.                                                                                                                                                                                                |
| `--font-sans`                                                                                              | ⚠️ `@theme inline` sets `--font-sans: var(--font-sans) sans-serif`, which refers to itself and has no comma. The compiled `:root` variable is cyclic, so `font-sans` is invalid and `<html>` falls back to the browser's default (serif) font. Load a font with `next/font` and point at its variable (§4). |
| `--popover` / `--popover-foreground`                                                                       | ⚠️ defined but not mapped in `@theme inline` (no `bg-popover` utility). shadcn menus and popovers need it.                                                                                                                                                                                                  |
| Radius scale (`--radius`, `--radius-sm/md/lg/xl`)                                                          | ⬜ missing. shadcn components use `rounded-md`/`rounded-lg` tied to these.                                                                                                                                                                                                                                  |
| `ThemeProvider` + `suppressHydrationWarning` in `layout.tsx`                                               | ⬜ planned (§3)                                                                                                                                                                                                                                                                                             |
| `components.json` (shadcn CLI config) and `src/components/ui/`                                             | ⬜ planned                                                                                                                                                                                                                                                                                                  |
| `.prettierrc` with `prettier-plugin-tailwindcss`, and a `format` script                                    | ✅ present (`tailwindStylesheet` points at `globals.css`; `cn`/`cva` calls are sorted too)                                                                                                                                                                                                                  |
| `src/app/page.tsx`                                                                                         | ⚠️ still uses the old scaffold classes (`shell`, `panel`, `users`, …) that `globals.css` no longer defines, so it renders unstyled. Rewrite it with utilities.                                                                                                                                              |
| Dark `--destructive` with white text                                                                       | ⚠️ about 3:1 at full opacity. Either keep the shadcn `dark:bg-destructive/60` treatment on filled buttons or add a `--destructive-foreground` pair.                                                                                                                                                         |
| Status colour `*-foreground` pairs; `--error` vs `--destructive` vs `--danger` overlap                     | ⬜ decide whether to keep three red tokens or fold them into `--destructive`                                                                                                                                                                                                                                |
