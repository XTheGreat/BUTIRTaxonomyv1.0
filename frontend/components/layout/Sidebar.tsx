"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  Archive,
  ChevronDown,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Flag,
  Gauge,
  BookmarkCheck,
  History,
  Hourglass,
  Store,
  LayoutDashboard,
  Layers,
  PanelLeftClose,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import HistoryDebat from "@/components/layout/HistoryDebat";
import ProfilMenu from "@/components/layout/ProfilMenu";
import { useTeks, type Kamus } from "@/lib/teks";

type KunciMenu = keyof Kamus["shell"]["sidebar"]["menu"];
type KunciGrup = keyof Kamus["shell"]["sidebar"]["grup"];

const KUNCI_LEBAR_SIDEBAR = "butir_lebar_sidebar";
const KUNCI_GRUP_SIDEBAR = "butir_grup_sidebar";
const LEBAR_SIDEBAR_BAWAAN = 240;
const LEBAR_SIDEBAR_MIN = 200;
const LEBAR_SIDEBAR_MAKS = 400;
const KUNCI_GRUP: KunciGrup[] = ["persiapan", "telaah", "ujian", "sistem", "arsip"];

function bacaGrupSidebar(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const tersimpan = JSON.parse(localStorage.getItem(KUNCI_GRUP_SIDEBAR) || "{}");
    if (!tersimpan || typeof tersimpan !== "object" || Array.isArray(tersimpan)) return {};
    return Object.fromEntries(
      KUNCI_GRUP.filter((kunci) => typeof tersimpan[kunci] === "boolean").map((kunci) => [kunci, tersimpan[kunci]]),
    );
  } catch {
    return {};
  }
}

function batasiLebarSidebar(lebar: number) {
  return Math.max(LEBAR_SIDEBAR_MIN, Math.min(LEBAR_SIDEBAR_MAKS, lebar));
}

interface NavItem {
  href: string;
  label: KunciMenu;
  icon: LucideIcon;
  isMarkedCount?: boolean;
  isPendingCount?: boolean;
}

