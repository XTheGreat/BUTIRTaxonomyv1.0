"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { PengaturanProvider } from "@/components/pengaturan/PengaturanProvider";
import { useTeks } from "@/lib/teks";

const KUNCI_STATUS_SIDEBAR = "butir_sidebar_terbuka";

function layarKecil() {
  return window.matchMedia("(max-width: 767px)").matches;
}

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTeks();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    } else {
      // Di layar kecil sidebar berupa drawer: selalu mulai tertutup dan tidak memakai preferensi desktop.
      if (layarKecil()) {
        setSidebarOpen(false);
      } else {
        try {
          setSidebarOpen(localStorage.getItem(KUNCI_STATUS_SIDEBAR) !== "false");
        } catch {
          setSidebarOpen(true);
        }
      }
      setReady(true);
    }
  }, [router]);

  // Drawer mobile menutup setelah berpindah halaman.
  useEffect(() => {
    if (layarKecil()) setSidebarOpen(false);
  }, [pathname]);

  function aturStatusSidebar(terbuka: boolean) {
    setSidebarOpen(terbuka);
    if (layarKecil()) return;
    try {
      localStorage.setItem(KUNCI_STATUS_SIDEBAR, String(terbuka));
    } catch {}
  }

  function toggleSidebar() {
    aturStatusSidebar(!sidebarOpen);
  }

  // Menandai area guru agar skala ukuran teks (Pengaturan > Tampilan) hanya berlaku di sini.
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.areaGuru = "1";
    return () => {
      delete html.dataset.areaGuru;
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const lebar = window.matchMedia("(max-width: 767px)");
    if (!lebar.matches) return;
    const asli = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = asli;
    };
  }, [sidebarOpen]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--canvas)] text-[var(--ink-muted)] text-sm font-serif">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse mr-2" />
        {t.shell.layoutGuru.menyiapkan}
      </div>
    );
  }

  return (
    <PengaturanProvider>
      <div className="flex min-h-dvh bg-[var(--canvas)] text-[var(--ink)]">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => aturStatusSidebar(false)}
          onToggle={toggleSidebar}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-clip">
          <Topbar
            isSidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto min-w-0">
            {children}
          </main>
        </div>
      </div>
    </PengaturanProvider>
  );
}
