"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import type { CreateOrderPayload, DeliveryMode, OrderType } from "@/types";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export type OrderResult = { orderNumber: number; whatsappUrl?: string | null };

type Props = {
  initialTable: string;
  onSuccess: (result: OrderResult) => void;
};

const input =
  "w-full rounded-xl border border-[#ecdcaa] bg-white px-4 py-3 text-base outline-none focus:border-[#d4a017] focus:ring-2 focus:ring-[#ffd23f]/40";
const labelText = "mb-1 block text-sm font-medium text-[#6b5d3f]";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#fbf3da] p-1 ring-1 ring-[#f1e3b5]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
            value === o.value ? "bg-[#231a07] text-[#ffd23f] shadow" : "text-[#6b5d3f]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CheckoutForm({ initialTable, onSuccess }: Props) {
  const { items, clear, hasSoldOut } = useCart();
  const { t } = useLanguage();
  // QR арқылы кірсе (?table=N) — кафеде, әйтпесе — онлайн
  const [mode, setMode] = useState<OrderType>(initialTable ? "dine_in" : "online");
  const [table, setTable] = useState(initialTable);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+7 ");
  const [delivery, setDelivery] = useState<DeliveryMode>("delivery");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "dine_in" && !table.trim()) return setError(t("enterTable"));
    if (mode === "online" && phone.replace(/\D/g, "").length < 10) return setError(t("enterPhone"));
    if (mode === "online" && delivery === "delivery" && !address.trim()) return setError(t("enterAddress"));

    setLoading(true);
    setError(null);

    const base = {
      comment: comment.trim() || undefined,
      items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
    };
    const payload: CreateOrderPayload =
      mode === "dine_in"
        ? { ...base, orderType: "dine_in", tableNumber: table.trim() }
        : {
            ...base,
            orderType: "online",
            customerName: name.trim() || undefined,
            customerPhone: phone.trim(),
            delivery,
            address: delivery === "delivery" ? address.trim() : undefined,
          };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("requestFailed"));
      clear();
      onSuccess({ orderNumber: data.orderNumber, whatsappUrl: data.whatsappUrl });
      // Онлайн: WhatsApp-ты бірден ашамыз (ашылмаса — экранда батырма тұрады)
      if (data.whatsappUrl) window.location.href = data.whatsappUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 border-t border-[#f3e8c6] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <Segmented
        value={mode}
        onChange={(v) => {
          setMode(v);
          setError(null);
        }}
        options={[
          { value: "dine_in", label: `🪑 ${t("modeDineIn")}` },
          { value: "online", label: `🛵 ${t("modeOnline")}` },
        ]}
      />
      <p className="text-center text-xs text-[#8a7b58]">
        {mode === "dine_in" ? t("dineInNote") : t("onlineNote")}
      </p>

      {mode === "dine_in" ? (
        <label className="block">
          <span className={labelText}>{t("tableNumber")}</span>
          <input
            value={table}
            onChange={(e) => setTable(e.target.value)}
            inputMode="numeric"
            maxLength={10}
            placeholder={t("tablePlaceholder")}
            className={input}
          />
        </label>
      ) : (
        <>
          <Segmented
            value={delivery}
            onChange={setDelivery}
            options={[
              { value: "delivery", label: `📍 ${t("delivery")}` },
              { value: "pickup", label: `🏃 ${t("pickup")}` },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelText}>{t("phone")}</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                className={input}
              />
            </label>
            <label className="block">
              <span className={labelText}>
                {t("yourName")} ({t("optional")})
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                maxLength={60}
                placeholder={t("namePlaceholder")}
                className={input}
              />
            </label>
          </div>
          {delivery === "delivery" && (
            <label className="block">
              <span className={labelText}>{t("address")}</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                maxLength={200}
                placeholder={t("addressPlaceholder")}
                className={input}
              />
            </label>
          )}
        </>
      )}

      <label className="block">
        <span className={labelText}>
          {t("comment")} ({t("optional")})
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={t("commentPlaceholder")}
          className={`${input} resize-none`}
        />
      </label>

      {hasSoldOut && (
        <p className="rounded-lg bg-red-50 p-2 text-sm font-medium text-red-600">{t("soldOutInCart")} 🗑</p>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || items.length === 0 || hasSoldOut}
        className="btn-gold w-full rounded-2xl py-3.5 font-bold disabled:opacity-50"
      >
        {loading ? t("sending") : mode === "online" ? `🟢 ${t("sendWhatsapp")}` : t("placeOrder")}
      </button>
    </form>
  );
}
