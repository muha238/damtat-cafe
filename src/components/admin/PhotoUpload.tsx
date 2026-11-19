"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadItemPhoto } from "@/app/admin/actions";

const MAX_SIDE = 1200;

/** Телефоннан түскен үлкен фотоны браузерде сығамыз: ≤1200px, WEBP (~100–300 КБ) */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const toBlob = (type: string) =>
    new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.82));
  // Ескі Safari WEBP жасай алмаса — JPEG
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("Суретті өңдеу мүмкін болмады");
  return jpeg;
}

export function PhotoUpload({ itemId, imageUrl, name }: { itemId: string; imageUrl: string | null; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await compress(file);
      const fd = new FormData();
      fd.set("id", itemId);
      fd.set("file", new File([blob], blob.type === "image/webp" ? "photo.webp" : "photo.jpg", { type: blob.type }));
      const res = await uploadItemPhoto(fd);
      if (res.error) setError(res.error);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Қате");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Фото жүктеу / ауыстыру"
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#fbf3da] ring-1 ring-[#f1e3b5] disabled:opacity-60"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-2xl">📷</span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-[#231a07]/75 py-0.5 text-[10px] font-semibold text-[#ffd23f]">
          {busy ? "Жүктелуде…" : imageUrl ? "Ауыстыру" : "Фото қосу"}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      {error && <span className="max-w-24 text-center text-[10px] text-red-600">{error}</span>}
    </div>
  );
}
