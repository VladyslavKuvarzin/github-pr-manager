// PROTOTYPE — throwaway. Variant C, "Inbox + detail": a mail client. On the
// left every PR in one list, grouped by whose move it is; on the right the one
// you picked, whole — who holds it, its road, what to read, every button with
// what it does, what comes next and what already happened. The first thing
// that needs you is open when you arrive.

import { useState } from "react";
import { cn, relativeTime } from "../../format";
import { OWNER_LABEL, OWNER_TONE, type Explained, type Owner } from "./explain";
import { ChoiceButton, ReadThis, type Act } from "./parts";
import type { AgentItem } from "../../../../shared/types";

export const NAME = "Inbox + detail";

const GROUPS: Array<{ title: string; owners: Owner[]; empty: string }> = [
  { title: "Needs you", owners: ["you"], empty: "Nothing — you're clear." },
  { title: "The agent is working", owners: ["agent"], empty: "Idle." },
  { title: "Waiting on others", owners: ["author", "reviewers"], empty: "Nobody to wait for." },
  { title: "Done today", owners: ["done"], empty: "Nothing yet." },
];

export function VariantC({ list, items, act, onOpen }: { list: Explained[]; items: readonly AgentItem[]; act: Act; onOpen: (e: Explained) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const selected = list.find((e) => e.key === picked) ?? list.find((e) => e.owner === "you") ?? list[0] ?? null;
  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-4 pb-24 lg:grid-cols-[22rem_1fr]">
      <nav className="overflow-hidden rounded-xl border border-line bg-surface">
        {GROUPS.map((g) => {
          const rows = list.filter((e) => g.owners.includes(e.owner));
          const tone = OWNER_TONE[g.owners[0]];
          return (
            <section key={g.title}>
              <h3 className={cn("flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs font-semibold", g.owners[0] === "you" && rows.length > 0 ? cn(tone.soft, tone.text) : "bg-elevated/50 text-fg-muted")}>
                <span aria-hidden className={cn("size-2 rounded-full", tone.dot)} />
                {g.title}
                <span className="ml-auto tabular-nums">{rows.length}</span>
              </h3>
              {rows.length === 0 ? (
                <div className="border-b border-line px-3 py-2 text-xs text-fg-faint">{g.empty}</div>
              ) : (
                rows.map((e) => (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => setPicked(e.key)}
                    className={cn("block w-full border-b border-l-4 border-b-line px-3 py-2 text-left", selected?.key === e.key ? cn("bg-elevated", tone.ring) : "border-l-transparent hover:bg-elevated/50")}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
                      <span>#{e.number}</span>
                      <span>{e.laneLabel}</span>
                      <span className="ml-auto">{relativeTime(e.since)}</span>
                    </div>
                    <div className="truncate text-sm font-medium text-fg">{e.title}</div>
                    <div className={cn("truncate text-xs", e.owner === "you" ? "font-medium text-amber-800 dark:text-amber-200" : "text-fg-muted")}>{e.ask ?? e.now}</div>
                  </button>
                ))
              )}
            </section>
          );
        })}
      </nav>

      {selected ? <Detail e={selected} items={items.filter((i) => i.prId === selected.key)} act={act} onOpen={onOpen} /> : <div className="text-sm text-fg-subtle">Nothing on the Board.</div>}
    </div>
  );
}