interface NavGroup {
  group?: KunciGrup;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "dashboard", icon: LayoutDashboard }],
  },
  {
    group: "persiapan",
    items: [
      { href: "/materi", label: "materiAjar", icon: BookOpen },
      { href: "/kisi-kisi", label: "kisiKisi", icon: ClipboardList },
    ],
  },
  {
    group: "telaah",
    items: [
      { href: "/butir-ditandai", label: "butirDitandai", icon: Flag, isMarkedCount: true },
      { href: "/butir-tertunda", label: "butirTertunda", icon: Hourglass, isPendingCount: true },
      { href: "/bank-soal", label: "bankSoal", icon: Archive },
      { href: "/marketplace", label: "marketplace", icon: Store },
    ],
  },
  {
    group: "ujian",
    items: [
      { href: "/daftar-ujian", label: "daftarUjian", icon: CalendarCheck },
      { href: "/rakit-ujian", label: "rakitUjian", icon: Layers },
    ],
  },
  {
    group: "sistem",
    items: [
      { href: "/paket", label: "paketPemakaian", icon: Gauge },
      { href: "/log-llm", label: "logLlm", icon: Activity },
    ],
  },
  {
    group: "arsip",
    items: [
      { href: "/riwayat-diterima", label: "riwayatDiterima", icon: History },
      { href: "/riwayat-ditolak", label: "riwayatDitolak", icon: XCircle },
      { href: "/arsip", label: "arsipSoal", icon: BookmarkCheck },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

export default function Sidebar({
  isOpen = true,
  onClose,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTeks();
  const [markedCount, setMarkedCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [terbuka, setTerbuka] = useState<Record<string, boolean>>(bacaGrupSidebar);
  const [lebarSidebar, setLebarSidebar] = useState(LEBAR_SIDEBAR_BAWAAN);
  const [sedangUbahLebar, setSedangUbahLebar] = useState(false);
  const lebarRef = useRef(LEBAR_SIDEBAR_BAWAAN);
  const titikAwalRef = useRef(0);
  const lebarAwalRef = useRef(LEBAR_SIDEBAR_BAWAAN);

  function simpanLebar(lebar: number) {
    const dibatasi = batasiLebarSidebar(lebar);
    lebarRef.current = dibatasi;
    setLebarSidebar(dibatasi);
    try {
      localStorage.setItem(KUNCI_LEBAR_SIDEBAR, String(dibatasi));
    } catch {}
  }

  useEffect(() => {
    try {
      const tersimpan = Number(localStorage.getItem(KUNCI_LEBAR_SIDEBAR));
      if (Number.isFinite(tersimpan) && tersimpan > 0) {
        const dibatasi = batasiLebarSidebar(tersimpan);
        lebarRef.current = dibatasi;
        setLebarSidebar(dibatasi);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!sedangUbahLebar) return;

    const cursorSebelumnya = document.body.style.cursor;
    const seleksiSebelumnya = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function geser(event: PointerEvent) {
      const dibatasi = batasiLebarSidebar(lebarAwalRef.current + event.clientX - titikAwalRef.current);
      lebarRef.current = dibatasi;
      setLebarSidebar(dibatasi);
    }

    function selesai() {
      try {
        localStorage.setItem(KUNCI_LEBAR_SIDEBAR, String(lebarRef.current));
      } catch {}
      setSedangUbahLebar(false);
    }

    window.addEventListener("pointermove", geser);
    window.addEventListener("pointerup", selesai);
    window.addEventListener("pointercancel", selesai);

    return () => {
      window.removeEventListener("pointermove", geser);
      window.removeEventListener("pointerup", selesai);
      window.removeEventListener("pointercancel", selesai);
      document.body.style.cursor = cursorSebelumnya;
      document.body.style.userSelect = seleksiSebelumnya;
    };
  }, [sedangUbahLebar]);

  const grupAktif = navGroups.find((g) =>
    g.items.some((i) => i.href !== "/dashboard" && pathname.startsWith(i.href)),
  )?.group;

  useEffect(() => {
    if (!grupAktif || Object.prototype.hasOwnProperty.call(terbuka, grupAktif)) return;
    const berikutnya = { ...terbuka, [grupAktif]: true };
    setTerbuka(berikutnya);
    try {
      localStorage.setItem(KUNCI_GRUP_SIDEBAR, JSON.stringify(berikutnya));
    } catch {}
  }, [grupAktif, terbuka]);

  function toggleGrupSidebar(grup: KunciGrup) {
    const berikutnya = { ...terbuka, [grup]: !terbuka[grup] };
    setTerbuka(berikutnya);
    try {
      localStorage.setItem(KUNCI_GRUP_SIDEBAR, JSON.stringify(berikutnya));
    } catch {}
  }

  useEffect(() => {
    let isMounted = true;
    apiFetch("/api/butir?status=ditandai")
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setMarkedCount(data.length);
        }
      })
      .catch(() => {});
    apiFetch("/api/butir/tertunda")
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setPendingCount(data.filter((b) => b.status === "tertunda").length);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const navInner = (
    <div
      className="h-full flex flex-col border-r border-[var(--line)] bg-[var(--canvas)] select-none"
      style={{ width: `min(${lebarSidebar}px, calc(100vw - 2rem))` }}
    >
      <div className="shrink-0 px-5 py-4 border-b border-[var(--line)] bg-[var(--canvas)] flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="block focus-visible:outline-none group"
          aria-label={t.shell.sidebar.logoKeDashboard}
        >
          <Image
            src="/ButirLogoSidebar.png"
            width={532}
            height={107}
            sizes="150px"
            alt="BUTIR"
            className="h-auto w-[150px]"
          />
        </Link>
        <button
          onClick={onToggle || onClose}
          className="shrink-0 rounded p-1.5 text-[var(--ink-muted)] transition-colors duration-[140ms] hover:bg-[var(--line)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
          aria-label={t.shell.sidebar.tutupNavigasi}
          title={t.shell.sidebar.tutupBilahSamping}
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--line-strong)_transparent]">
        <nav className="px-3 pb-3 pt-4 space-y-5" aria-label={t.shell.sidebar.navigasiUtama}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              {group.group && (
                <button
                  type="button"
                  onClick={() => toggleGrupSidebar(group.group!)}
                  aria-expanded={!!terbuka[group.group]}
                  className="flex w-full items-center justify-between rounded px-3 pb-1.5 pt-0.5 font-sans text-xs font-bold text-[var(--ink-muted)] transition-colors duration-[140ms] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
                >
                  {t.shell.sidebar.grup[group.group]}
                  <ChevronDown
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${terbuka[group.group] ? "" : "-rotate-90"}`}
                  />
                </button>
              )}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  !group.group || terbuka[group.group] ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
              <div className="-m-0.5 min-h-0 space-y-0.5 overflow-hidden p-0.5" inert={!!group.group && !terbuka[group.group]}>
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded px-3 py-2 font-serif text-[14.5px] transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
                      active
                        ? "font-medium text-[var(--ink)]"
                        : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.6}
                      aria-hidden="true"
                      className={`shrink-0 transition-colors duration-[140ms] ${
                        active
                          ? "text-[var(--accent-text)]"
                          : "text-[var(--ink-muted)] group-hover:text-[var(--ink)]"
                      }`}
                    />
                    <span className="relative inline-flex min-w-0 flex-col items-start">
                      <span className="truncate">{t.shell.sidebar.menu[item.label]}</span>
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 h-[2px] origin-left bg-[var(--accent)] transition-all duration-300 ease-out ${
                          active
                            ? "w-full"
                            : "w-0 group-hover:w-full group-hover:opacity-30"
                        }`}
                      />
                    </span>

                    {item.isMarkedCount &&
                      markedCount !== null &&
                      markedCount > 0 && (
                        <span className="ml-auto shrink-0 rounded border border-[var(--status-ditandai)]/30 bg-[var(--canvas)] px-1.5 font-sans text-[11px] font-semibold tabular-nums text-[var(--status-ditandai)]">
                          {markedCount}
                        </span>
                      )}

                    {item.isPendingCount &&
                      pendingCount !== null &&
                      pendingCount > 0 && (
                        <span className="ml-auto shrink-0 rounded border border-dashed border-[var(--line-strong)] bg-[var(--canvas)] px-1.5 font-sans text-[11px] font-semibold tabular-nums text-[var(--ink-muted)]">
                          {pendingCount}
                        </span>
                      )}
                  </Link>
                );
              })}
              </div>
              </div>
            </div>
          ))}
        </nav>

        <HistoryDebat />
      </div>

      <ProfilMenu onNavigate={onClose} />

      <div className="shrink-0 flex items-center justify-between border-t border-[var(--line)] px-4 py-3 font-mono text-[10px] tracking-wide text-[var(--ink-muted)]">
        <span>BUTIR</span>
        <span className="tabular-nums">v1.0</span>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block sticky top-0 h-dvh shrink-0 overflow-hidden z-30 ${
          sedangUbahLebar ? "transition-none" : "transition-[width,opacity] duration-300 ease-in-out"
        } ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ width: isOpen ? lebarSidebar : 0 }}
      >
        {navInner}
        {isOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t.shell.sidebar.ubahLebar}
            aria-valuemin={LEBAR_SIDEBAR_MIN}
            aria-valuemax={LEBAR_SIDEBAR_MAKS}
            aria-valuenow={lebarSidebar}
            aria-valuetext={`${lebarSidebar}px`}
            tabIndex={0}
            onPointerDown={(event) => {
              event.preventDefault();
              titikAwalRef.current = event.clientX;
              lebarAwalRef.current = lebarSidebar;
              setSedangUbahLebar(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                simpanLebar(lebarSidebar - 16);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                simpanLebar(lebarSidebar + 16);
              } else if (event.key === "Home") {
                event.preventDefault();
                simpanLebar(LEBAR_SIDEBAR_MIN);
              } else if (event.key === "End") {
                event.preventDefault();
                simpanLebar(LEBAR_SIDEBAR_MAKS);
              }
            }}
            className={`absolute inset-y-0 right-0 z-40 w-2 touch-none cursor-col-resize after:absolute after:inset-y-0 after:left-[3px] after:w-px after:bg-transparent after:content-[''] hover:after:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-text)] ${
              sedangUbahLebar ? "after:bg-[var(--accent)]" : ""
            }`}
            title={t.shell.sidebar.ubahLebar}
          />
        )}
      </aside>

      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-[var(--scrim)] transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={`fixed top-0 bottom-0 left-0 z-10 transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {navInner}
        </div>
      </div>
    </>
  );
}
