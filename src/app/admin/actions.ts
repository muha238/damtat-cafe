"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPromo } from "@/lib/promo";
import { requireRole } from "@/lib/auth";
import type { OrderStatus } from "@/types";

const STATUSES: OrderStatus[] = ["new", "cooking", "ready", "served", "cancelled"];

export async function updateOrderStatus(formData: FormData) {
  await requireRole("admin", "cashier");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id || !STATUSES.includes(status)) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

/** Тағамды «бітті» / «бар» деп белгілеу */
export async function setItemAvailability(formData: FormData) {
  await requireRole("admin", "cashier");
  const id = String(formData.get("id") ?? "");
  const available = formData.get("available") === "true";
  if (!id) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("menu_items").update({ is_available: available }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/menu");
  revalidatePath("/");
}

/** Тағамға акция жариялау / алып тастау (promo бос болса — акция жоқ) */
export async function setItemPromo(formData: FormData) {
  await requireRole("admin"); // акция — тек иесі
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("promo") ?? "");
  if (!id) return;
  if (raw && !isPromo(raw)) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("menu_items").update({ promo: raw || null }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/menu");
  revalidatePath("/");
}

/** Барлық тағамдағы акцияны бірден тоқтату */
export async function clearAllPromos() {
  await requireRole("admin");
  const supabase = createAdminClient();
  const { error } = await supabase.from("menu_items").update({ promo: null }).not("promo", "is", null);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/menu");
  revalidatePath("/");
}

// ════════════════════════════════════════════════════════════
//  Мәзірді басқару — ТЕК әкімші (кассир баға/фото өзгерте алмайды)
// ════════════════════════════════════════════════════════════

const BUCKET = "menu-images";
const MAX_PHOTO = 4 * 1024 * 1024; // браузер алдын ала сығады, бұл — қосымша қорғаныс
const PHOTO_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

function revalidateMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

function parsePrice(v: FormDataEntryValue | null): number | null {
  const n = Number(String(v ?? "").replace(/\s/g, ""));
  return Number.isInteger(n) && n >= 0 && n <= 10_000_000 ? n : null;
}

const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

/** Тек бағаны өзгерту */
export async function updateItemPrice(formData: FormData) {
  await requireRole("admin");
  const id = text(formData.get("id"), 64);
  const price = parsePrice(formData.get("price"));
  if (!id || price === null) throw new Error("Баға дұрыс емес");

  const { error } = await createAdminClient().from("menu_items").update({ price }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateMenu();
}

/** Атауы / сипаттамасы / бағасы / категориясы */
export async function updateItem(formData: FormData) {
  await requireRole("admin");
  const id = text(formData.get("id"), 64);
  const name = text(formData.get("name"), 80);
  const price = parsePrice(formData.get("price"));
  const categoryId = text(formData.get("category_id"), 64);
  if (!id || !name || price === null) throw new Error("Атауы мен бағасын толтырыңыз");

  const { error } = await createAdminClient()
    .from("menu_items")
    .update({
      name,
      name_ru: text(formData.get("name_ru"), 80) || null,
      description: text(formData.get("description"), 300) || null,
      description_ru: text(formData.get("description_ru"), 300) || null,
      price,
      ...(categoryId ? { category_id: categoryId } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateMenu();
}

/** Жаңа тағам қосу (фотоны кейін жүктеуге болады) */
export async function createItem(formData: FormData) {
  await requireRole("admin");
  const categoryId = text(formData.get("category_id"), 64);
  const name = text(formData.get("name"), 80);
  const price = parsePrice(formData.get("price"));
  if (!categoryId || !name || price === null) throw new Error("Категория, атауы және бағасы міндетті");

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const { error } = await supabase.from("menu_items").insert({
    category_id: categoryId,
    name,
    name_ru: text(formData.get("name_ru"), 80) || null,
    description: text(formData.get("description"), 300) || null,
    price,
    sort_order: (count ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidateMenu();
}

/** Тағамды өшіру (бұрынғы тапсырыстарда атауы мен бағасы сақталып қалады) */
export async function deleteItem(formData: FormData) {
  await requireRole("admin");
  const id = text(formData.get("id"), 64);
  if (!id) return;
  const supabase = createAdminClient();
  const { data: item } = await supabase.from("menu_items").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await removeStoredPhoto(item?.image_url);
  revalidateMenu();
}

/** Жаңа категория */
export async function createCategory(formData: FormData) {
  await requireRole("admin");
  const name = text(formData.get("name"), 60);
  if (!name) throw new Error("Категория атауын жазыңыз");
  const supabase = createAdminClient();
  const { count } = await supabase.from("categories").select("id", { count: "exact", head: true });
  const { error } = await supabase.from("categories").insert({
    name,
    name_ru: text(formData.get("name_ru"), 60) || null,
    slug: `c${Date.now().toString(36)}`,
    sort_order: (count ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidateMenu();
}

/**
 * Фото жүктеу → Supabase Storage (public бакет, CDN).
 * Сурет сыртқы сайтқа тәуелді емес, сондықтан 24/7 ашылып тұрады.
 */
export async function uploadItemPhoto(formData: FormData): Promise<{ error?: string }> {
  await requireRole("admin");
  const id = text(formData.get("id"), 64);
  const file = formData.get("file");
  if (!id || !(file instanceof File)) return { error: "Файл таңдалмаған" };
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return { error: "Тек JPG, PNG немесе WEBP" };
  if (file.size > MAX_PHOTO) return { error: "Файл тым үлкен (4 МБ-тан аз болсын)" };

  const supabase = createAdminClient();
  const { data: item } = await supabase.from("menu_items").select("image_url").eq("id", id).single();

  const path = `${id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000", // жаңа фото — жаңа атау, сондықтан ұзақ кэш қауіпсіз
    upsert: false,
  });
  if (upErr) return { error: `Жүктелмеді: ${upErr.message}` };

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("menu_items").update({ image_url: publicUrl }).eq("id", id);
  if (error) return { error: error.message };

  await removeStoredPhoto(item?.image_url);
  revalidateMenu();
  return {};
}

/** Ескі фотоны бакеттен өшіру (тек өз бакетіміздегі файл болса) */
async function removeStoredPhoto(url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  if (!url || i < 0) return;
  const { error } = await createAdminClient().storage.from(BUCKET).remove([url.slice(i + marker.length)]);
  if (error) console.error("[photo] remove:", error.message);
}
