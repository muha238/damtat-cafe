import Link from "next/link";
import { getRole, type Role } from "@/lib/auth";

const LINKS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin", label: "🧾 Тапсырыстар", roles: ["admin", "cashier"] },
  { href: "/admin/menu", label: "🍽 Мәзір / Акция", roles: ["admin", "cashier"] },
  { href: "/admin/stats", label: "📊 Статистика", roles: ["admin"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();
  return (
    <div className="min-h-dvh bg-[#fffaeb]">
      <nav className="sticky top-0 z-20 border-b border-[#3a2c0c] bg-[#231a07]/95 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-5xl gap-2 overflow-x-auto p-3">
          <span className="mr-1 shrink-0 self-center text-sm font-black tracking-[0.15em] text-[#ffd23f]">DAMTAT</span>
          {LINKS.filter((l) => role && l.roles.includes(role)).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-[#fff1bf] ring-1 ring-[#ffd23f]/30 hover:bg-[#ffd23f]/10"
            >
              {l.label}
            </Link>
          ))}
          <span className="ml-auto shrink-0 self-center text-xs text-[#ffd23f]/70">
            {role === "admin" ? "👑 Әкімші" : "💳 Кассир"}
          </span>
        </div>
      </nav>
      {children}
    </div>
  );
}
