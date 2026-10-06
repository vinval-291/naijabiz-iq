"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAppState, type BusinessProfile } from "@/components/app-state";
import { OnboardingShell, inputClass, labelClass, primaryButtonClass } from "@/components/onboarding-shell";

const BUSINESS_TYPES = ["Mini mart / supermarket", "Provisions store", "Pharmacy", "Restaurant / food", "Fashion & tailoring", "Other"];
const REVENUE_RANGES = ["Under ₦500K", "₦500K – ₦1M", "₦1M – ₦3M", "₦3M – ₦10M", "Over ₦10M"];

// Pre-filled for the demo persona (master plan, Phase 13 Screen 2).
const AISHA: BusinessProfile = {
  businessName: "Aisha Mini Mart",
  businessType: "Mini mart / supermarket",
  revenueRange: "₦1M – ₦3M",
  employees: 2,
  location: "Bodija, Ibadan",
};

export default function SetupPage() {
  const router = useRouter();
  const { profile, hydrated, saveProfile } = useAppState();
  const [draft, setDraft] = useState<BusinessProfile | null>(null);
  const form = draft ?? profile ?? AISHA;
  const set = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => setDraft({ ...form, [key]: value });

  function submit(e: FormEvent) {
    e.preventDefault();
    saveProfile({ ...form, businessName: form.businessName.trim(), location: form.location.trim() });
    router.push("/connect");
  }

  return (
    <OnboardingShell step={1} title="Tell us about your business" intro="We use this to make your insights fit how your business works.">
      <form onSubmit={submit} className="space-y-5" aria-busy={!hydrated}>
        <div>
          <label htmlFor="businessName" className={labelClass}>Business name</label>
          <input id="businessName" required className={inputClass} value={form.businessName}
            onChange={(e) => set("businessName", e.target.value)} autoComplete="organization" />
        </div>

        <div>
          <label htmlFor="businessType" className={labelClass}>Type of business</label>
          <select id="businessType" className={inputClass} value={form.businessType} onChange={(e) => set("businessType", e.target.value)}>
            {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="revenueRange" className={labelClass}>Monthly sales</label>
            <select id="revenueRange" className={inputClass} value={form.revenueRange} onChange={(e) => set("revenueRange", e.target.value)}>
              {REVENUE_RANGES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="employees" className={labelClass}>Number of staff</label>
            <input id="employees" type="number" min={0} max={500} inputMode="numeric" required className={`${inputClass} tabular`}
              value={form.employees} onChange={(e) => set("employees", Math.max(0, Number(e.target.value)))} />
          </div>
        </div>

        <div>
          <label htmlFor="location" className={labelClass}>Location</label>
          <input id="location" required className={inputClass} value={form.location}
            onChange={(e) => set("location", e.target.value)} autoComplete="address-level2" />
        </div>

        <div className="pt-3">
          <button type="submit" className={primaryButtonClass}>Continue</button>
        </div>
      </form>
    </OnboardingShell>
  );
}
