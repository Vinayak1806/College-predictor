"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSessionBar({ requiresToken }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  async function signOut() {
    setWorking(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line bg-white px-4 py-3">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
        <ShieldCheck aria-hidden="true" size={17} />
        {requiresToken ? "Authenticated administrator session" : "Local development administration"}
      </p>
      {requiresToken ? (
        <button
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line px-3 text-sm font-semibold text-slate-700"
          type="button"
          disabled={working}
          onClick={signOut}
        >
          <LogOut aria-hidden="true" size={16} />
          {working ? "Signing out..." : "Sign out"}
        </button>
      ) : null}
    </div>
  );
}
