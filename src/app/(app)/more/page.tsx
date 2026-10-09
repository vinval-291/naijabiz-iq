"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/app-state";
import { WhatsAppAlertButton } from "@/components/whatsapp-alert";
import type { AlertStatus } from "@/lib/alerts";
import { BadgeIcon, BulbIcon, CheckListIcon } from "@/components/icons";
import { BuiltForWema } from "@/components/logo";
import { PageHeader } from "@/components/ui";
import { DEMO_ACCOUNT } from "@/lib/demo";

const LINKS = [
  { href: "/insights", label: "Insights", detail: "What your numbers mean, and your Business Health Score", icon: BulbIcon },
  { href: "/advice", label: "Recommendations", detail: "What to do next, most important first", icon: CheckListIcon },
  { href: "/readiness", label: "Financial readiness", detail: "The habits your records show", icon: BadgeIcon },
];

export default function MorePage() {
  const router = useRouter();
  const { connection, reset } = useAppState();
  const [status, setStatus] = useState<AlertStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/alerts/whatsapp")
      .then((r) => r.json() as Promise<AlertStatus>)
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus({ configured: false, to: null }); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <PageHeader title="More" />
      <ul className="divide-y divide-line rounded-card border border-line">
        {LINKS.map(({ href, label, detail, icon: I }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 px-4 py-4 hover:bg-surface">
              <span className="text-brand"><I /></span>
              <span className="flex-1">
                <span className="block font-medium text-ink">{label}</span>
                <span className="text-sm text-muted">{detail}</span>
              </span>
              <span aria-hidden="true" className="text-muted">›</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-card border border-line p-5">
        <h2 className="font-display text-lg font-semibold text-ink">WhatsApp alerts</h2>
        <p className="mt-1 text-sm text-muted">
          {status === null
            ? "Checking…"
            : status.configured
              ? `Connected: alerts go to ${status.to} on WhatsApp.`
              : "Not connected on this server. You can still preview every alert."}
        </p>
        <div className="mt-4"><WhatsAppAlertButton kind="weekly" label="Send my weekly summary" /></div>
      </section>

      <div className="mt-8 rounded-card bg-surface p-5 text-sm">
        <p className="font-medium text-ink">Connected account</p>
        <p className="mt-1 text-muted">
          {connection?.source === "csv" ? `Uploaded statement: ${connection.fileName}` : `Wema business account ${DEMO_ACCOUNT.accountNumberMasked} (simulated)`}
        </p>
        <button type="button" onClick={() => { reset(); router.push("/"); }} className="mt-3 font-semibold text-danger-text underline-offset-2 hover:underline">
          Disconnect and start over
        </button>
      </div>
      <div className="mt-8"><BuiltForWema /></div>
    </>
  );
}
