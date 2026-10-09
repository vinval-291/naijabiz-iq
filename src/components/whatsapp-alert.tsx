"use client";

// "Send to my WhatsApp" — asks the server to write and send an alert, then shows the exact message
// (as a WhatsApp-style bubble) whether or not it was sent, so the demo never depends on Twilio.

import { Fragment, useState } from "react";
import type { AlertKind, AlertResponse } from "@/lib/alerts";
import type { Purpose } from "@/lib/engine/affordability";
import { useAppState } from "./app-state";
import { ChatIcon } from "./icons";

interface Props {
  kind: AlertKind;
  amount?: number;
  purpose?: Purpose;
  label?: string;
}

export function WhatsAppAlertButton({ kind, amount, purpose, label = "Send to my WhatsApp" }: Props) {
  const { confirmations, connection } = useAppState();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<AlertResponse | { error: string } | null>(null);

  if (connection?.source === "csv") {
    return <p className="text-sm text-muted">WhatsApp alerts work with a connected Wema account, not an uploaded statement.</p>;
  }

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/alerts/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, amount, purpose, confirmations }),
      });
      const data = await res.json();
      setResult("message" in data ? (data as AlertResponse) : { error: data.error ?? "Something went wrong." });
    } catch {
      setResult({ error: "Couldn't reach the NaijaBiz IQ server. Check that the app is still running." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={send} disabled={sending}
        className="inline-flex h-11 items-center gap-2 rounded-input border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-tint disabled:cursor-wait disabled:opacity-60">
        <ChatIcon />
        {sending ? "Sending…" : label}
      </button>

      <div aria-live="polite">
        {result && "error" in result && <p role="alert" className="text-sm text-danger-text">{result.error}</p>}
        {result && "message" in result && (
          <div className="space-y-2">
            {result.sent ? (
              <p className="text-sm font-medium text-positive-text">✓ Sent to WhatsApp {result.to}</p>
            ) : (
              <p className="text-sm text-caution-text"><strong className="font-semibold">Not sent.</strong> {result.detail}</p>
            )}
            <WhatsAppBubble text={result.message} />
          </div>
        )}
      </div>
    </div>
  );
}

/** The message as WhatsApp shows it (*bold* rendered as bold). */
function WhatsAppBubble({ text }: { text: string }) {
  return (
    <figure className="max-w-md rounded-card bg-[#EFEAE2] p-3">
      <figcaption className="sr-only">WhatsApp message</figcaption>
      <div className="rounded-input rounded-tl-none bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-[#111B21] shadow-sm">
        {text.split("\n").map((line, i) => (
          <p key={i} className={line ? "" : "h-2"}>
            {line.split(/(\*[^*]+\*)/).map((part, j) =>
              part.startsWith("*") && part.endsWith("*") && part.length > 2
                ? <strong key={j} className="font-semibold">{part.slice(1, -1)}</strong>
                : <Fragment key={j}>{part}</Fragment>,
            )}
          </p>
        ))}
      </div>
    </figure>
  );
}
