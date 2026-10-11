import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import { useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { check, errMsg, normalizeUsername, USERNAME_RE } from "@/lib/admin";
import { categoriesQuery } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/import")({
  head: () => ({ meta: [{ title: "Import — CommunityScout Admin" }] }),
  component: ImportPage,
});

const HEADERS = ["username", "title", "description", "kind", "category", "language", "country", "member_count", "adult", "verified"] as const;
const CHUNK = 200;

type Parsed = {
  line: number;
  raw: Record<string, string>;
  username: string;
  errors: string[];
  record: Record<string, unknown> | null;
};

type Report = { inserted: number; updated: number; skipped: { line: number; reason: string }[]; skippedByServer: number; failed: string[] };
type ImportResult = { run_id: string; added: number; updated: number; skipped: number | unknown[]; errors: number | unknown[] };
type Source = { slug: string; name: string; permitted: string[] | null };

const count = (v: unknown) => (Array.isArray(v) ? v.length : Number(v ?? 0) || 0);

function bool(v: string | undefined) {
  return /^(1|true|yes|y)$/i.test((v ?? "").trim());
}

function ImportPage() {
  const cats = useQuery(categoriesQuery);
  const sources = useQuery({
    queryKey: ["admin", "sources", "approved"],
    queryFn: async () =>
      (check(await supabase.from("sources").select("slug,name,permitted").eq("review_status", "approved").order("name")) ?? []) as Source[],
  });
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [sourceSlug, setSourceSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const parsed: Parsed[] = useMemo(() => {
    const catSet = new Set((cats.data ?? []).map((c) => c.slug));
    const seen = new Set<string>();
    return rows.map((raw, i) => {
      const errors: string[] = [];
      const username = normalizeUsername(raw["username"] ?? "");
      if (!USERNAME_RE.test(username)) errors.push("invalid username");
      else if (seen.has(username)) errors.push("duplicate in file");
      seen.add(username);
      const title = (raw["title"] ?? "").trim();
      if (!title) errors.push("title required");
      const kind = (raw["kind"] ?? "").trim().toLowerCase();
      if (kind !== "channel" && kind !== "group") errors.push("kind must be channel or group");
      const category = (raw["category"] ?? "").trim().toLowerCase();
      if (category && !catSet.has(category)) errors.push(`unknown category "${category}"`);
      const mc = (raw["member_count"] ?? "").trim();
      if (!/^\d+$/.test(mc)) errors.push("member_count must be an integer ≥ 0");
      const country = (raw["country"] ?? "").trim().toUpperCase();
      if (country && !/^[A-Z]{2}$/.test(country)) errors.push("country must be 2 letters");
      const language = (raw["language"] ?? "").trim().toLowerCase();
      if (language && !/^[a-z]{2}$/.test(language)) errors.push("language must be 2 letters");
      return {
        line: i + 2,
        raw,
        username,
        errors,
        record: errors.length
          ? null
          : {
              username,
              title,
              description: (raw["description"] ?? "").trim() || null,
              kind,
              category: category || null,
              language: language || null,
              country: country || null,
              member_count: Number(mc),
              adult: bool(raw["adult"]),
              verified: bool(raw["verified"]),
            },
      };
    });
  }, [rows, cats.data]);

  const valid = parsed.filter((p) => p.record);

  function downloadTemplate() {
    const csv = `${HEADERS.join(",")}\nexample_channel,Example Channel,Short description,channel,news,en,US,1500,false,false\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "communities-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setReport(null);
    if (!file) return;
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        setRows(res.data);
        toast.success(`Read ${res.data.length} rows`);
      },
      error: () => toast.error("Could not read that CSV file."),
    });
  }

  async function runImport() {
    if (!valid.length || !sourceSlug) return;
    setBusy(true);
    const rep: Report = {
      inserted: 0,
      updated: 0,
      skipped: parsed.filter((p) => !p.record).map((p) => ({ line: p.line, reason: p.errors.join("; ") })),
      skippedByServer: 0,
      failed: [],
    };
    try {
      for (let i = 0; i < valid.length; i += CHUNK) {
        const chunk = valid.slice(i, i + CHUNK);
        const range = `Rows ${chunk[0]!.line}–${chunk[chunk.length - 1]!.line}`;
        try {
          const { data, error } = await supabase.rpc("import_batch", {
            p_source: sourceSlug,
            p_rows: chunk.map((p) => {
              const r = p.record!;
              return {
                handle: p.username,
                title: r["title"],
                description: r["description"],
                kind: r["kind"],
                category: r["category"],
                language: r["language"],
                country: r["country"],
                members: r["member_count"],
                adult: r["adult"],
              };
            }),
          });
          if (error) {
            rep.failed.push(`${range}: ${error.message}`);
            continue;
          }
          const res = (data ?? {}) as Partial<ImportResult>;
          rep.inserted += Number(res.added ?? 0);
          rep.updated += Number(res.updated ?? 0);
          rep.skippedByServer += count(res.skipped) + count(res.errors);
        } catch (err) {
          rep.failed.push(`${range}: ${errMsg(err)}`);
        }
      }
      setReport(rep);
      void qc.invalidateQueries({ queryKey: ["admin"] });
      if (rep.failed.length) toast.error("Import finished with errors");
      else toast.success(`Imported ${rep.inserted + rep.updated} communities`);
    } finally {
      setBusy(false);
    }
  }

  const selectedSource = (sources.data ?? []).find((s) => s.slug === sourceSlug);

  return (
    <>
      <PageHeader
        title="Import"
        description="Upload a CSV of communities. Rows are validated before anything is saved."
        actions={<Button variant="outline" onClick={downloadTemplate}>Download template</Button>}
      />
      <Panel>
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="imp-source">Source *</Label>
            <Select value={sourceSlug} onValueChange={setSourceSlug}>
              <SelectTrigger id="imp-source" className="w-64"><SelectValue placeholder={sources.isLoading ? "Loading sources…" : "Choose a source"} /></SelectTrigger>
              <SelectContent>
                {(sources.data ?? []).map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sources.error ? <p className="text-sm text-destructive">{errMsg(sources.error)}</p> : null}
            {selectedSource ? (
              <p className="text-sm text-muted-foreground">
                This source may supply: {(selectedSource.permitted ?? []).join(", ")}. Other columns in the CSV are ignored.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="csv">CSV file</Label>
              <input id="csv" type="file" accept=".csv,text/csv" onChange={onFile} className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground" />
            </div>
            <Button onClick={() => void runImport()} disabled={busy || !valid.length || !sourceSlug}>
              {busy ? "Importing…" : `Import ${valid.length} valid row${valid.length === 1 ? "" : "s"}`}
            </Button>
            {rows.length ? (
              <p className="text-sm text-muted-foreground">
                {fileName}: {valid.length} valid, {parsed.length - valid.length} with errors
              </p>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">Imported rows are added as pending and appear after review.</p>
        </div>
      </Panel>

      {report ? (
        <div className="mt-6">
          <Panel title="Import report">
            <div className="space-y-2 p-4 text-sm" role="status">
              <p>
                <strong>{report.inserted}</strong> added · <strong>{report.updated}</strong> updated · <strong>{report.skipped.length}</strong> skipped locally · <strong>{report.skippedByServer}</strong> skipped or rejected by the server (removed handles, unpermitted fields, bad rows)
              </p>
              {report.failed.map((f) => <p key={f} className="text-destructive">{f}</p>)}
              {report.skipped.length ? (
                <ul className="list-disc pl-5 text-muted-foreground">
                  {report.skipped.slice(0, 100).map((s) => <li key={s.line}>Line {s.line}: {s.reason}</li>)}
                </ul>
              ) : null}
            </div>
          </Panel>
        </div>
      ) : null}

      {parsed.length ? (
        <div className="mt-6">
          <Panel title="Preview">
            <div className="max-h-[32rem] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Line</TableHead><TableHead>Username</TableHead><TableHead>Title</TableHead><TableHead>Kind</TableHead><TableHead>Category</TableHead><TableHead>Members</TableHead><TableHead>Result</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((p) => (
                    <TableRow key={p.line} className={p.errors.length ? "bg-destructive/5" : undefined}>
                      <TableCell>{p.line}</TableCell>
                      <TableCell>{p.username || p.raw["username"]}</TableCell>
                      <TableCell>{p.raw["title"]}</TableCell>
                      <TableCell>{p.raw["kind"]}</TableCell>
                      <TableCell>{p.raw["category"]}</TableCell>
                      <TableCell>{p.raw["member_count"]}</TableCell>
                      <TableCell className={p.errors.length ? "text-destructive" : "text-primary"}>{p.errors.length ? p.errors.join("; ") : "OK"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
