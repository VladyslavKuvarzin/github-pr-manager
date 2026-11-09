// PROTOTYPE — throwaway. Small content pieces the three Board variants share
// (what to read, a button that says what it does); each variant owns its layout.

import { cn, relativeTime } from "../../format";
import { SEVERITY_TONE, type Choice, type Explained } from "./explain";
import type { AgentAction } from "../../../../shared/types";

export type Act = (a: AgentAction) => Promise<unknown>;

export function go(choice: Choice, act: Act): void {
  if (choice.act) void act(choice.act);
  else if (choice.url) void window.api.openExternal(choice.url);
}

export function ChoiceButton({ choice, act, size = "md" }: { choice: Choice; act: Act; size?: "md" | "sm" }) {
  return (
    <button
      type="button"
      title={choice.does}
      onClick={() => go(choice, act)}
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs",
        choice.primary ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-700" : "border-line-strong bg-surface text-fg-secondary hover:bg-elevated",
      )}
    >
      {choice.label}
    </button>
  );
}

/** What to read before deciding: the summary, the findings, what goes out, the commits, what went wrong. */
export function ReadThis({ e, max = 4 }: { e: Explained; max?: number }) {
  const r = e.read;
  const nothing = !r.summary && r.findings.length === 0 && !r.plan && r.commits.length === 0 && !r.error && r.questions.length === 0;
  if (nothing) return null;
  return (
    <div className="space-y-2 text-sm">
      {r.summary && <p className="leading-snug text-fg-secondary">{r.summary}</p>}
      {r.findings.length > 0 && (
        <ul className="space-y-1">
          {r.findings.slice(0, max).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-snug">
              <span className={cn("mt-0.5 shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase", SEVERITY_TONE[f.severity] ?? SEVERITY_TONE.note)}>{f.severity}</span>
              <span className="text-fg-secondary">
                {f.text}
                {f.where && <span className="ml-1 font-mono text-[11px] text-fg-subtle">{f.where.split("/").slice(-1)[0]}</span>}
              </span>
            </li>
          ))}
          {r.findings.length > max && <li className="text-xs text-fg-subtle">+{r.findings.length - max} more</li>}
        </ul>
      )}
      {r.plan && (r.plan.comments.length > 0 || r.plan.replies.length > 0) && (
        <div className="rounded-md border border-line bg-elevated/40 p-2 text-xs">
          <div className="mb-1 font-medium text-fg">What goes out on GitHub</div>
          <ul className="space-y-1 text-fg-secondary">
            {r.plan.comments.slice(0, max).map((c, i) => (
              <li key={`c${i}`}>
                <span className="font-mono text-[11px] text-fg-subtle">
                  {c.path.split("/").slice(-1)[0]}
                  {c.line ? `:${c.line}` : ""}
                </span>{" "}
                {c.body.split("\n")[0].slice(0, 160)}
              </li>
            ))}
            {r.plan.replies.slice(0, max).map((c, i) => (
              <li key={`r${i}`}>↳ reply: {c.body.split("\n")[0].slice(0, 160)}</li>
            ))}
          </ul>
        </div>
      )}
      {r.commits.length > 0 && (
        <ul className="rounded-md border border-line bg-elevated/40 p-2 font-mono text-[11px] text-fg-secondary">
          {r.commits.map((c, i) => (
            <li key={i}>• {c}</li>
          ))}
        </ul>
      )}
      {r.questions.length > 0 && (
        <div className="text-xs">
          <div className="font-medium text-fg">Questions for the author</div>
          <ul className="mt-0.5 list-disc pl-4 text-fg-secondary">
            {r.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      {r.error && <pre className="whitespace-pre-wrap rounded-md bg-red-500/10 p-2 font-mono text-[11px] text-red-800 dark:text-red-200">{r.error}</pre>}
    </div>
  );
}

export function Ago({ iso }: { iso: string }) {
  return (
    <span className="shrink-0 text-xs text-fg-subtle" title={new Date(iso).toLocaleString()}>
      {relativeTime(iso)}
    </span>
  );
}
