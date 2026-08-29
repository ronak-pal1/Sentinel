import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiCircle, FiChevronRight } from "react-icons/fi";
import {
  SentinelFlowCanvas,
  buildSection2FlowGraph,
} from "../components/flow";

const GRAPH_WIDTH = 820;

const logLines = [
  {
    t: "·",
    text: "restoring the session — logs, traces, what is open",
    c: "text-stone-500",
  },
  {
    t: "✓",
    text: "checkout-svc alert received — p99 latency 4.2s",
    c: "text-[#8FBF9F]",
  },
  {
    t: "›",
    text: "run investigate --readonly checkout-svc",
    c: "text-[#EDA53B]",
  },
  {
    t: "·",
    text: "querying grafana, tracing last 4 deploys",
    c: "text-stone-500",
  },
  {
    t: "·",
    text: "  ↳ deploy 8f1c raised timeout 200ms → 50ms",
    c: "text-stone-500",
  },
  {
    t: "✓",
    text: "root cause found — config regression in 8f1c",
    c: "text-[#8FBF9F]",
  },
  {
    t: "›",
    text: "sandbox: replay traffic against patched config",
    c: "text-[#EDA53B]",
  },
  {
    t: "✓",
    text: "sandbox confirms fix — latency back to 380ms",
    c: "text-[#8FBF9F]",
  },
];

type DemoStatus = "idle" | "running" | "awaiting" | "resolved";

const capabilities = [
  { title: "Incident Flow", sub: "READ-ONLY · LIVE", active: true },
  { title: "Sandbox Verify", sub: "ISOLATED · DAILY", active: false },
  { title: "PR + Review", sub: "QODO · EVERY FIX", active: false },
  { title: "Approval Gate", sub: "HUMAN · ALWAYS ON", active: false },
];

