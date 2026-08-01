import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, GitCompareArrows, ListOrdered } from "lucide-react";
import { SignOutButton } from "../../components/SignOutButton";
import { SiteHeader } from "../../components/SiteHeader";
import { getStudentSession } from "../../lib/studentAuth";
import { prisma } from "../../lib/prisma";

export const metadata = { title: "My Account | CAP Predictor" };

export default async function AccountPage() {
  const session = await getStudentSession(await headers());
  if (!session?.user?.id) redirect("/login?callbackURL=/account");

  const userId = Number(session.user.id);
  const [shortlists, preferenceLists, comparisons] = await Promise.all([
    prisma.shortlist.count({ where: { userId } }),
    prisma.preferenceList.count({ where: { userId } }),
    prisma.savedComparison.count({ where: { userId } })
  ]);

  const tools = [
    { label: "Saved colleges", value: shortlists, href: "/colleges", icon: Bookmark },
    { label: "Saved CAP lists", value: preferenceLists, href: "/preference-list", icon: ListOrdered },
    { label: "Saved comparisons", value: comparisons, href: "/compare", icon: GitCompareArrows }
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="flex flex-col justify-between gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-action">Student account</p>
            <h1 className="mt-1 truncate text-2xl font-semibold text-ink">{session.user.name}</h1>
            <p className="mt-1 truncate text-sm text-slate-500">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Saved admission tools">
          {tools.map(({ label, value, href, icon: Icon }) => (
            <Link key={label} href={href} className="focus-ring rounded border border-line bg-white p-5 hover:border-action">
              <Icon aria-hidden="true" className="text-action" size={20} />
              <span className="mt-5 block text-3xl font-semibold text-ink">{value}</span>
              <span className="mt-1 block text-sm text-slate-600">{label}</span>
            </Link>
          ))}
        </section>

        <div className="mt-6 border-l-4 border-action bg-cyan-50 px-4 py-3 text-sm leading-6 text-slate-700">
          Guest predictions still stay in your browser. Saved records created after sign-in are connected only to this account.
        </div>
      </main>
    </>
  );
}
