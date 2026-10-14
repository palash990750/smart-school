'use client';

import OfflineStatus from "@/components/offline-status";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  BookOpen,
  CalendarCheck2,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Printer,
  ReceiptIndianRupee,
  Settings2,
  UsersRound,
  UserRound,
  X,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';

const nav = [
  {
    group: 'OVERVIEW',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },

  {
    group: 'SCHOOL',
    label: 'Students',
    href: '/students',
    icon: GraduationCap,
  },
  {
    group: 'SCHOOL',
    label: 'Parents',
    href: '/parents',
    icon: UserRound,
  },
  {
    group: 'SCHOOL',
    label: 'Classes & sections',
    href: '/academics/classes',
    icon: BookOpen,
  },
  {
    group: 'SCHOOL',
    label: 'Subjects',
    href: '/subjects',
    icon: BookOpen,
  },
  {
    group: 'SCHOOL',
    label: 'Attendance',
    href: '/attendance',
    icon: CalendarCheck2,
  },

  {
    group: 'SCHOOL',
    label: 'Exams',
    href: '/exams',
    icon: ClipboardList,
  },
  {
    group: 'SCHOOL',
    label: 'Result Creation',
    href: '/results',
    icon: ClipboardList,
  },
  {
    group: 'SCHOOL',
    label: 'Exam Routine',
    href: '/exam-routine',
    icon: CalendarCheck2,
  },
  {
    group: 'SCHOOL',
    label: 'Print',
    href: '/prints',
    icon: Printer,
  },

  {
    group: 'PEOPLE',
    label: 'Staff',
    href: '/staff',
    icon: UsersRound,
  },

  {
    group: 'FINANCE',
    label: 'Fee balances',
    href: '/finance/fees',
    icon: ReceiptIndianRupee,
  },
  {
    group: 'FINANCE',
    label: 'Payments',
    href: '/finance/payments',
    icon: ReceiptIndianRupee,
  },

  {
    group: 'SETTINGS',
    label: 'School profile',
    href: '/settings/school',
    icon: Settings2,
  },
];

const groups = [
  'OVERVIEW',
  'SCHOOL',
  'PEOPLE',
  'FINANCE',
  'SETTINGS',
];

type Branding = {
  schoolName: string;
  schoolLogo: string | null;
};

const DEFAULT_BRANDING: Branding = {
  schoolName: 'Smart School',
  schoolLogo: null,
};

const BRANDING_CACHE_KEY = 'smart-school-branding';