const Section2 = () => {
  const { nodes, edges } = useMemo(() => buildSection2FlowGraph(), []);
  const [tab, setTab] = useState<"log" | "try">("log");
  const [visibleCount, setVisibleCount] = useState(logLines.length);
  const [status, setStatus] = useState<DemoStatus>("resolved");
  const [prompt, setPrompt] = useState("try: approve rollback");

  const statusLabel =
    status === "resolved"
      ? "RESOLVED"
      : status === "awaiting"
        ? "AWAITING APPROVAL"
        : status === "running"
          ? "INVESTIGATING"
          : "IDLE";

  const breakIt = () => {
    setTab("log");
    setVisibleCount(1);
    setStatus("running");
    setPrompt("try: next — step through the investigation");
  };

  const next = () => {
    if (status === "idle" || visibleCount === 0) {
      breakIt();
      return;
    }
    if (visibleCount >= logLines.length) {
      setStatus("awaiting");
      setPrompt("try: approve — human gate is required");
      return;
    }
    const nextCount = visibleCount + 1;
    setVisibleCount(nextCount);
    if (nextCount >= logLines.length) {
      setStatus("awaiting");
      setPrompt("try: approve — human gate is required");
    } else {
      setStatus("running");
      setPrompt(`step ${nextCount}/${logLines.length}`);
    }
  };

  const approve = () => {
    if (status !== "awaiting" && visibleCount < logLines.length) {
      setPrompt("finish the log first — press NEXT");
      return;
    }
    setVisibleCount(logLines.length);
    setStatus("resolved");
    setPrompt("approved — rollback queued");
    setTab("log");
  };

  const clear = () => {
    setVisibleCount(0);
    setStatus("idle");
    setPrompt("cleared — press Break It to start");
    setTab("log");
  };

  return (
    <div className="w-full font-sans px-4 sm:px-8">
      <div className="flex items-center justify-between bg-primary px-4 sm:px-5 py-2.5 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5 shrink-0">
            <span className="w-2 h-2 bg-[#1a1a1a]/80 inline-block" />
            <span className="w-2 h-2 bg-[#1a1a1a]/40 inline-block" />
            <span className="w-2 h-2 bg-[#1a1a1a]/40 inline-block" />
          </div>
          <span className="ml-1 sm:ml-3 text-[10px] sm:text-[11px] font-mono font-semibold tracking-widest text-[#1a1a1a] truncate">
            SENTINEL / INCIDENT / CHECKOUT-SVC
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-semibold text-[#1a1a1a] shrink-0">
          <span
            className={[
              "w-1.5 h-1.5 inline-block",
              status === "resolved"
                ? "bg-[#3D6B4F]"
                : status === "awaiting"
                  ? "bg-[#C9736B]"
                  : status === "running"
                    ? "bg-[#1a1a1a]"
                    : "bg-stone-500",
            ].join(" ")}
          />
          <span className="hidden xs:inline sm:inline">{statusLabel}</span>
          <span className="sm:hidden">{status === "resolved" ? "OK" : status === "awaiting" ? "WAIT" : status === "running" ? "RUN" : "IDLE"}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row border border-(--border-color) border-t-0">
        <div className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-(--border-color) bg-(--surface-color) px-5 py-5 lg:py-6">
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-4">
            CAPABILITIES
          </p>
          <ul className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {capabilities.map((item) => (
              <li
                key={item.title}
                className={
                  item.active
                    ? "border-l-2 border-(--foreground-color) bg-(--panel-color) pl-3 -ml-0.5 lg:-ml-3.5 py-1"
                    : "border-l-2 border-transparent pl-3 -ml-0.5 lg:-ml-3.5 py-1"
                }
              >
                <p className="text-[13px] font-medium text-(--foreground-color) flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-(--muted-color) inline-block" />
                  {item.title}
                </p>
                <p className="text-[10px] font-mono tracking-wide text-(--muted-color) mt-0.5 pl-2.5">
                  {item.sub}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 lg:mt-10 pt-4 border-t border-(--border-color)">
            <p className="text-[10px] font-mono text-(--muted-color)">
              {status === "resolved"
                ? "4 / 4 GATES PASSED"
                : status === "awaiting"
                  ? "3 / 4 GATES PASSED"
                  : status === "running"
                    ? `${Math.min(3, Math.ceil((visibleCount / logLines.length) * 3))} / 4 GATES PASSED`
                    : "0 / 4 GATES PASSED"}
            </p>
            <div className="h-1 bg-(--border-color) mt-2 w-full">
              <div
                className="h-1 bg-[#EDA53B] transition-all duration-300"
                style={{
                  width:
                    status === "resolved"
                      ? "100%"
                      : status === "awaiting"
                        ? "75%"
                        : status === "running"
                          ? `${Math.max(15, (visibleCount / logLines.length) * 75)}%`
                          : "0%",
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 border-r-0 lg:border-r border-(--border-color) bg-(--canvas-color)">
          <div className="overflow-x-auto">
            <div
              className="relative px-6 sm:px-8 py-8 min-h-105"
              style={{
                width: "100%",
                minWidth: GRAPH_WIDTH,
              }}
            >
              <SentinelFlowCanvas
                nodes={nodes}
                edges={edges}
                draggable
                interactive={false}
                minHeight="17.5rem"
                header={{
                  left: "INCIDENT GRAPH",
                  right: "CHECKOUT-SVC · P99 4.2S → 380MS",
                }}
              />

              <div
                className="absolute left-8 bottom-6 w-56 border border-(--card-border) shadow-sm px-4 py-3 -rotate-2"
                style={{ backgroundColor: "var(--note-warm)" }}
              >
                <p className="text-[12px] font-medium text-(--foreground-color) leading-snug">
                  Read-only first. The agent never touches state until a human
                  clicks approve.
                </p>
              </div>
              <div
                className="absolute left-105 bottom-2 w-48 border border-(--card-border) shadow-sm px-4 py-3 rotate-1"
                style={{ backgroundColor: "var(--note-cool)" }}
              >
                <p className="text-[12px] font-medium text-(--foreground-color) leading-snug">
                  No root cause found? Escalate — don't guess.
                </p>
              </div>

              <div className="absolute top-6 right-2 w-64 bg-(--panel-color) border border-(--card-border) shadow-md">
                <div className="px-3 py-2 border-b border-(--border-color)">
                  <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
                    AGENT REASONING
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  <div className="bg-(--surface-color) px-2.5 py-1.5 text-[11px] text-(--foreground-color)">
                    approve rollback of deploy 8f1c?
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px] text-(--muted-color)">
                    <FiCircle className="w-2 h-2 mt-1 fill-[#EDA53B] text-[#EDA53B] shrink-0" />
                    <span>
                      {status === "resolved"
                        ? "Approved — merge is in progress."
                        : status === "awaiting"
                          ? "Waiting on you — this action is irreversible once merged."
                          : status === "running"
                            ? "Investigating — gathering evidence before any write."
                            : "Idle — press Break It to inject a failure."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 sm:px-8 py-4 border-t border-(--border-color)">
            <div className="flex flex-wrap gap-2">
              {["TrueForge", "Qodo", "GitHub MCP"].map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-mono tracking-wide border border-(--card-border) rounded-full px-3 py-1 text-(--muted-color)"
                >
                  {t}
                </span>
              ))}
            </div>
            <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
              LIVE · 1 INCIDENT RESOLVED TODAY
            </span>
          </div>
        </div>
      </div>

      <div className=" bg-(--terminal-bg) px-4 sm:px-6 py-5">
        <div className="flex items-center gap-4 mb-3">
          <button
            type="button"
            onClick={() => setTab("log")}
            className={`text-[10px] font-mono tracking-widest pb-1 border-b-2 ${
              tab === "log"
                ? "text-[#EDA53B] border-[#EDA53B]"
                : "text-stone-500 border-transparent"
            }`}
          >
            EVENT LOG
          </button>
          <button
            type="button"
            onClick={() => setTab("try")}
            className={`text-[10px] font-mono tracking-widest pb-1 border-b-2 ${
              tab === "try"
                ? "text-[#EDA53B] border-[#EDA53B]"
                : "text-stone-500 border-transparent"
            }`}
          >
            TRY IT
          </button>
        </div>

        {tab === "log" ? (
          <div className="space-y-1.5 font-mono text-[12px] min-h-28">
            {visibleCount === 0 ? (
              <p className="text-stone-500">
                log empty — press Break It to trigger a simulated incident
              </p>
            ) : (
              logLines.slice(0, visibleCount).map((l, i) => (
                <div key={i} className={`flex gap-2 ${l.c}`}>
                  <span className="w-3 shrink-0">{l.t}</span>
                  <span>{l.text}</span>
                </div>
              ))
            )}
            {status === "resolved" && visibleCount === logLines.length && (
              <div className="flex gap-2 text-[#8FBF9F]">
                <span className="w-3 shrink-0">✓</span>
                <span>human approved — rollback of 8f1c merged</span>
              </div>
            )}
          </div>
        ) : (
          <div className="font-mono text-[12px] text-stone-300 space-y-3 min-h-28">
            <p>$ docker compose up</p>
            <p>$ open localhost:3000</p>
            <p className="text-[#EDA53B]">
              click Break It to trigger a simulated incident, then step with
              NEXT and finish with APPROVE
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={breakIt}
                className="text-[10px] font-mono tracking-widest bg-[#C9736B] text-white px-3 py-1.5 hover:bg-[#b8625a] transition-colors"
              >
                BREAK IT
              </button>
              <Link
                to="/app"
                className="text-[10px] font-mono tracking-widest border border-stone-600 text-stone-300 px-3 py-1.5 hover:border-[#EDA53B] hover:text-[#EDA53B] transition-colors"
              >
                OPEN DASHBOARD
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-stone-700">
          <div className="flex items-center gap-2 text-stone-500 font-mono text-[11px] min-w-0">
            <FiChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{prompt}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={breakIt}
              className="text-[10px] font-mono tracking-widest border border-[#C9736B] text-[#C9736B] px-3 py-1.5 hover:bg-[#C9736B] hover:text-white transition-colors"
            >
              BREAK IT
            </button>
            <button
              type="button"
              onClick={next}
              disabled={status === "resolved"}
              className="text-[10px] font-mono tracking-widest border border-stone-600 text-stone-300 px-3 py-1.5 hover:border-[#EDA53B] hover:text-[#EDA53B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              NEXT
            </button>
            <button
              type="button"
              onClick={approve}
              disabled={status === "resolved" || status === "idle"}
              className="text-[10px] font-mono tracking-widest border border-stone-600 text-stone-300 px-3 py-1.5 hover:border-[#EDA53B] hover:text-[#EDA53B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              APPROVE
            </button>
            <button
              type="button"
              onClick={clear}
              className="text-[10px] font-mono tracking-widest border border-stone-600 text-stone-300 px-3 py-1.5 hover:border-[#EDA53B] hover:text-[#EDA53B] transition-colors"
            >
              CLEAR
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-(--surface-color) border border-t-0 border-(--border-color)">
        <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
          FIG. 01 — READ, VERIFY, GATE, SHIP
        </span>
        <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
          BUILT ON TRUEFORGE
        </span>
      </div>
    </div>
  );
};

export default Section2;
