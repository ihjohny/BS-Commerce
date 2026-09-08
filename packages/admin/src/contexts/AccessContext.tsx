import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import type { AccessMap } from "@/lib/api";
import { localization } from "@/lib/schema";

interface AccessContextValue {
  access: AccessMap | null;
  loading: boolean;
  /** Live backend exposes this collection slug? */
  canReadCollection: (slug: string) => boolean;
  can: (
    scope: "collections" | "globals",
    slug: string,
    op: "create" | "read" | "update" | "delete",
  ) => boolean;
  // Locale (Payload localization: en / bn)
  locale: string;
  setLocale: (l: string) => void;
  locales: Array<{ code: string; label: string }>;
}

const AccessContext = createContext<AccessContextValue | null>(null);

const LOCALE_KEY = "admin-locale";

export function AccessProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocaleState] = useState<string>(
    () => localStorage.getItem(LOCALE_KEY) || localization.defaultLocale,
  );

  useEffect(() => {
    let cancelled = false;
    api
      .get<AccessMap>("/api/access")
      .then((res) => {
        if (!cancelled) setAccess(res);
      })
      .catch(() => {
        if (!cancelled) setAccess(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((l: string) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
  }, []);

  const value = useMemo<AccessContextValue>(
    () => ({
      access,
      loading,
      canReadCollection: (slug) => Boolean(access?.collections?.[slug]),
      can: (scope, slug, op) => {
        const entry = access?.[scope]?.[slug]?.[op];
        if (typeof entry === "boolean") return entry;
        if (entry && typeof entry === "object")
          return Boolean(entry.permission);
        return false;
      },
      locale,
      setLocale,
      locales: localization.locales,
    }),
    [access, loading, locale, setLocale],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
}