export function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname() || '/';
  const router = useRouter();
  const { data: session, status } = useSession();

  const [open, setOpen] = useState(false);

  /*
   * pendingPath is only used to make the clicked sidebar item
   * respond immediately while Next.js loads the destination.
   */
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // =========================================================
  // SCHOOL BRANDING
  // =========================================================
  const [branding, setBranding] =
    useState<Branding>(DEFAULT_BRANDING);

  const schoolName = branding.schoolName;
  const schoolLogo = branding.schoolLogo;

  // =========================================================
  // AUTH REDIRECT
  // =========================================================
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // =========================================================
  // LOAD SCHOOL BRANDING
  //
  // First show cached branding immediately.
  // Then refresh it silently in the background.
  // =========================================================
  useEffect(() => {
    let cancelled = false;

    try {
      const cached =
        sessionStorage.getItem(
          BRANDING_CACHE_KEY,
        );

      if (cached) {
        const parsed = JSON.parse(cached);

        if (
          parsed &&
          typeof parsed === 'object'
        ) {
          setBranding({
            schoolName:
              typeof parsed.schoolName ===
                'string'
                ? parsed.schoolName ||
                'Smart School'
                : 'Smart School',

            schoolLogo:
              typeof parsed.schoolLogo ===
                'string' &&
                parsed.schoolLogo
                ? parsed.schoolLogo
                : null,
          });
        }
      }
    } catch {
      // Ignore invalid cached branding.
    }

    async function loadSchoolBranding() {
      try {
        const response = await fetch(
          '/api/settings/school',
          {
            method: 'GET',
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (cancelled) return;

        const name =
          typeof data?.schoolName === 'string'
            ? data.schoolName.trim()
            : '';

        const logo =
          typeof data?.logoUrl === 'string'
            ? data.logoUrl.trim()
            : '';

        const nextBranding: Branding = {
          schoolName:
            name || 'Smart School',
          schoolLogo:
            logo || null,
        };

        setBranding(nextBranding);

        try {
          sessionStorage.setItem(
            BRANDING_CACHE_KEY,
            JSON.stringify(
              nextBranding,
            ),
          );
        } catch {
          // Ignore storage errors.
        }
      } catch (error) {
        console.error(
          'Could not load school branding:',
          error,
        );
      }
    }

    void loadSchoolBranding();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================
  // CLEAR PENDING NAVIGATION
  // =========================================================
  useEffect(() => {
    if (pendingPath === path) {
      setPendingPath(null);
    }
  }, [path, pendingPath]);

  // =========================================================
  // PREFETCH SIDEBAR PAGES
  //
  // This asks Next.js to prepare pages before the user clicks.
  // =========================================================
  useEffect(() => {
    const timer = window.setTimeout(() => {
      nav.forEach((item) => {
        router.prefetch(item.href);
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router]);

  // =========================================================
  // ACTIVE NAVIGATION
  // =========================================================
  const active = (href: string) =>
    path === href ||
    (href === '/students' &&
      path.startsWith('/students/')) ||
    (href === '/parents' &&
      path.startsWith('/parents/')) ||
    (href === '/staff' &&
      path.startsWith('/staff/')) ||
    (href === '/academics/classes' &&
      path.startsWith(
        '/academics/classes/',
      )) ||
    (href === '/subjects' &&
      path.startsWith('/subjects/')) ||
    (href === '/attendance' &&
      path.startsWith('/attendance/')) ||
    (href === '/exams' &&
      path.startsWith('/exams/')) ||
    (href === '/results' &&
      path.startsWith('/results/')) ||
    (href === '/exam-routine' &&
      path.startsWith(
        '/exam-routine/',
      )) ||
    (href === '/prints' &&
      path.startsWith('/prints/'));

  // =========================================================
  // CURRENT NAV ITEM
  // =========================================================
  const currentNav = useMemo(() => {
    return nav.find((item) =>
      active(item.href),
    );
  }, [path]);

  // =========================================================
  // FAST NAVIGATION
  // =========================================================
  const navigateFast = (
    href: string,
  ) => {
    if (href === path) {
      setOpen(false);
      return;
    }

    setPendingPath(href);
    setOpen(false);

    startTransition(() => {
      router.push(href);
    });
  };

  // =========================================================
  // CLOSE MOBILE SIDEBAR
  // =========================================================
  const close = () =>
    setOpen(false);

  return (
    <div className="min-h-[100dvh]">
      <OfflineStatus />

      {/* =====================================================
          FAST NAVIGATION INDICATOR
          ===================================================== */}
      {pendingPath && (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-[2px] overflow-hidden"
          aria-hidden="true"
        >
          <div className="h-full w-1/3 animate-[sidebarLoading_0.8s_ease-in-out_infinite] bg-[hsl(var(--primary))]" />
        </div>
      )}

      {/* =====================================================
          MOBILE OVERLAY
          ===================================================== */}
      {open && (
        <button
          aria-label="Close navigation"
          onClick={close}
          className="fixed inset-0 z-30 bg-slate-950/35 md:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
          ===================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform md:translate-x-0 ${open
            ? 'translate-x-0'
            : '-translate-x-full'
          }`}
      >

        {/* ===================================================
            SIDEBAR BRAND
            =================================================== */}
        <div className="flex h-[76px] items-center gap-3 border-b border-[hsl(var(--sidebar-border))] px-5">

          {/* LOGO */}
          <div
            className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] ${schoolLogo
                ? 'bg-white'
                : ''
              }`}
          >
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={
                  schoolName ||
                  'School Logo'
                }
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display =
                    'none';
                }}
              />
            ) : (
              <BookOpen size={20} />
            )}
          </div>

          {/* SCHOOL NAME */}
          <div className="min-w-0 flex-1">
            <div
              className="display truncate text-[16px] font-extrabold"
              title={schoolName}
            >
              {schoolName ||
                'Smart School'}
            </div>

            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.12em] opacity-55">
              Operations desk
            </div>
          </div>

          {/* MOBILE CLOSE */}
          <button
            className="ml-auto md:hidden"
            onClick={close}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* ===================================================
            NAVIGATION
            =================================================== */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">

          {groups.map((group) => (
            <div
              key={group}
              className="mb-5"
            >

              <div className="mb-2 px-3 text-[10px] font-bold tracking-[.15em] opacity-45">
                {group}
              </div>

              {nav
                .filter(
                  (item) =>
                    item.group ===
                    group,
                )
                .map((item) => {
                  const Icon =
                    item.icon;

                  const isCurrent =
                    active(
                      item.href,
                    );

                  const isPending =
                    pendingPath ===
                    item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onMouseEnter={() => {
                        router.prefetch(
                          item.href,
                        );
                      }}
                      onFocus={() => {
                        router.prefetch(
                          item.href,
                        );
                      }}
                      onClick={(event) => {
                        /*
                         * Let normal browser behaviour handle
                         * modifier clicks like Ctrl+Click.
                         */
                        if (
                          event.ctrlKey ||
                          event.metaKey ||
                          event.shiftKey ||
                          event.altKey ||
                          event.button !== 0
                        ) {
                          return;
                        }

                        event.preventDefault();

                        navigateFast(
                          item.href,
                        );
                      }}
                      className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${isCurrent ||
                          isPending
                          ? 'bg-[hsl(var(--primary)/.12)] font-bold text-[hsl(var(--primary))]'
                          : 'opacity-75 hover:bg-[hsl(var(--muted))] hover:opacity-100'
                        }`}
                    >
                      <Icon
                        size={17}
                        strokeWidth={1.8}
                        className={
                          isPending
                            ? 'animate-pulse'
                            : ''
                        }
                      />

                      {item.label}
                    </Link>
                  );
                })}
            </div>
          ))}

        </nav>

        {/* ===================================================
            USER / LOGOUT
            =================================================== */}
        <div className="border-t border-[hsl(var(--sidebar-border))] p-3">

          <div className="flex items-center gap-3 rounded-lg bg-[hsl(var(--muted)/.7)] p-3">

            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--primary))]">
              {(
                session?.user?.name ||
                session?.user?.email ||
                'AD'
              )
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">

              <div className="truncate text-xs font-semibold">
                {session?.user?.name ||
                  'School administrator'}
              </div>

              <div className="truncate text-[10px] opacity-55">
                {session?.user?.email ||
                  'Administrator'}
              </div>

            </div>

            <button
              onClick={() =>
                signOut({
                  callbackUrl:
                    '/login',
                })
              }
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>

          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN AREA
          ===================================================== */}
      <div className="md:pl-[250px]">

        {/* ===================================================
            TOP HEADER
            =================================================== */}
        <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.94)] px-4 backdrop-blur-md md:px-8">

          <div className="flex items-center gap-3">

            {/* MOBILE MENU */}
            <button
              onClick={() =>
                setOpen(true)
              }
              className="grid size-9 place-items-center rounded-lg border border-[hsl(var(--border))] md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <div className="text-xs text-[hsl(var(--muted-foreground))]">

              School workspace

              <span className="mx-1.5">
                /
              </span>

              <span className="font-semibold text-[hsl(var(--foreground))]">
                {currentNav?.label ||
                  (path.includes(
                    '/students/',
                  )
                    ? 'Student record'
                    : 'Workspace')}
              </span>

            </div>
          </div>

          {/* CURRENT ACADEMIC SESSION */}
          <button
            onClick={() =>
              navigateFast(
                '/settings/school',
              )
            }
            className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-semibold"
          >
            <span className="hidden sm:inline">
              Current academic session
            </span>

            <ChevronDown size={14} />
          </button>
        </header>

        {/* ===================================================
            PAGE CONTENT
            =================================================== */}
        <main className="mx-auto max-w-[1440px] px-4 py-7 md:px-8 md:py-9">
          {children}
        </main>

        {/* ===================================================
            FOOTER
            =================================================== */}
        <footer className="mx-auto max-w-[1440px] px-4 pb-7 text-[11px] text-[hsl(var(--muted-foreground))] md:px-8">
          A clear view of the work that keeps school moving.
        </footer>

      </div>

      {/* =====================================================
          LOADING BAR ANIMATION
          ===================================================== */}
      <style jsx global>{`
        @keyframes sidebarLoading {
          0% {
            transform: translateX(-120%);
          }

          50% {
            transform: translateX(180%);
          }

          100% {
            transform: translateX(420%);
          }
        }
      `}</style>

    </div>
  );
}

