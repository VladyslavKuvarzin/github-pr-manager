// PROTOTYPE — throwaway. Three variants of the PR agent's Board, switchable via
// `?variant=A|B|C` on the Board view (dev builds only). This file turns each
// card the real `stageColumns` places into plain words: what is happening, what
// is needed from you, what to read, what each button does and what comes next.
// The variants share these words, not a layout.

import { resultCard, type RunAsk, type RunFinding } from "../../../../shared/agent-result";
import type { PublishSummary } from "../../../../shared/agent-publish";
import { currentStep } from "../../../../shared/agent-stream";
import { runFor, stageColumns, stageLine, todayKey, type BoardStage, type StageCard } from "../../../../shared/agent-view";
import type { AgentAction, AgentItem, AgentState, PullRequest } from "../../../../shared/types";

export type Owner = "you" | "agent" | "author" | "reviewers" | "done";

export const OWNER_LABEL: Record<Owner, string> = { you: "You", agent: "The agent", author: "The author", reviewers: "Reviewers", done: "Nobody" };
export const OWNER_ORDER: Record<Owner, number> = { you: 0, agent: 1, author: 2, reviewers: 2, done: 3 };
/** One colour per owner, used the same way by every variant. */
export const OWNER_TONE: Record<Owner, { dot: string; text: string; soft: string; ring: string }> = {
  you: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", soft: "bg-amber-500/10", ring: "border-amber-500/60" },
  agent: { dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-300", soft: "bg-sky-500/10", ring: "border-sky-500/50" },
  author: { dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-300", soft: "bg-violet-500/10", ring: "border-violet-500/40" },
  reviewers: { dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-300", soft: "bg-violet-500/10", ring: "border-violet-500/40" },
  done: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", soft: "bg-emerald-500/10", ring: "border-emerald-500/40" },
};

export interface Choice {
  label: string;
  /** What pressing it does, in a sentence. */
  does: string;
  act?: AgentAction;
  url?: string;
  primary?: boolean;
}

export interface Step {
  label: string;
  who: Owner;
  state: "done" | "now" | "next";
}

export interface Explained {
  key: string;
  card: StageCard;
  pr: PullRequest | null;
  item: AgentItem | null;
  stage: BoardStage;
  lane: "mine" | "review";
  /** "Your PR" / "You review". */
  laneLabel: string;
  owner: Owner;
  number: number;
  repo: string;
  title: string;
  url: string;
  since: string;
  /** What is happening, one plain sentence with a subject. */
  now: string;
  /** What is needed from you now, as an instruction — null when nothing is. */
  ask: string | null;
  /** What to read before deciding. */
  read: {
    summary: string | null;
    findings: RunFinding[];
    plan: PublishSummary | null;
    asks: RunAsk[];
    commits: string[];
    error: string | null;
    questions: string[];
  };
  choices: Choice[];
  /** What happens after, whoever acts. */
  next: string;
  steps: Step[];
  progress: { step: string; done: number; total: number; activity: string | null } | null;
  /** Nothing has gone out: the agent prepared it and waits for you. */
  shadow: boolean;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const REVIEW_STEPS: Array<[string, Owner]> = [
  ["Review asked", "author"],
  ["Agent reviews", "agent"],
  ["You send", "you"],
  ["Author answers", "author"],
  ["Approved", "done"],
];
const MINE_STEPS: Array<[string, Owner]> = [
  ["Opened", "you"],
  ["Agent fixes", "agent"],
  ["You push", "you"],
  ["Reviewers", "reviewers"],
  ["Merge", "you"],
];

function journey(lane: "mine" | "review", at: number, nowWho?: Owner): Step[] {
  const base = lane === "review" ? REVIEW_STEPS : MINE_STEPS;
  return base.map(([label, who], i) => ({ label, who: i === at && nowWho ? nowWho : who, state: i < at ? "done" : i === at ? "now" : "next" }));
}

/** The whole Board in plain words, every card once. */
export function explainBoard(prs: readonly PullRequest[], all: readonly PullRequest[], state: AgentState): Explained[] {
  const board = stageColumns(prs, all, state, { today: todayKey(new Date()), idle: state.idle, orchestrated: state.orchestrated });
  const out: Explained[] = [];
  for (const lane of ["mine", "review"] as const) {
    for (const col of ["you", "agent", "waiting", "done"] as const) {
      for (const card of board[lane][col]) out.push(explain(card, lane, state));
    }
  }
  return out.sort((a, b) => OWNER_ORDER[a.owner] - OWNER_ORDER[b.owner] || rank(a) - rank(b) || a.since.localeCompare(b.since));
}

/** Within Your turn: a ready move first (one click), then a question, a failure, then what isn't started yet. */
const KIND_RANK: Record<string, number> = { merge: 0, reapprove: 0, send: 1, push: 1, reask: 1, draftReview: 2, decide: 2, fix: 3, review: 4, rereview: 4, fixYourself: 4, draft: 9 };
function rank(e: Explained): number {
  return e.owner === "you" ? (KIND_RANK[e.stage.action?.kind ?? ""] ?? 5) : 0;
}

function doing(item: AgentItem): string {
  switch (item.scenario) {
    case "review":
      return "reviewing it";
    case "rereview":
      return "re-reviewing the author's answers";
    case "brief":
      return "writing a brief of this big PR";
    case "drive":
      return (item.reasons ?? []).includes("self") ? "self-reviewing your PR before reviewers see it" : "fixing your PR";
    case "afterMerge":
      return "preparing the Jira update";
    default:
      return "working on it";
  }
}

function explain(card: StageCard, lane: "mine" | "review", state: AgentState): Explained {
  const { stage, pr } = card;
  const item = stage.item;
  const number = pr?.number ?? item?.prNumber ?? 0;
  const url = pr?.url ?? item?.url ?? "";
  const res = item ? resultCard(item) : null;
  const read: Explained["read"] = {
    summary: res?.summary || null,
    findings: res?.findings ?? [],
    plan: item?.plan ?? null,
    asks: res?.asks ?? [],
    commits: item?.drive?.commits.map((c) => c.subject) ?? [],
    error: item?.error ?? null,
    questions: res?.authorQuestions ?? [],
  };
  const open: Choice = { label: lane === "review" ? "Review on GitHub myself" : "Open on GitHub", does: "Opens the PR in your browser; the agent leaves it to you.", url };
  const runId = item?.runId ?? "";
  const prId = card.prId;
  const kind = stage.action?.kind ?? null;
  let owner: Owner = "done";
  let now = stageLine(stage, pr) || item?.headline || "";
  let ask: string | null = null;
  let choices: Choice[] = [];
  let next = "";
  let steps: Step[] = journey(lane, 0);
  let progress: Explained["progress"] = null;

  if (stage.column === "agent" && item) {
    owner = "agent";
    steps = journey(lane, 1);
    const r = runFor(state, item.runId);
    if (item.state === "queued") {
      now = `The agent will start ${doing(item)} soon — it waits its turn.`;
      choices = [{ label: "Don't run it", does: "Takes it out of the line; the agent won't take this commit up again.", act: { type: "skip", runId } }];
    } else {
      now = `The agent is ${doing(item)}.`;
      const steps0 = r?.progress.steps ?? [];
      progress = { step: (r && currentStep(r.progress)?.subject) || item.headline, done: steps0.filter((s) => s.status === "completed").length, total: steps0.length, activity: r?.progress.activity ?? null };
      choices = [{ label: "Stop", does: "Stops the run; what it found so far comes back as a note.", act: { type: "stop", runId } }];
    }
    next =
      lane === "review"
        ? "When it finishes, the draft comes to you to read. Nothing is posted on GitHub until you press Send."
        : "When it finishes, you see its commits first. Nothing is pushed to your branch until you press Push.";
  } else if (stage.column === "waiting") {
    owner = lane === "mine" ? "reviewers" : "author";
    steps = journey(lane, 3);
    if (lane === "mine") {
      const pending = pr?.reviewers.filter((r) => r.reviewState !== "approved").map((r) => r.login) ?? [];
      now = pr?.blockedByStack ? "It waits for the PR below it in the stack to merge first." : pending.length > 0 ? `Waiting for ${pending.join(", ")} to review.` : "Waiting for reviewers.";
      next = "When they approve and CI is green, a Merge button appears here. If they comment, the agent answers what it can and asks you the rest.";
    } else {
      now = `${pr?.viewerApproved ? "You approved it" : pr?.viewerHasReviewed ? "You asked for changes" : "You commented"} — now it's the author's turn${pr && pr.unresolvedThreads > 0 ? ` (${plural(pr.unresolvedThreads, "thread")} open)` : ""}.`;
      next = "When the author pushes or answers your comments, the agent re-reviews it on its own and brings you the result.";
      choices = [{ label: "Re-review now", does: "The agent looks at it again right away instead of waiting for the author.", act: { type: "enqueue", prId } }];
    }
  } else if (stage.column === "done") {
    owner = "done";
    steps = journey(lane, 5);
    if (stage.askedAgain) {
      now = "Your review was asked for again — but your approval still stands on this exact commit.";
      next = "Nothing waits on you. Approve again only clears the request on GitHub.";
      choices = [{ label: "Approve again", does: "Answers the request with your approval on the same commit — one line, signed by the agent.", act: { type: "approveAgain", prId } }];
    } else {
      now = lane === "mine" ? (item?.scenario === "merge" ? "Merged." : (item?.headline ?? "Done.")) : pr?.viewerApproved ? "You approved it." : (item?.headline ?? "Done.");
      next = "Nothing more to do.";
    }
    if (kind === "updateJira" && item) {
      choices = [{ label: "Update Jira…", does: "Opens the Jira dry run's session; it asks before every change.", act: { type: "continue", runId } }];
    }
  } else if (stage.column === "you") {
    owner = "you";
    const plan = read.plan;
    switch (kind) {
      case "send": {
        steps = journey(lane, 2);
        const n = plan?.comments.length ?? 0;
        const approve = plan?.event === "APPROVE";
        const replies = plan?.replies.length ?? 0;
        const resolves = plan?.resolves ?? 0;
        if (item?.scenario === "rereview") {
          now = `The author answered. The agent checked the answers${resolves > 0 ? `, would resolve ${plural(resolves, "thread")}` : ""}${replies > 0 ? ` and drafted ${plural(replies, "reply", "replies")}` : ""}${approve ? " — and suggests approving now" : ""}.`;
        } else {
          now = approve ? "The agent reviewed the latest commit and suggests approving." : `The agent drafted a review: ${plan?.event === "REQUEST_CHANGES" ? "request changes" : "comment"}, ${plural(n, "inline comment")}.`;
        }
        ask = approve ? "Read the summary — then approve, or discard it." : "Check the comments — then send, edit or discard.";
        choices = [
          {
            label: stage.action?.label ?? "Send",
            primary: true,
            does: `Posts ${approve ? "an approval" : `the review${n > 0 ? ` with ${plural(n, "comment")}` : ""}`} on GitHub under your name, signed by the agent. Until then nothing is on GitHub.`,
            act: { type: "publish", runId },
          },
          ...(item?.sessionId ? [{ label: "Edit in Claude", does: "Opens the session so you can change the draft; the new draft comes back here.", act: { type: "continue", runId } } as Choice] : []),
          { label: "Discard", does: "Throws the draft away; the agent leaves this commit alone.", act: { type: "skip", runId } },
        ];
        next = approve
          ? "After you approve, the author can merge. If they push again, the agent reviews the new commits."
          : "The author answers; the agent checks the answers and brings you a re-review here.";
        break;
      }
      case "draftReview": {
        steps = journey(lane, 2);
        const lines = pr ? pr.additions + pr.deletions : 0;
        now = `Too big for an automatic review${lines ? ` (${lines.toLocaleString("en-US")} lines)` : ""} — the agent wrote a brief${read.questions.length > 0 ? ` with ${plural(read.questions.length, "question")} for the author` : ""}.`;
        ask = "Read the brief — then let the agent draft the review, or review it yourself.";
        choices = [
          { label: "Draft a review", primary: true, does: "Starts a full review that carries the brief's questions; the draft comes back here for you to send.", act: { type: "reviewAnyway", runId } },
          { label: "I'll review myself", does: "Drops the brief; the agent leaves this commit to you.", act: { type: "skip", runId } },
        ];
        next = "The draft comes back to you here. Nothing is posted until you send it.";
        break;
      }
      case "reapprove":
      case "reask": {
        steps = journey(lane, lane === "review" ? 2 : 3, "you");
        const logins = item?.reapproval?.logins ?? [];
        now =
          kind === "reapprove"
            ? `Only the base branch changed since you approved, and GitHub took your approval away — the PR's own changes are line for line the same.`
            : `Only the base branch changed, and GitHub dismissed ${logins.join(", ")}'s approval${logins.length === 1 ? "" : "s"} — nothing they approved changed.`;
        ask = kind === "reapprove" ? "Give your approval back." : `Ask ${logins.join(", ")} again.`;
        choices = [
          {
            label: stage.action?.label ?? "Re-approve",
            primary: true,
            does: kind === "reapprove" ? "Posts your approval again on the new commit, signed by the agent." : "Re-requests their review; GitHub notifies them, nothing is written in the PR.",
            act: { type: "reapprove", runId },
          },
          { label: "I'll look myself", does: "Turns the offer down.", act: { type: "skip", runId } },
        ];
        next = kind === "reapprove" ? "The PR is approved again; nothing else changes." : "They get a notification; the PR waits for them.";
        break;
      }
      case "merge": {
        steps = journey("mine", 4);
        const approved = pr?.reviewers.filter((r) => r.reviewState === "approved").map((r) => r.login) ?? [];
        now = `Ready to merge${approved.length > 0 ? ` — approved by ${approved.join(", ")}` : ""}${pr?.ciState === "success" ? ", CI green" : ""}.`;
        ask = "Merge it.";
        choices = [
          {
            label: "Merge",
            primary: true,
            does: `Merges it on GitHub${item?.mergeMethod ? ` (${item.mergeMethod})` : ""} — exactly this commit; GitHub refuses if anyone pushes first.`,
            act: { type: "merge", runId },
          },
          open,
        ];
        next = "Then the agent prepares the Jira update for you to apply.";
        break;
      }
      case "push": {
        steps = journey("mine", 2);
        const n = item?.drive?.commits.length ?? 0;
        now = `The agent fixed ${(item?.reasons ?? []).includes("ci") ? "the failing CI" : (item?.reasons ?? []).includes("self") ? "what its self-review found" : "what reviewers asked"}: ${plural(n, "commit")} ready.`;
        ask = "Look at the commits — then push them.";
        choices = [
          { label: stage.action?.label ?? "Push", primary: true, does: "Pushes these commits to your branch — fast-forward only, never --force. CI runs again.", act: { type: "push", runId } },
          ...(item?.sessionId ? [{ label: "Open in Claude", does: "Opens the session in your terminal to change them.", act: { type: "continue", runId } } as Choice] : []),
          { label: "Discard", does: "Drops the commits; the agent leaves this commit alone.", act: { type: "skip", runId } },
        ];
        next = "CI runs on the new commits. Green and approved → a Merge button comes here.";
        break;
      }
      case "decide": {
        steps = journey("mine", 2);
        const q = read.asks[0];
        now = `The agent needs your decision${q ? `: ${q.question}` : ""}`;
        ask = "Answer — only you can decide this.";
        choices = (q?.options ?? []).map((o, i) => ({ label: o, primary: i === 0, does: "Sends this answer to the same session; it goes on from there.", act: { type: "answer", runId, text: o } }) as Choice);
        next = "The agent continues with your answer and brings the result back here.";
        break;
      }
      case "fix": {
        steps = journey(lane, 1, "you");
        now = `The agent couldn't finish: ${item?.headline ?? ""}`;
        ask = "See what went wrong — then try again, or leave it.";
        choices = [
          {
            label: stage.action?.label ?? "Try again",
            primary: true,
            does: stage.action?.label === "Open in Claude" ? "Opens the session in your terminal where it stopped." : "Starts it over with a fresh session.",
            act: stage.action?.label === "Open in Claude" ? { type: "continue", runId } : { type: "retry", runId },
          },
          { label: "Leave it", does: "The agent won't try this commit again.", act: { type: "skip", runId } },
        ];
        next = "A new run starts; its result comes back here.";
        break;
      }
      case "review":
      case "rereview": {
        steps = journey("review", kind === "review" ? 0 : 3, "you");
        const again = kind === "rereview";
        now = `${again ? (pr?.myReReviewDue ? "The author answered your review" : "Your review was asked for again") : pr?.requestedOfMe ? "Your review is requested" : "Your team's review is requested"} — the agent hasn't ${again ? "re-reviewed" : "drafted"} it${stage.why ? ` (${stage.why.charAt(0).toLowerCase()}${stage.why.slice(1)})` : ""}.`;
        ask = `Let the agent ${again ? "re-review" : "review"} it — or do it yourself.`;
        choices = [
          { label: again ? "Let the agent re-review" : "Let the agent review", primary: true, does: "The agent starts now; you get the draft here. Nothing is posted until you press Send.", act: { type: "enqueue", prId } },
          open,
        ];
        next = "The draft comes back to you here.";
        break;
      }
      case "fixYourself": {
        steps = journey("mine", 1, "you");
        ask = "Let the agent fix it — or fix it yourself.";
        choices = [
          { label: "Let the agent fix it", primary: true, does: "The agent fixes it in a separate checkout; you see the commits before anything is pushed.", act: { type: "enqueue", prId } },
          open,
        ];
        next = "Its commits come back to you here to push.";
        break;
      }
      case "draft":
        steps = journey("mine", 0, "you");
        now = "It's a draft.";
        ask = "Mark it ready for review on GitHub when it is.";
        choices = [{ ...open, primary: true }];
        next = "Once it's ready, the agent self-reviews it before reviewers look.";
        break;
      default:
        ask = "Open it on GitHub.";
        choices = [{ ...open, primary: true }];
    }
  }

  return {
    key: card.prId,
    card,
    pr,
    item,
    stage,
    lane,
    laneLabel: lane === "mine" ? "Your PR" : "You review",
    owner,
    number,
    repo: pr?.repo ?? item?.repo ?? "",
    title: pr?.title ?? item?.title ?? "",
    url,
    since: stage.since,
    now,
    ask,
    read,
    choices,
    next,
    steps,
    progress,
    shadow: item?.mode === "shadow" && stage.column === "you",
  };
}

export const SEVERITY_TONE: Record<string, string> = {
  blocker: "bg-red-600 text-white",
  major: "bg-red-500/15 text-red-700 dark:text-red-300",
  minor: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  note: "bg-elevated text-fg-muted",
};
