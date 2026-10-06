"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground">
        The page could not be loaded. Try again, and if the problem continues,
        check the server logs
        {error.digest ? (
          <>
            {" "}
            for reference{" "}
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-sm">
              {error.digest}
            </code>
          </>
        ) : null}
        .
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        Try again
      </button>
    </main>
  );
}
