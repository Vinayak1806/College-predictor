"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/authClient";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-panel"
    >
      <LogOut aria-hidden="true" size={17} />
      Sign out
    </button>
  );
}
