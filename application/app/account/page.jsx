import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountSavedData } from "../../components/AccountSavedData";
import { SignOutButton } from "../../components/SignOutButton";
import { SiteHeader } from "../../components/SiteHeader";
import { DeleteAccountPanel } from "../../components/DeleteAccountPanel";
import { getStudentSession } from "../../lib/studentAuth";

export const metadata = {
  title: "My Account",
  robots: { index: false, follow: false }
};

export default async function AccountPage() {
  const session = await getStudentSession(await headers());
  if (!session?.user?.id) redirect("/login?callbackURL=/account");

  return (
    <>
      <SiteHeader />
      <main className="page-shell mx-auto w-full max-w-5xl px-4 py-8 sm:px-5 lg:px-6">
        <div className="flex flex-col justify-between gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-action">Student account</p>
            <h1 className="mt-1 truncate text-2xl font-semibold text-ink">{session.user.name}</h1>
            <p className="mt-1 truncate text-sm text-slate-500">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>

        <AccountSavedData />
        <DeleteAccountPanel />
      </main>
    </>
  );
}
