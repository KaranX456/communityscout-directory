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

type Report = { inserted: number; updated: number; skipped: { line: number; reason: string }[]; autoBlocked: number; autoFlagged: number; failed: string[] };

function bool(v: string | undefined) {
  return /^(1|true|yes|y)$/i.test((v ?? "").trim());
}

function ImportPage() {
  const cats = useQuery(categoriesQuery);
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"pending" | "active">("pending");
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
    if (!valid.length) return;
    setBusy(true);
    const rep: Report = {
      inserted: 0,
      updated: 0,
      skipped: parsed.filter((p) => !p.record).map((p) => ({ line: p.line, reason: p.errors.join("; ") })),
      autoBlocked: 0,
      autoFlagged: 0,
      failed: [],
    };
    const now = new Date().toISOString();
    try {
      for (let i = 0; i < valid.length; i += CHUNK) {
        const chunk = valid.slice(i, i + CHUNK);
        const names = chunk.map((p) => p.username);
        try {
          const existing = (check(await supabase.from("communities").select("username").in("username", names)) ?? []) as { username: string }[];
          const existingSet = new Set(existing.map((e) => e.username));
          const payload = chunk.map((p) => ({
            ...p.record,
            status,
            source: "import",
            member_count_updated_at: now,
            member_count_source: "import",
            count_confidence: 0.6,
          }));
          check(await supabase.from("communities").upsert(payload, { onConflict: "username" }));
          rep.updated += names.filter((n) => existingSet.has(n)).length;
          rep.inserted += names.filter((n) => !existingSet.has(n)).length;
          const after = (check(await supabase.from("communities").select("username,status,scam_flag").in("username", names)) ?? []) as { status: string; scam_flag: boolean | null }[];
          rep.autoBlocked += after.filter((r) => r.status === "blocked").length;
          rep.autoFlagged += after.filter((r) => r.scam_flag).length;
        } catch (err) {
          rep.failed.push(`Rows ${chunk[0]!.line}–${chunk[chunk.length - 1]!.line}: ${errMsg(err)}`);
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

  return (
    <>
      <PageHeader
        title="Import"
        description="Upload a CSV of communities. Rows are validated before anything is saved."
        actions={<Button variant="outline" onClick={downloadTemplate}>Download template</Button>}
      />
      <Panel>
        <div className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="csv">CSV file</Label>
            <input id="csv" type="file" accept=".csv,text/csv" onChange={onFile} className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imp-status">Import as status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v === "active" ? "active" : "pending")}>
              <SelectTrigger id="imp-status" className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="active">active</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void runImport()} disabled={busy || !valid.length}>
            {busy ? "Importing…" : `Import ${valid.length} valid row${valid.length === 1 ? "" : "s"}`}
          </Button>
          {rows.length ? (
            <p className="text-sm text-muted-foreground">
              {fileName}: {valid.length} valid, {parsed.length - valid.length} with errors
            </p>
          ) : null}
        </div>
      </Panel>

      {report ? (
        <div className="mt-6">
          <Panel title="Import report">
            <div className="space-y-2 p-4 text-sm" role="status">
              <p><strong>{report.inserted}</strong> inserted · <strong>{report.updated}</strong> updated · <strong>{report.skipped.length}</strong> skipped</p>
              <p>Safety check: <strong>{report.autoBlocked}</strong> auto-blocked, <strong>{report.autoFlagged}</strong> scam-flagged.</p>
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
