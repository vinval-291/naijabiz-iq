"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/components/app-state";
import { Logo } from "@/components/logo";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const router = useRouter();
  const { reset } = useAppState();

  useEffect(() => {
    console.error(error);
  }, [error]);

  function startOver() {
    // Saved data from an older version is the most likely cause of a crash on a demo laptop.
    reset();
    router.push("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <Logo size={28} />
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">Something went wrong on this screen</h1>
      <p className="mt-2 text-muted">Try again. If it keeps happening, start over: this clears the demo data saved in this browser.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={retry} className="h-12 rounded-input bg-brand font-semibold text-white hover:bg-brand-500">Try again</button>
        <button type="button" onClick={startOver} className="h-12 rounded-input border border-line font-semibold text-ink hover:border-brand hover:text-brand">Start over</button>
      </div>
    </main>
  );
}
