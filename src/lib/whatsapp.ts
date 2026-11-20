import "server-only";
import { formatPrice } from "./format";
import { siteConfig } from "@/config/site";
import type { DeliveryMode } from "@/types";

type WaOrder = {
  orderNumber: number;
  customerName?: string;
  customerPhone: string;
  delivery: DeliveryMode;
  address?: string;
  comment?: string;
  total: number;
  items: { name: string; price: number; quantity: number; free_quantity?: number }[];
};

/** WHATSAPP_NUMBER → тек цифрлар (wa.me форматы: 77011234567) */
export function whatsappNumber(): string | null {
  const digits = (siteConfig.whatsappNumber || process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

/**
 * Онлайн тапсырыстың мәтіні дайын тұрған wa.me сілтемесі.
 * Клиент басқанда WhatsApp ашылып, кафенің нөміріне хабарлама дайын тұрады.
 * Мәтін серверде құрылады — баға базадан алынған.
 */
export function buildWhatsappUrl(order: WaOrder): string | null {
  const number = whatsappNumber();
  if (!number) return null;

  const lines = order.items.map((i) => {
    const free = i.free_quantity ? ` (+${i.free_quantity} тегін 1+1)` : "";
    return `• ${i.name} × ${i.quantity}${free} — ${formatPrice(i.price * i.quantity)}`;
  });

  const parts = [
    `🛵 *DAMTAT — онлайн тапсырыс #${order.orderNumber}*`,
    "",
    ...lines,
    "",
    `💰 *Барлығы: ${formatPrice(order.total)}*`,
    "",
    order.customerName ? `👤 ${order.customerName}` : null,
    `📞 ${order.customerPhone}`,
    order.delivery === "delivery" ? `📍 Жеткізу: ${order.address}` : "🏃 Өзім келіп аламын",
    order.comment ? `💬 ${order.comment}` : null,
  ].filter((l): l is string => l !== null);

  return `https://wa.me/${number}?text=${encodeURIComponent(parts.join("\n"))}`;
}
