// PROTOTYPE — throwaway. Variant B, "Journeys": every PR is one row with the
// road it travels — asked → the agent reviews → you send → the author answers →
// approved (or opened → the agent fixes → you push → reviewers → merge) — the
// step it is on lit in the colour of whoever holds it, and on the right the
// next move and who makes it. A row opens in place for what to read.

import { useState } from "react";
import { cn } from "../../format";
import { OWNER_LABEL, OWNER_TONE, type Explained, type Step } from "./explain";
import { Ago, ChoiceButton, ReadThis, type Act } from "./parts";

export const NAME = "Journeys";

type Filter = "all" | "mine" | "review";

export function VariantB({ list, act, onOpen }: { list: Explained[]; act: Act; onOpen: (e: Explained) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(list.find((e) => e.owner === "you")?.key ?? null);
  const shown = list.filter((e) => filter === "all" || e.lane === filter);
  const yours = shown.filter((e) => e.owner === "you").length;
  return (
    <div className="pb-24">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-lg font-semibold text-fg">{yours > 0 ? `Your move on ${yours} PR${yours === 1 ? "" : "s"}` : "Nothing waits on you"}</div>
        <span className="flex-1" />
        <div className="inline-flex overflow-hidden rounded-md border border-line-strong text-xs">
          {(["all", "mine", "review"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("px-3 py-1", filter === f ? "bg-elevated font-semibold text-fg" : "text-fg-muted hover:bg-elevated/60")}>
              {f === "all" ? "All" : f === "mine" ? "Your PRs" : "You review"}
            </button>
          ))}
        </div>
      </div>
      <Legend />
      <ol className="mt-3 space-y-2">
        {shown.map((e) => (
          <Journey key={e.key} e={e} open={open === e.key} toggle={() => setOpen(open === e.key ? null : e.key)} act={act} onOpen={onOpen} />
        ))}
      </ol>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
      {(["you", "agent", "author", "done"] as const).map((o) => (
        <span key={o} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-full", OWNER_TONE[o].dot)} />
          {o === "you" ? "Your move" : o === "agent" ? "The agent works" : o === "author" ? "Author / reviewers" : "Done"}
        </span>
      ))}
    </div>
  );
}

function Journey({ e, open, toggle, act, onOpen }: { e: Explained; open: boolean; toggle: () => void; act: Act; onOpen: (e: Explained) => void }) {
  const tone = OWNER_TONE[e.owner];
  const primary = e.choices.find((c) => c.primary) ?? null;
  return (
    <li className={cn("rounded-xl border bg-surface", e.owner === "you" ? "border-amber-500/60 shadow-sm" : "border-line")}>
      <div className="grid grid-cols-1 items-center gap-3 px-4 py-3 lg:grid-cols-[minmax(14rem,1.2fr)_minmax(22rem,2fr)_minmax(14rem,1.1fr)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
            <span className="rounded border border-line-strong px-1 py-px">{e.laneLabel}</span>
            <span className="truncate">
              {e.repo} #{e.number}
            </span>
            <Ago iso={e.since} />
          </div>
          <button type="button" onClick={() => onOpen(e)} className="mt-0.5 line-clamp-2 text-left text-sm font-medium text-fg hover:underline">
            {e.title}
          </button>
        </div>

        <Stepper steps={e.steps} />

        <div className="flex min-w-0 items-center gap-2 lg:justify-end">
          <div className="min-w-0 text-right">
            <div className={cn("text-xs font-semibold", tone.text)}>{e.owner === "done" ? "Nothing to do" : `Next: ${OWNER_LABEL[e.owner].toLowerCase()}`}</div>
            <div className="truncate text-xs text-fg-muted" title={e.ask ?? e.now}>
              {e.ask ?? e.now}
            </div>
          </div>
          {primary ? <ChoiceButton choice={primary} act={act} size="sm" /> : null}
          <button type="button" onClick={toggle} aria-expanded={open} className="shrink-0 rounded px-1.5 text-fg-muted hover:bg-elevated" title={open ? "Hide" : "What happened, what to read, what's next"}>
            {open ? "▾" : "▸"}
          </button>
        </div>
      </div>
      {open && (
        <div className="grid gap-4 border-t border-line px-4 py-3 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Where it is</div>
            <p className="text-sm text-fg">{e.now}</p>
            {e.progress && e.progress.total > 0 && (
              <p className="text-xs text-sky-700 dark:text-sky-300">
                Step {Math.min(e.progress.done + 1, e.progress.total)} of {e.progress.total}: {e.progress.step}
              </p>
            )}
            <ReadThis e={e} />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-fg-subtle">What you can do</div>
            {e.choices.length === 0 ? (
              <p className="text-sm text-fg-muted">Nothing — it moves on without you.</p>
            ) : (
              <ul className="space-y-2">
                {e.choices.map((c) => (
                  <li key={c.label} className="flex items-start gap-2">
                    <ChoiceButton choice={c} act={act} size="sm" />
                    <span className="pt-0.5 text-xs text-fg-muted">{c.does}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">After that</div>
            <p className="text-sm text-fg-muted">{e.next}</p>
          </div>
        </div>
      )}
    </li>
  );
}

function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex items-start" aria-label="Where the PR is">
      {steps.map((s, i) => {
        const t = OWNER_TONE[s.who];
        return (
          <li key={i} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : s.state === "next" ? "bg-line-strong" : "bg-emerald-500/70")} />
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  s.state === "now" ? cn("size-6 text-white ring-4", t.dot, "ring-black/5 dark:ring-white/10") : s.state === "done" ? "size-4 bg-emerald-500 text-white" : "size-4 border-2 border-line-strong bg-surface",
                )}
              >
                {s.state === "done" ? "✓" : s.state === "now" ? i + 1 : ""}
              </span>
              <span className={cn("h-0.5 flex-1", i === steps.length - 1 ? "opacity-0" : steps[i + 1]?.state === "next" || s.state === "next" ? "bg-line-strong" : "bg-emerald-500/70")} />
            </div>
            <span className={cn("mt-1 truncate px-0.5 text-center text-[11px]", s.state === "now" ? cn("font-semibold", t.text) : s.state === "done" ? "text-fg-muted" : "text-fg-faint")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
