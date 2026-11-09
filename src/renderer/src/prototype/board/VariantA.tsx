// PROTOTYPE — throwaway. Variant A, "Your turn first": one sentence of what you
// owe, then every decision as an open card — what happened, what to read, what
// to do, what the button does, what comes next. Everything else is status
// below, in rows that need nothing from you. No columns, no lanes.

import { useState } from "react";
import { cn } from "../../format";
import { OWNER_LABEL, OWNER_TONE, type Explained } from "./explain";
import { Ago, ChoiceButton, ReadThis, type Act } from "./parts";

export const NAME = "Your turn first";

export function VariantA({ list, act, onOpen }: { list: Explained[]; act: Act; onOpen: (e: Explained) => void }) {
  const you = list.filter((e) => e.owner === "you");
  const agent = list.filter((e) => e.owner === "agent");
  const others = list.filter((e) => e.owner === "author" || e.owner === "reviewers");
  const done = list.filter((e) => e.owner === "done");
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      <header className="rounded-xl border border-line bg-surface px-5 py-4">
        <div className="text-xl font-semibold text-fg">{you.length === 0 ? "Nothing needs you right now." : `${you.length} ${you.length === 1 ? "thing needs" : "things need"} you.`}</div>
        <div className="mt-1 text-sm text-fg-muted">
          {[agent.length > 0 && `The agent is working on ${agent.length}`, others.length > 0 && `${others.length} wait on others`, done.length > 0 && `${done.length} done today`].filter(Boolean).join(" · ") || "The agent has nothing in hand."}
        </div>
        <div className="mt-2 text-xs text-fg-subtle">The agent never posts, pushes or merges on its own here: everything below waits for your click.</div>
      </header>

      {you.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Your turn</h2>
          {you.map((e, i) => (
            <Decision key={e.key} e={e} n={i + 1} act={act} onOpen={onOpen} />
          ))}
        </section>
      )}

      <StatusList title="The agent is on it" hint="Nothing to do — it brings the result to Your turn." list={agent} act={act} onOpen={onOpen} />
      <StatusList title="Waiting on others" hint="Nothing to do — the agent picks it up again when they answer." list={others} act={act} onOpen={onOpen} />
      <StatusList title="Done today" hint="" list={done} act={act} onOpen={onOpen} />
    </div>
  );
}

function Decision({ e, n, act, onOpen }: { e: Explained; n: number; act: Act; onOpen: (e: Explained) => void }) {
  const primary = e.choices.find((c) => c.primary) ?? null;
  const rest = e.choices.filter((c) => c !== primary);
  return (
    <article className="overflow-hidden rounded-xl border border-amber-500/50 bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-line bg-amber-500/[0.06] px-5 py-2 text-xs text-fg-muted">
        <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">{n}</span>
        <span className="rounded border border-line-strong px-1.5 py-px">{e.laneLabel}</span>
        <span>
          {e.repo} #{e.number}
        </span>
        <span className="flex-1" />
        <Ago iso={e.since} />
      </div>
      <div className="space-y-4 px-5 py-4">
        <button type="button" onClick={() => onOpen(e)} className="text-left text-base font-semibold text-fg hover:underline">
          {e.title}
        </button>
        <Row label="What happened">
          <p className="text-sm text-fg">{e.now}</p>
        </Row>
        {(e.read.summary || e.read.findings.length > 0 || e.read.plan || e.read.commits.length > 0 || e.read.error || e.read.questions.length > 0) && (
          <Row label="Read this">
            <ReadThis e={e} />
          </Row>
        )}
        <Row label="Your move">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{e.ask}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {primary && <ChoiceButton choice={primary} act={act} />}
            {rest.map((c) => (
              <ChoiceButton key={c.label} choice={c} act={act} />
            ))}
          </div>
          {primary && (
            <p className="mt-2 text-xs text-fg-muted">
              <span className="font-medium text-fg-secondary">{primary.label}:</span> {primary.does}
            </p>
          )}
        </Row>
        <Row label="Then">
          <p className="text-sm text-fg-muted">{e.next}</p>
        </Row>
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3">
      <div className="pt-0.5 text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function StatusList({ title, hint, list, act, onOpen }: { title: string; hint: string; list: Explained[]; act: Act; onOpen: (e: Explained) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (list.length === 0) return null;
  return (
    <section>
      <h2 className="flex items-baseline gap-2 text-sm font-semibold text-fg">
        {title} <span className="text-xs font-normal text-fg-subtle">{list.length}</span>
        {hint && <span className="text-xs font-normal text-fg-subtle">· {hint}</span>}
      </h2>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {list.map((e) => {
          const tone = OWNER_TONE[e.owner];
          return (
            <li key={e.key} className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", tone.dot)} />
                <span className={cn("w-20 shrink-0 text-xs font-medium", tone.text)}>{OWNER_LABEL[e.owner]}</span>
                <button type="button" onClick={() => onOpen(e)} className="min-w-0 flex-1 truncate text-left text-sm text-fg hover:underline" title={e.title}>
                  #{e.number} {e.title}
                </button>
                <Ago iso={e.since} />
                {e.choices.length > 0 && (
                  <button type="button" className="text-xs text-sky-700 hover:underline dark:text-sky-300" onClick={() => setOpen(open === e.key ? null : e.key)}>
                    {open === e.key ? "Less" : "More"}
                  </button>
                )}
              </div>
              <div className="ml-[7.25rem] mt-0.5 text-xs text-fg-muted">
                {e.now}
                {e.progress && e.progress.total > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 align-middle">
                    <span className="inline-block h-1 w-24 overflow-hidden rounded-full bg-line-strong">
                      <span className="block h-full bg-sky-500" style={{ width: `${(100 * e.progress.done) / e.progress.total}%` }} />
                    </span>
                    {e.progress.step}
                  </span>
                )}
              </div>
              {open === e.key && (
                <div className="ml-[7.25rem] mt-2 space-y-2">
                  <p className="text-xs text-fg-subtle">Then: {e.next}</p>
                  <div className="flex flex-wrap gap-2">
                    {e.choices.map((c) => (
                      <span key={c.label} className="flex items-center gap-2">
                        <ChoiceButton choice={c} act={act} size="sm" />
                        <span className="text-[11px] text-fg-subtle">{c.does}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