function Detail({ e, items, act, onOpen }: { e: Explained; items: readonly AgentItem[]; act: Act; onOpen: (e: Explained) => void }) {
  const tone = OWNER_TONE[e.owner];
  const history = [...items].sort((a, b) => (b.finishedAt ?? b.startedAt ?? b.queuedAt).localeCompare(a.finishedAt ?? a.startedAt ?? a.queuedAt)).slice(0, 6);
  return (
    <article className="rounded-xl border border-line bg-surface">
      <header className={cn("rounded-t-xl border-b border-line px-5 py-3", tone.soft)}>
        <div className={cn("text-xs font-semibold uppercase tracking-wide", tone.text)}>{e.owner === "done" ? "Nothing waits on anyone" : e.owner === "you" ? "Waiting on you" : `Waiting on ${OWNER_LABEL[e.owner].toLowerCase()}`}</div>
        <button type="button" onClick={() => onOpen(e)} className="mt-0.5 text-left text-lg font-semibold text-fg hover:underline">
          {e.title}
        </button>
        <div className="text-xs text-fg-subtle">
          {e.laneLabel} · {e.repo} #{e.number}
        </div>
      </header>

      <div className="grid gap-6 px-5 py-4 xl:grid-cols-[1fr_13rem]">
        <div className="min-w-0 space-y-5">
          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Now</h4>
            <p className="mt-1 text-base text-fg">{e.now}</p>
            {e.progress && e.progress.total > 0 && (
              <div className="mt-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: e.progress.total }, (_, i) => (
                    <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < e.progress!.done ? "bg-emerald-500" : i === e.progress!.done ? "bg-sky-500" : "bg-line-strong")} />
                  ))}
                </div>
                <div className="mt-1 text-xs text-sky-700 dark:text-sky-300">{e.progress.step}</div>
                {e.progress.activity && <div className="truncate font-mono text-[11px] text-fg-subtle">{e.progress.activity}</div>}
              </div>
            )}
          </section>

          {(e.read.summary || e.read.findings.length > 0 || e.read.plan || e.read.commits.length > 0 || e.read.error || e.read.questions.length > 0) && (
            <section>
              <h4 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Read this first</h4>
              <div className="mt-1">
                <ReadThis e={e} max={8} />
              </div>
            </section>
          )}

          <section className={cn("rounded-lg border p-3", e.owner === "you" ? "border-amber-500/50 bg-amber-500/[0.05]" : "border-line")}>
            <h4 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{e.owner === "you" ? "What you need to do" : "What you can do"}</h4>
            {e.ask && <p className="mt-1 text-sm font-semibold text-fg">{e.ask}</p>}
            {e.choices.length === 0 ? (
              <p className="mt-1 text-sm text-fg-muted">Nothing — it moves on without you.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {e.choices.map((c) => (
                  <li key={c.label} className="grid grid-cols-[auto_1fr] items-start gap-3">
                    <ChoiceButton choice={c} act={act} />
                    <span className="pt-1.5 text-xs text-fg-muted">{c.does}</span>
                  </li>
                ))}
              </ul>
            )}
            {e.shadow && <p className="mt-2 text-[11px] text-fg-subtle">Nothing has gone out yet — the agent prepared this and waits for you.</p>}
          </section>

          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">What happens next</h4>
            <p className="mt-1 text-sm text-fg-muted">{e.next}</p>
          </section>

          {history.length > 0 && (
            <section>
              <h4 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">What already happened</h4>
              <ul className="mt-1 space-y-1 text-xs">
                {history.map((i) => (
                  <li key={i.runId} className="flex gap-2">
                    <span className="w-16 shrink-0 text-fg-subtle">{relativeTime(i.finishedAt ?? i.startedAt ?? i.queuedAt)}</span>
                    <span className="text-fg-secondary">{i.headline}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside>
          <h4 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">The road</h4>
          <ol className="mt-2 space-y-0">
            {e.steps.map((s, i) => {
              const t = OWNER_TONE[s.who];
              return (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn("mt-0.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold", s.state === "now" ? cn(t.dot, "text-white") : s.state === "done" ? "bg-emerald-500 text-white" : "border-2 border-line-strong")}>
                      {s.state === "done" ? "✓" : s.state === "now" ? "•" : ""}
                    </span>
                    {i < e.steps.length - 1 && <span className={cn("w-0.5 flex-1", s.state === "done" ? "bg-emerald-500/60" : "bg-line-strong")} style={{ minHeight: 18 }} />}
                  </div>
                  <div className="pb-3">
                    <div className={cn("text-sm", s.state === "now" ? cn("font-semibold", t.text) : s.state === "done" ? "text-fg-muted" : "text-fg-faint")}>{s.label}</div>
                    {s.state === "now" && <div className="text-[11px] text-fg-subtle">{OWNER_LABEL[s.who]} now</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </article>
  );
}
