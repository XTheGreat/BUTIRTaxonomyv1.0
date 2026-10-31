"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTeks } from "@/lib/teks";

interface ItemFakta {
  id: number;
  indeks: number;
  baris: number;
  progres: number;
  lebar: number | null;
  durasi: number;
  delay: number;
}

// Semua fakta berjalan dengan kecepatan piksel yang sama. Karena itu fakta yang muncul belakangan
// di baris yang sama tidak pernah bisa menyusul fakta di depannya, dan jarak di antara keduanya
// cukup dihitung dari lebar teks yang diukur sebelum animasi dimulai.
const KECEPATAN_PX_DETIK = 50;
const JARAK_MINIMAL_PX = 140;
const JEDA_ACAK_MAKS_MS = 5000;
const BARIS_PERSEN = [22, 50, 78] as const;
const PROGRES_AWAL = [0.6, 0.32, 0.08];

export default function FaktaUnikBerjalan() {
  const t = useTeks();
  const fakta = t.shell.faktaBerjalan.daftar;
  const wadah = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ItemFakta[]>([]);
  const [jeda, setJeda] = useState(false);

  const faktaRef = useRef(fakta);
  const idBerikut = useRef(1);
  const barisDiukur = useRef<Set<number>>(new Set());
  const bebasPada = useRef<number[]>(BARIS_PERSEN.map(() => 0));
  const mulaiJeda = useRef(0);
  const sedangJeda = useRef(false);
  const riwayat = useRef<number[]>([]);

  useEffect(() => {
    faktaRef.current = fakta;
  }, [fakta]);

  useEffect(() => {
    // Fakta acak yang tidak sedang tampil dan tidak baru saja tampil.
    function ambilIndeks(): number {
      const jumlah = Math.max(faktaRef.current.length, 1);
      let indeks = Math.floor(Math.random() * jumlah);
      for (let i = 0; i < 40 && riwayat.current.includes(indeks); i++) indeks = Math.floor(Math.random() * jumlah);
      riwayat.current.push(indeks);
      if (riwayat.current.length > Math.min(12, jumlah - 1)) riwayat.current.shift();
      return indeks;
    }

    // Item baru dirender tersembunyi dulu; lebarnya diukur di useLayoutEffect sebelum animasi mulai.
    function munculkan(baris: number, progres: number) {
      if (barisDiukur.current.has(baris)) return;
      barisDiukur.current.add(baris);
      const item: ItemFakta = { id: idBerikut.current++, indeks: ambilIndeks(), baris, progres, lebar: null, durasi: 0, delay: 0 };
      setItems((lama) => [...lama, item]);
    }

    BARIS_PERSEN.forEach((_, baris) => munculkan(baris, PROGRES_AWAL[baris] + Math.random() * 0.1));

    const timer = setInterval(() => {
      if (sedangJeda.current || document.hidden) return;
      const sekarang = performance.now();
      BARIS_PERSEN.forEach((_, baris) => {
        if (sekarang >= bebasPada.current[baris]) munculkan(baris, 0);
      });
    }, 400);
    return () => clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    const belum = items.filter((i) => i.lebar === null);
    if (belum.length === 0 || !wadah.current) return;
    const lebarWadah = wadah.current.clientWidth;
    const sekarang = performance.now();
    const terukur = new Map<number, ItemFakta>();
    for (const item of belum) {
      const el = wadah.current.querySelector<HTMLElement>(`[data-id="${item.id}"]`);
      if (!el) continue;
      const lebar = el.getBoundingClientRect().width;
      const durasi = (lebarWadah + lebar) / KECEPATAN_PX_DETIK;
      const mulai = sekarang - item.progres * durasi * 1000;
      // Baris ini bebas setelah ekor teks lewat tepi kanan ditambah jarak minimal (dan sedikit acak).
      bebasPada.current[item.baris] =
        mulai + ((lebar + JARAK_MINIMAL_PX) / KECEPATAN_PX_DETIK) * 1000 + Math.random() * JEDA_ACAK_MAKS_MS;
      barisDiukur.current.delete(item.baris);
      terukur.set(item.id, { ...item, lebar, durasi, delay: -item.progres * durasi });
    }
    if (terukur.size > 0) setItems((lama) => lama.map((i) => terukur.get(i.id) ?? i));
  }, [items]);

  function atur(dijeda: boolean) {
    if (dijeda === sedangJeda.current) return;
    sedangJeda.current = dijeda;
    if (dijeda) {
      mulaiJeda.current = performance.now();
    } else {
      // Waktu yang terhenti ikut menggeser kapan tiap baris bebas, supaya jarak antarteks tetap terjaga.
      const lama = performance.now() - mulaiJeda.current;
      bebasPada.current = bebasPada.current.map((v) => v + lama);
    }
    setJeda(dijeda);
  }

  return (
    <div
      ref={wadah}
      className="relative w-full h-full overflow-hidden [container-type:inline-size] [mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%-48px),transparent)] select-none"
      aria-label={t.shell.faktaBerjalan.labelBagian}
    >
      {items.map((item) => (
        <p
          key={item.id}
          data-id={item.id}
          onAnimationEnd={() => setItems((lama) => lama.filter((i) => i.id !== item.id))}
          onPointerEnter={(e) => e.pointerType === "mouse" && atur(true)}
          onPointerLeave={(e) => e.pointerType === "mouse" && atur(false)}
          style={{
            top: `${BARIS_PERSEN[item.baris]}%`,
            visibility: item.lebar === null ? "hidden" : "visible",
            // Properti animasi ditulis terpisah: mencampur shorthand `animation` dengan animationDelay/
            // animationPlayState membuat React memperingatkan saat render ulang.
            animationName: item.lebar === null ? undefined : "jalanKeKiri",
            animationDuration: `${item.durasi}s`,
            animationTimingFunction: "linear",
            animationFillMode: "forwards",
            animationDelay: `${item.delay}s`,
            animationPlayState: jeda ? "paused" : "running",
            willChange: "transform",
          }}
          className="absolute left-0 whitespace-nowrap font-serif text-sm sm:text-base text-[var(--ink)] tracking-normal cursor-default transition-colors duration-150 hover:text-[var(--accent-text)]"
        >
          {fakta[item.indeks % Math.max(fakta.length, 1)]}
        </p>
      ))}
    </div>
  );
}
