// PROTOTYPE — throwaway. Three variants of the PR agent's Board on the Board
// view itself, switchable via `?variant=A|B|C` and the floating bar (← → keys
// too). Dev builds only: App.tsx mounts this when `import.meta.env.DEV` and the
// URL carries `variant`; otherwise the real PrBoard renders.

import { useContext, useEffect, useState } from "react";
import { AgentContext } from "../../components/agent-context";
import { explainBoard, type Explained } from "./explain";
import { NAME as NAME_A, VariantA } from "./VariantA";
import { NAME as NAME_B, VariantB } from "./VariantB";
import { NAME as NAME_C, VariantC } from "./VariantC";
import type { PullRequest } from "../../../../shared/types";

const VARIANTS = [
  { key: "A", name: NAME_A },
  { key: "B", name: NAME_B },
  { key: "C", name: NAME_C },
] as const;

export function boardVariant(): string | null {
  if (!import.meta.env.DEV) return null;
  const v = new URLSearchParams(window.location.search).get("variant");
  return v && VARIANTS.some((x) => x.key === v) ? v : null;
}

export function BoardPrototype({ prs, all, onOpen }: { prs: PullRequest[]; all: PullRequest[]; onOpen: (pr: PullRequest) => void }) {
  const { state, act } = useContext(AgentContext);
  const [variant, setVariant] = useState(boardVariant() ?? "A");
  const [notice, setNotice] = useState<string | null>(null);
  const move = (d: 1 | -1) => {
    const i = VARIANTS.findIndex((x) => x.key === variant);
    const next = VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length].key;
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    window.history.replaceState(null, "", url);
    setVariant(next);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!state) return <div className="p-8 text-center text-sm text-fg-subtle">The PR agent isn&apos;t available here.</div>;
  const list = explainBoard(prs, all, state);
  const run = async (a: Parameters<typeof act>[0]) => {
    const res = await act(a);
    setNotice(res.ok ? null : res.error);
    return res;
  };
  const open = (e: Explained) => (e.pr ? onOpen(e.pr) : void window.api.openExternal(e.url));
  const current = VARIANTS.find((x) => x.key === variant)!;
  return (
    <>
      {notice && (
        <div role="alert" className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
          {notice}
        </div>
      )}
      {variant === "A" && <VariantA list={list} act={run} onOpen={open} />}
      {variant === "B" && <VariantB list={list} act={run} onOpen={open} />}
      {variant === "C" && <VariantC list={list} items={state.items} act={run} onOpen={open} />}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-fuchsia-500 bg-zinc-900 px-2 py-1 text-sm text-white shadow-xl">
        <button type="button" aria-label="Previous variant" onClick={() => move(-1)} className="rounded-full px-2 py-0.5 hover:bg-white/15">
          ←
        </button>
        <span className="px-2 font-medium">
          PROTOTYPE {current.key} · {current.name}
        </span>
        <button type="button" aria-label="Next variant" onClick={() => move(1)} className="rounded-full px-2 py-0.5 hover:bg-white/15">
          →
        </button>
      </div>
    </>
  );
}
