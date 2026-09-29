# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The agent instructions shared across tools live in AGENTS.md and are imported here. Keep project rules there, not here, so that every agent sees the same guidance.

@AGENTS.md

## Claude Code specifics

- **Target vs. reality:** [ARCHITECTURE.md](ARCHITECTURE.md) is the blueprint. Its "Implementation status" table is the source of truth for what exists. Read the relevant ARCHITECTURE.md section before building a feature in that area (auth §4, SEO §5, a11y §9, security §11, …).
- **Design system:** read [DESIGN.md](DESIGN.md) before any styling or component work. Keep its token tables and Setup status in step with `src/app/globals.css`.
- **Skills:** the project ships Prisma skills in `.claude/skills/` (`prisma-cli`, `prisma-client-api`, `prisma-database-setup`, `prisma-postgres`, `prisma-upgrade-v7`, `prisma-compute`). Load the matching skill before you run Prisma CLI commands, write non-trivial queries, or touch deploy config.
- **MCP:** `.mcp.json` (gitignored; mirrored in `.vscode/mcp.json` and `opencode.jsonc`) configures two servers:
  - `prisma`: the remote Prisma MCP server (`https://mcp.prisma.io/mcp`). It needs `/mcp` auth before use. Prefer the local `prisma` CLI for migrations and status.
  - `next-devtools`: [`next-devtools-mcp`](node_modules/next/dist/docs/01-app/02-guides/mcp.md), run via `pnpm --silent dlx`. It connects to the running `pnpm dev` server's `/_next/mcp` endpoint. Use `get_errors`, `get_routes`, `get_logs`, and `compile_route` to verify a change instead of running a full `next build`.
- **Verifying UI work:** start `pnpm dev` and use the built-in browser to click through the changed flow. Check the accessibility tree (`read_page`) as well: if an element lacks a clear role or name there, it is an a11y bug and an agentic-browsing bug at the same time.
- **Never** run `prisma migrate reset`, `db push --force-reset`, or anything else that drops data against a database you did not create in this session, without asking first.
