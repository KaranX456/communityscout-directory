import { useCallback, useEffect, useState } from "react";

export const AGE_KEY = "cs_age_ok";
export const ADULT_KEY = "cs_adult_ok";
export const THEME_KEY = "cs_theme";

function read(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(key));
  } catch {
    return false;
  }
}

export function useAgeConfirmed() {
  const [state, setState] = useState<{ ready: boolean; ok: boolean }>({
    ready: false,
    ok: false,
  });

  useEffect(() => {
    setState({ ready: true, ok: read(AGE_KEY) });
  }, []);

  const confirm = useCallback(() => {
    try {
      window.localStorage.setItem(
        AGE_KEY,
        JSON.stringify({ ok: true, at: new Date().toISOString() }),
      );
    } catch {
      /* storage unavailable — keep session-only confirmation */
    }
    setState({ ready: true, ok: true });
  }, []);

  return { ...state, confirm };
}

export function adultAccepted() {
  return read(ADULT_KEY);
}

export function acceptAdult() {
  try {
    window.localStorage.setItem(
      ADULT_KEY,
      JSON.stringify({ ok: true, at: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}
