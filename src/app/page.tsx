import type { UserListItem } from "../server/dal/users";
import { UserList } from "./_components/user-list";

export const dynamic = "force-dynamic";

const LIMIT = 10;

const codeClass = "rounded-sm bg-muted px-1 py-0.5 font-mono text-sm";

export default async function Home() {
  // Imported lazily: src/env.ts throws at import time when DATABASE_URL is
  // missing, and `next build` evaluates this module.
  const { listRecentUsers, isDbUnavailable } =
    await import("../server/dal/users");

  let result: { users: UserListItem[]; total: number } | null = null;
  try {
    result = await listRecentUsers(LIMIT);
  } catch (error) {
    // Anything other than "not set up yet" is a real failure: let error.tsx
    // handle it so the response is a 500, not a 200 with a hint.
    if (!isDbUnavailable(error)) throw error;
    console.error("[home] database is not ready:", error);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-primary">Next.js + Prisma 7</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Users from your database, loaded on the server.
        </h1>
        <p className="text-muted-foreground">
          This page reads from{" "}
          <code className={codeClass}>src/app/page.tsx</code> through the data
          access layer in{" "}
          <code className={codeClass}>src/server/dal/users.ts</code>.
        </p>
      </header>

      <section
        aria-labelledby="users-heading"
        className="rounded-xl border bg-card p-6 text-card-foreground"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="users-heading" className="text-lg font-semibold">
            Seeded users
          </h2>
          {result && (
            <span className="text-sm text-muted-foreground">
              Latest {result.users.length} of {result.total}
            </span>
          )}
        </div>

        {!result ? (
          <p className="mt-4 text-muted-foreground">
            Could not reach the database or its tables. Run{" "}
            <code className={codeClass}>pnpm db:migrate</code>, then{" "}
            <code className={codeClass}>pnpm db:seed</code>, then refresh.
          </p>
        ) : result.users.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            No users yet. Run <code className={codeClass}>pnpm db:seed</code>.
          </p>
        ) : (
          <div className="mt-2">
            <UserList users={result.users} />
          </div>
        )}
      </section>
    </main>
  );
}
