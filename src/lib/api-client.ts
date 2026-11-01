/**
 * A small stand-in for supabase-js that talks to the Community Scout API (Cloudflare Worker + Azure PostgreSQL).
 * It implements only what this app calls: auth, rpc, functions.invoke and the table queries used by the admin
 * screens. Anything else returns a clear error so a missing case is noticed immediately, never silently wrong.
 */

type Json = Record<string, unknown>;
type ApiError = { message: string; code?: string; status?: number; context?: Response };
type Result = { data: any; error: ApiError | null; count?: number | null };
type Session = { access_token: string; expires_at: number; user: { id: string; email: string } };
type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "INITIAL_SESSION";

const STORAGE_KEY = "scout.session.v1";
const REFRESH_MARGIN_S = 15 * 60;

export function createApiClient(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, "");
  const listeners = new Set<(event: AuthEvent, session: Session | null) => void>();
  let memory: Session | null = null;

  // ------------------------------------------------------------ session storage (browser only)
  const read = (): Session | null => {
    if (memory) return memory;
    try {
      if (typeof localStorage === "undefined") return null;
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  };
  const write = (s: Session | null) => {
    memory = s;
    try {
      if (typeof localStorage === "undefined") return;
      if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode etc.: the in-memory copy still works for this tab */
    }
  };
  const emit = (event: AuthEvent, s: Session | null) => listeners.forEach((fn) => fn(event, s));
  const now = () => Math.floor(Date.now() / 1000);

  // ------------------------------------------------------------ HTTP
  async function call(method: string, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<{ status: number; ok: boolean; body: any; res: Response }> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    const s = read();
    if (s && opts.auth !== false) headers["authorization"] = `Bearer ${s.access_token}`;
    let res: Response;
    try {
      res = await fetch(base + path, { method, headers, body: body === undefined ? null : JSON.stringify(body) });
    } catch {
      const message = "Network problem. Check your connection and try again.";
      return { status: 0, ok: false, body: { message }, res: new Response(JSON.stringify({ message }), { status: 503 }) };
    }
    const text = await res.clone().text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { message: text.slice(0, 200) }; }
    if (res.status === 401 && s && opts.auth !== false && path !== "/v1/auth/login") {
      write(null);
      emit("SIGNED_OUT", null);
    }
    return { status: res.status, ok: res.ok, body: parsed, res };
  }

  const toError = (r: { status: number; body: any; res: Response }): ApiError => ({
    message: (r.body && typeof r.body.message === "string" && r.body.message) || "Something went wrong. Please try again.",
    ...(r.body && typeof r.body.code === "string" ? { code: r.body.code } : {}),
    status: r.status,
    context: r.res,
  });
  const fail = (r: { status: number; body: any; res: Response }): Result => ({ data: null, error: toError(r) });
  const unsupported = (what: string): Result => ({
    data: null,
    error: { message: `Not supported by the API client: ${what}`, status: 501 },
  });

  async function freshSession(): Promise<Session | null> {
    const s = read();
    if (!s) return null;
    if (s.expires_at <= now()) { write(null); emit("SIGNED_OUT", null); return null; }
    if (s.expires_at - now() < REFRESH_MARGIN_S) {
      const r = await call("POST", "/v1/auth/refresh");
      if (r.ok && r.body?.access_token) {
        const next = { access_token: r.body.access_token as string, expires_at: now() + Number(r.body.expires_in ?? 28800), user: r.body.user as Session["user"] };
        write(next);
        emit("TOKEN_REFRESHED", next);
        return next;
      }
    }
    return read();
  }

  // ------------------------------------------------------------ auth
  const auth = {
    async getSession() {
      const s = await freshSession();
      return { data: { session: s ? { ...s, user: s.user } : null }, error: null };
    },
    async signInWithPassword(args: { email: string; password: string }) {
      const r = await call("POST", "/v1/auth/login", { email: args.email, password: args.password }, { auth: false });
      if (!r.ok) return { data: { session: null, user: null }, error: toError(r) };
      const s: Session = { access_token: r.body.access_token, expires_at: now() + Number(r.body.expires_in ?? 28800), user: r.body.user };
      write(s);
      emit("SIGNED_IN", s);
      return { data: { session: s, user: s.user }, error: null };
    },
    async signUp(_args: unknown) {
      return { data: { session: null, user: null }, error: { message: "Account creation is closed. Ask the site owner to add you.", status: 403 } };
    },
    async signOut() {
      write(null);
      emit("SIGNED_OUT", null);
      return { error: null };
    },
    onAuthStateChange(cb: (event: AuthEvent, session: Session | null) => void) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => void listeners.delete(cb) } } };
    },
  };

  // ------------------------------------------------------------ functions.invoke
  const functions = {
    async invoke(name: string, opts: { body?: unknown } = {}): Promise<Result> {
      const path = name === "search" ? "/v1/search" : name === "submit-community" ? "/v1/submit-community" : null;
      if (!path) return unsupported(`function ${name}`);
      const r = await call("POST", path, opts.body ?? {});
      return r.ok ? { data: r.body, error: null } : fail(r);
    },
  };

  // ------------------------------------------------------------ rpc
  async function rpc(name: string, args: Json = {}): Promise<Result> {
    if (name === "is_staff") {
      const r = await call("GET", "/v1/auth/me");
      return r.ok ? { data: r.body?.is_staff === true, error: null } : fail(r);
    }
    const r = await call("POST", `/v1/rpc/${encodeURIComponent(name)}`, args ?? {});
    if (!r.ok) return fail(r);
    // admin_storage_usage is a one-row table; the app reads it as a single object.
    if (name === "admin_storage_usage" && Array.isArray(r.body)) return { data: r.body[0] ?? null, error: null };
    return { data: r.body, error: null };
  }

  // ------------------------------------------------------------ table queries
  type Filter = { op: "eq" | "in"; col: string; val: unknown };
  class Query implements PromiseLike<Result> {
    private op: "select" | "insert" | "update" | "delete" = "select";
    private cols = "*";
    private filters: Filter[] = [];
    private orText: string | null = null;
    private from_ = 0;
    private payload: Json | null = null;
    private single = false;
    private table: string;
    constructor(table: string) { this.table = table; }

    select(cols = "*", _opts?: { count?: string }) {
      if (this.op === "select") this.cols = cols;
      return this;
    }
    insert(row: Json) { this.op = "insert"; this.payload = row; return this; }
    update(patch: Json) { this.op = "update"; this.payload = patch; return this; }
    delete() { this.op = "delete"; return this; }
    eq(col: string, val: unknown) { this.filters.push({ op: "eq", col, val }); return this; }
    in(col: string, val: unknown[]) { this.filters.push({ op: "in", col, val }); return this; }
    or(text: string) { this.orText = text; return this; }
    order(_col: string, _o?: unknown) { return this; } // ordering is fixed on the server
    limit(_n: number) { return this; }
    range(a: number, _b: number) { this.from_ = a; return this; }
    maybeSingle() { this.single = true; return this; }

    then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
      return this.run().then(ok, bad);
    }

    private f(col: string): unknown { return this.filters.find((x) => x.col === col && x.op === "eq")?.val; }
    private ids(): string[] | null { const x = this.filters.find((y) => y.op === "in" && y.col === "id"); return x ? (x.val as string[]) : null; }
    private search(): string {
      // supabase filter text looks like: username.ilike.%word%,title.ilike.%word%
      const m = /ilike\.%(.*?)%/.exec(this.orText ?? "");
      return m?.[1]?.trim() ?? "";
    }

    private async run(): Promise<Result> {
      const t = this.table;
      const id = this.f("id");

      if (this.op === "select") {
        if (t === "categories") {
          const r = await call("GET", "/v1/categories");
          return r.ok ? { data: r.body, error: null } : fail(r);
        }
        if (t === "communities") {
          if (this.single && typeof id === "string") {
            const r = await call("GET", `/v1/admin/communities/${encodeURIComponent(id)}`);
            return r.ok ? { data: r.body, error: null } : fail(r);
          }
          const isReview = this.cols.includes("source");
          const size = isReview ? 50 : 25;
          const page = Math.floor(this.from_ / size);
          const p = new URLSearchParams({ page: String(page) });
          const q = this.search();
          if (q) p.set("q", q);
          const status = this.f("status");
          if (isReview) {
            const src = this.f("source");
            if (typeof src === "string") p.set("source", src);
          } else {
            if (typeof status === "string") p.set("status", status);
            const kind = this.f("kind");
            if (typeof kind === "string") p.set("kind", kind);
            for (const k of ["adult", "scam_flag"] as const) {
              const v = this.f(k);
              if (typeof v === "boolean") p.set(k === "adult" ? "adult" : "scam", v ? "yes" : "no");
            }
          }
          const r = await call("GET", `/v1/admin/${isReview ? "review" : "communities"}?${p}`);
          return r.ok ? { data: r.body.rows, error: null, count: r.body.total } : fail(r);
        }
        if (t === "submissions") {
          const s = this.f("status");
          const r = await call("GET", `/v1/admin/submissions?status=${encodeURIComponent(typeof s === "string" ? s : "pending")}`);
          return r.ok ? { data: r.body, error: null } : fail(r);
        }
        if (t === "takedown_requests") {
          const s = this.f("status");
          const r = await call("GET", `/v1/admin/takedowns${typeof s === "string" ? `?status=${encodeURIComponent(s)}` : ""}`);
          return r.ok ? { data: r.body, error: null } : fail(r);
        }
        if (t === "blocklist_terms") {
          const r = await call("GET", "/v1/admin/blocklist");
          return r.ok ? { data: r.body, error: null } : fail(r);
        }
        if (t === "sources") {
          const r = await call("GET", "/v1/admin/sources");
          return r.ok ? { data: r.body, error: null } : fail(r);
        }
        return unsupported(`reading ${t}`);
      }

      if (this.op === "insert") {
        const path = t === "feedback" ? "/v1/feedback" : t === "takedown_requests" ? "/v1/takedown" : t === "blocklist_terms" ? "/v1/admin/blocklist" : null;
        if (!path) return unsupported(`inserting into ${t}`);
        const r = await call("POST", path, this.payload ?? {});
        return r.ok ? { data: null, error: null } : fail(r);
      }

      if (this.op === "update") {
        const patch = this.payload ?? {};
        if (t === "communities") {
          const ids = this.ids();
          if (ids) {
            const st = patch["status"];
            const action = st === "active" ? "activate" : st === "blocked" ? "block" : null;
            if (!action) return unsupported("bulk update other than activate/block");
            let changed = 0;
            for (let i = 0; i < ids.length; i += 1000) {
              const r = await call("POST", "/v1/admin/review/bulk", { action, ids: ids.slice(i, i + 1000) });
              if (!r.ok) return fail(r);
              changed += Number(r.body?.changed ?? 0);
            }
            return { data: Array.from({ length: changed }, () => ({})), error: null };
          }
          if (typeof id !== "string") return unsupported("update without id");
          const r = await call("PATCH", `/v1/admin/communities/${encodeURIComponent(id)}`, patch);
          return r.ok ? { data: null, error: null } : fail(r);
        }
        if (t === "submissions" && typeof id === "string" && patch["status"] === "rejected") {
          const r = await call("POST", `/v1/admin/submissions/${encodeURIComponent(id)}/reject`, {});
          return r.ok ? { data: null, error: null } : fail(r);
        }
        if (t === "takedown_requests" && typeof id === "string") {
          const r = await call("PATCH", `/v1/admin/takedowns/${encodeURIComponent(id)}`, patch);
          return r.ok ? { data: null, error: null } : fail(r);
        }
        if (t === "blocklist_terms" && typeof id === "string") {
          const r = await call("PATCH", `/v1/admin/blocklist/${encodeURIComponent(id)}`, patch);
          return r.ok ? { data: null, error: null } : fail(r);
        }
        return unsupported(`updating ${t}`);
      }

      // delete
      if (t === "communities") {
        const ids = this.ids();
        if (!ids) return unsupported("delete without ids");
        let changed = 0;
        for (let i = 0; i < ids.length; i += 1000) {
          const r = await call("POST", "/v1/admin/review/bulk", { action: "delete", ids: ids.slice(i, i + 1000) });
          if (!r.ok) return fail(r);
          changed += Number(r.body?.changed ?? 0);
        }
        return { data: Array.from({ length: changed }, () => ({})), error: null };
      }
      if (t === "blocklist_terms" && typeof id === "string") {
        const r = await call("DELETE", `/v1/admin/blocklist/${encodeURIComponent(id)}`);
        return r.ok ? { data: null, error: null } : fail(r);
      }
      return unsupported(`deleting from ${t}`);
    }
  }

  return {
    auth,
    functions,
    rpc: (name: string, args?: Json) => rpc(name, args),
    from: (table: string) => new Query(table),
  };
}
