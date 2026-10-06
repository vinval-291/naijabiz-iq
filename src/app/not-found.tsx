import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <Logo size={28} />
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-muted">Check the address, or go back to your business overview.</p>
      <Link href="/dashboard" className="mt-6 inline-flex h-12 items-center justify-center rounded-input bg-brand px-6 font-semibold text-white hover:bg-brand-500">
        Go to my business
      </Link>
    </main>
  );
}
