"use client";

import { useEffect, useState } from "react";
import { CategoryTabs } from "./CategoryTabs";
import { MenuItemCard } from "./MenuItemCard";
import { CartBar } from "@/components/cart/CartBar";
import { CartSheet } from "@/components/cart/CartSheet";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { localizedText, useLanguage } from "@/components/i18n/LanguageProvider";
import { siteConfig } from "@/config/site";
import type { CategoryWithItems } from "@/types";

type Props = {
  categories: CategoryWithItems[];
  initialTable: string;
  restaurantName: string;
};

export function MenuView({ categories, initialTable, restaurantName }: Props) {
  const [active, setActive] = useState<string | null>(categories[0]?.slug ?? null);
  const [cartOpen, setCartOpen] = useState(false);
  const { language, t } = useLanguage();
  const promoItems = categories.flatMap((c) => c.menu_items).filter((i) => i.promo && i.is_available);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible[0]) setActive(visible[0].target.id.replace("cat-", ""));
      },
      { rootMargin: "-145px 0px -60% 0px" },
    );
    categories.forEach((c) => {
      const el = document.getElementById(`cat-${c.slug}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [categories]);

  const scrollTo = (slug: string) => {
    setActive(slug);
    document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="menu-shell mx-auto min-h-dvh max-w-5xl pb-32">
      <header className="sticky top-0 z-20 border-b border-[#f1e3b5]/80 bg-[#fffaeb]/90 px-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex h-[68px] max-w-4xl items-center justify-between gap-3">
          <a href="#" className="flex min-w-0 items-center gap-2.5" aria-label={restaurantName}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#231a07] text-lg font-black text-[#ffd23f] ring-2 ring-[#f5c400]/60">
              D
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold tracking-[0.12em] text-[#231a07]">
                {restaurantName}
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b8860b]">
                {t("tagline")}
              </span>
            </span>
          </a>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {initialTable && (
              <span className="hidden items-center gap-1.5 rounded-full border border-[#f1e3b5] bg-white/70 px-3 py-2 text-xs font-semibold text-[#6b5d3f] sm:flex">
                <span aria-hidden="true">⌂</span> {t("table")} {initialTable}
              </span>
            )}
            <LanguageToggle />
          </div>
        </div>
        <div className="mx-auto max-w-4xl">
          <CategoryTabs categories={categories} activeSlug={active} onSelect={scrollTo} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-8">
        <section className="relative mt-4 min-h-[390px] overflow-hidden rounded-[1.75rem] bg-[#231a07] text-white shadow-[0_22px_55px_-28px_rgba(90,60,0,0.75)] sm:mt-7 sm:min-h-[460px] sm:rounded-[2.25rem]">
          <img src={siteConfig.bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1d1607]/95 via-[#1d1607]/70 to-[#1d1607]/15" />
          <div className="relative flex min-h-[390px] flex-col items-start justify-end px-5 pb-6 sm:min-h-[460px] sm:px-10 sm:pb-10">
            <img src={siteConfig.logoImage} alt={`${restaurantName} logo`} className="mb-5 h-16 w-16 rounded-full sm:h-20 sm:w-20" />
            <h1 className="gold-text text-[2.15rem] font-black tracking-[-0.04em] sm:text-[3.4rem]">
              {restaurantName}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/85 sm:text-base">
              {language === "ru" ? siteConfig.description.ru : siteConfig.description.kk}
            </p>
            <div className="mt-5 flex w-full flex-col gap-2.5 min-[390px]:w-auto min-[390px]:flex-row">
              <button
                type="button"
                onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}
                className="btn-gold rounded-full px-6 py-3 text-sm font-extrabold shadow-lg active:scale-[0.98]"
              >
                {t("viewMenu")}
              </button>
              <a
                href={siteConfig.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white backdrop-blur-md"
              >
                2GIS
              </a>
            </div>
            {initialTable && (
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
                <span aria-hidden="true">⌂</span> {t("table")} {initialTable}
              </span>
            )}
          </div>
        </section>

        <div id="menu" className="mb-5 mt-9 scroll-mt-36 flex items-end justify-between px-1">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#b8860b]">{t("tagline")}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#231a07]">{t("menu")}</h2>
          </div>
          {initialTable && (
            <span className="text-xs font-medium text-[#80714f] sm:hidden">{t("table")} {initialTable}</span>
          )}
        </div>

        <div className="space-y-9">
          {promoItems.length > 0 && (
            <aside className="relative overflow-hidden rounded-3xl bg-[#fff1bf] p-5 sm:p-6">
              <div className="absolute -right-5 -top-8 h-32 w-32 rounded-full bg-[#ffd95a]/50" />
              <div className="relative flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🎁</span>
                <div className="min-w-0">
                  <p className="font-bold text-[#6b4e00]">{t("promoTitle")}</p>
                  <p className="mt-1 text-sm leading-5 text-[#7d6420]">
                    {t("promoDescription")}:{" "}
                    {promoItems.map((i) => localizedText(language, i.name, i.name_ru)).join(", ")}
                  </p>
                </div>
                <span className="ml-auto hidden shrink-0 rounded-full bg-white/75 px-3 py-1 text-xs font-extrabold text-[#b8860b] sm:block">
                  1 + 1
                </span>
              </div>
            </aside>
          )}

          {categories.map((category) => (
            <section key={category.id} id={`cat-${category.slug}`} className="scroll-mt-36">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight text-[#231a07]">
                  {localizedText(language, category.name, category.name_ru)}
                </h2>
                <span className="h-px flex-1 bg-[#f1e3b5]" />
                <span className="text-xs font-medium text-[#a09a8e]">{category.menu_items.length}</span>
              </div>
              {category.menu_items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#e6d39a] px-4 py-7 text-center text-sm text-[#999387]">
                  {t("emptyCategory")}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {category.menu_items.map((item) => <MenuItemCard key={item.id} item={item} />)}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>

      <footer className="mx-auto mt-12 max-w-4xl border-t border-[#f1e3b5] px-4 py-6 sm:px-8">
        <p className="text-sm font-bold text-[#231a07]">{t("findUs")}</p>
        <div className="mt-4 grid gap-3 min-[390px]:grid-cols-2">
          <a
            href={siteConfig.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("addressOnMap")}
            className="rounded-2xl border border-[#eadca7] bg-white/70 p-4"
          >
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#b8860b]">{t("address")}</span>
            <span className="mt-1 block text-sm font-semibold text-[#231a07]">{language === "ru" ? siteConfig.address.ru : siteConfig.address.kk}</span>
            <span className="mt-2 block text-xs font-bold text-[#8a6500]">2GIS →</span>
          </a>
          <div className="rounded-2xl border border-[#eadca7] bg-white/70 p-4">
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#b8860b]">{t("workingHours")}</span>
            <span className="mt-1 block text-sm font-semibold text-[#231a07]">{language === "ru" ? siteConfig.workingHours.ru : siteConfig.workingHours.kk}</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
          {siteConfig.phones.map((phone) => (
            <a key={phone.dial} href={`tel:+${phone.dial}`} className="flex items-center justify-between rounded-2xl border border-[#eadca7] bg-[#fffaf0] px-4 py-3 text-sm font-bold text-[#231a07]">
              <span>{t("phone")}</span><span>{phone.number}</span>
            </a>
          ))}
          <a
            href={`https://wa.me/${siteConfig.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-[#231a07] px-4 py-3 text-center text-sm font-bold text-[#ffd23f]"
          >
            WhatsApp
          </a>
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("instagramProfile")}
            className="rounded-2xl border border-[#eadca7] bg-white px-4 py-3 text-center text-sm font-bold text-[#231a07]"
          >
            Instagram
          </a>
        </div>
        <p className="mt-5 text-xs text-[#80714f]">{restaurantName}</p>
      </footer>

      <CartBar onOpen={() => setCartOpen(true)} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} initialTable={initialTable} />
    </div>
  );
}
