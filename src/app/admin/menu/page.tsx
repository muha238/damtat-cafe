import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";
import {
  clearAllPromos,
  createCategory,
  createItem,
  deleteItem,
  setItemAvailability,
  setItemPromo,
  updateItem,
  updateItemPrice,
} from "../actions";
import { getRole } from "@/lib/auth";
import { PhotoUpload } from "@/components/admin/PhotoUpload";
import type { CategoryWithItems } from "@/types";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-[#ecdcaa] bg-white px-3 py-2 text-base outline-none focus:border-[#d4a017] focus:ring-2 focus:ring-[#ffd23f]/40";
const card = "rounded-2xl bg-white p-4 ring-1 ring-[#f1e3b5]";

export default async function AdminMenuPage() {
  const isAdmin = (await getRole()) === "admin";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_ru, slug, sort_order, menu_items(*)")
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "menu_items", ascending: true });

  if (error) throw new Error(error.message);
  const categories = (data ?? []) as CategoryWithItems[];
  const all = categories.flatMap((c) => c.menu_items);
  const soldOut = all.filter((i) => !i.is_available);
  const promoted = all.filter((i) => i.promo);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-1 text-2xl font-bold">Мәзір</h1>
      <p className="mb-4 text-sm text-[#8a7b58]">
        {isAdmin
          ? "Бағаны жазып «💾» бас. Фотоны ауыстыру үшін суретті бас. «Бітті» — қонақ тапсырыс бере алмайды."
          : "«Бітті» деп белгілесең — қонақ мәзірінде «Бітіп қалды» деп шығады."}
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className={card}>
          <p className="text-sm text-[#8a7b58]">Бітіп қалған тағамдар</p>
          <p className="text-2xl font-bold">{soldOut.length}</p>
          {soldOut.length > 0 && <p className="mt-1 text-sm">{soldOut.map((i) => i.name).join(", ")}</p>}
        </div>
        <div className={card}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-[#8a7b58]">Белсенді 1+1 акциялар</p>
              <p className="text-2xl font-bold">{promoted.length}</p>
            </div>
            {isAdmin && promoted.length > 0 && (
              <form action={clearAllPromos}>
                <button className="rounded-lg px-3 py-1.5 text-sm text-red-600 ring-1 ring-red-200">
                  Барлық акцияны тоқтату
                </button>
              </form>
            )}
          </div>
          {promoted.length > 0 && <p className="mt-1 text-sm">{promoted.map((i) => i.name).join(", ")}</p>}
        </div>
      </div>

      {isAdmin && categories.length > 0 && (
        <details className={`${card} mb-6`}>
          <summary className="cursor-pointer font-bold text-[#231a07]">➕ Жаңа тағам қосу</summary>
          <form action={createItem} className="mt-3 grid gap-3 sm:grid-cols-2">
            <select name="category_id" required className={field} defaultValue={categories[0].id}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="price" type="number" min={0} step={1} required placeholder="Бағасы, ₸" className={field} />
            <input name="name" required maxLength={80} placeholder="Атауы (қазақша)" className={field} />
            <input name="name_ru" maxLength={80} placeholder="Название (по-русски)" className={field} />
            <input name="description" maxLength={300} placeholder="Құрамы / сипаттамасы" className={`${field} sm:col-span-2`} />
            <button className="btn-gold rounded-xl py-2.5 font-bold sm:col-span-2">Қосу</button>
            <p className="text-xs text-[#8a7b58] sm:col-span-2">Қосқаннан кейін тізімнен 📷 басып фото жүкте.</p>
          </form>
        </details>
      )}

      <div className="space-y-6">
        {categories.map((c) => (
          <section key={c.id}>
            <h2 className="mb-2 text-lg font-bold">{c.name}</h2>
            <ul className="divide-y divide-[#f3e8c6] overflow-hidden rounded-2xl bg-white ring-1 ring-[#f1e3b5]">
              {c.menu_items.map((item) => (
                <li key={item.id} className="p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {isAdmin && <PhotoUpload itemId={item.id} imageUrl={item.image_url} name={item.name} />}

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span className={item.is_available ? "" : "text-neutral-400 line-through"}>{item.name}</span>
                        {item.promo && (
                          <span className="rounded-full bg-[#231a07] px-2 py-0.5 text-xs font-bold text-[#ffd23f]">
                            {item.promo}
                          </span>
                        )}
                      </p>
                      {isAdmin ? (
                        <form action={updateItemPrice} className="mt-1 flex items-center gap-2">
                          <input type="hidden" name="id" value={item.id} />
                          <label className="relative">
                            <input
                              name="price"
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              required
                              defaultValue={item.price}
                              aria-label={`${item.name} бағасы`}
                              className="w-32 rounded-lg border border-[#ecdcaa] bg-[#fffaeb] py-1.5 pl-3 pr-7 text-base font-bold outline-none focus:border-[#d4a017]"
                            />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-[#8a7b58]">
                              ₸
                            </span>
                          </label>
                          <button title="Бағаны сақтау" className="btn-gold rounded-lg px-3 py-1.5 text-sm font-bold">
                            💾
                          </button>
                        </form>
                      ) : (
                        <p className="text-sm text-[#8a7b58]">{formatPrice(item.price)}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {isAdmin && (
                        <form action={setItemPromo}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="promo" value={item.promo ? "" : "1+1"} />
                          <button
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                              item.promo ? "bg-[#231a07] text-[#ffd23f]" : "text-[#b8860b] ring-1 ring-[#f0c94d]"
                            }`}
                          >
                            {item.promo ? "1+1 ✓" : "🎁 1+1"}
                          </button>
                        </form>
                      )}
                      <form action={setItemAvailability}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="available" value={item.is_available ? "false" : "true"} />
                        <button
                          className={`w-24 rounded-lg px-3 py-1.5 text-sm font-medium ${
                            item.is_available
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-neutral-900 text-white"
                          }`}
                        >
                          {item.is_available ? "✅ Бар" : "⛔ Бітті"}
                        </button>
                      </form>
                    </div>
                  </div>

                  {isAdmin && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-[#8a7b58]">✏️ Өңдеу / өшіру</summary>
                      <form action={updateItem} className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input type="hidden" name="id" value={item.id} />
                        <input name="name" required maxLength={80} defaultValue={item.name} placeholder="Атауы" className={field} />
                        <input name="name_ru" maxLength={80} defaultValue={item.name_ru ?? ""} placeholder="Название (рус)" className={field} />
                        <input name="description" maxLength={300} defaultValue={item.description ?? ""} placeholder="Сипаттамасы" className={field} />
                        <input name="description_ru" maxLength={300} defaultValue={item.description_ru ?? ""} placeholder="Описание (рус)" className={field} />
                        <input name="price" type="number" min={0} step={1} required defaultValue={item.price} className={field} />
                        <select name="category_id" defaultValue={item.category_id} className={field}>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <button className="btn-gold rounded-xl py-2 font-bold sm:col-span-2">Сақтау</button>
                      </form>
                      <form action={deleteItem} className="mt-2 text-right">
                        <input type="hidden" name="id" value={item.id} />
                        <button className="rounded-lg px-3 py-1.5 text-sm text-red-600 ring-1 ring-red-200">
                          🗑 Тағамды өшіру
                        </button>
                      </form>
                    </details>
                  )}
                </li>
              ))}
              {c.menu_items.length === 0 && <li className="p-3 text-sm text-neutral-400">Бос</li>}
            </ul>
          </section>
        ))}
      </div>

      {isAdmin && (
        <details className={`${card} mt-6`}>
          <summary className="cursor-pointer font-bold text-[#231a07]">📂 Жаңа категория</summary>
          <form action={createCategory} className="mt-3 grid gap-3 sm:grid-cols-3">
            <input name="name" required maxLength={60} placeholder="Атауы (қазақша)" className={field} />
            <input name="name_ru" maxLength={60} placeholder="Название (по-русски)" className={field} />
            <button className="btn-gold rounded-xl py-2.5 font-bold">Қосу</button>
          </form>
        </details>
      )}
    </div>
  );
}
