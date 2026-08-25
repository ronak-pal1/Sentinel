import { useState } from "react";
import { Link } from "react-router-dom";
import { FiCircle, FiChevronRight } from "react-icons/fi";

const GRAPH_WIDTH = 820;

const nodes = {
  alert: { x: 40, y: 60, w: 120, h: 44, label: "ALERT FIRES", kind: "box" },
  investigate: {
    x: 200,
    y: 60,
    w: 120,
    h: 44,
    label: "INVESTIGATE",
    kind: "box",
  },
  gate1: {
    x: 360,
    y: 52,
    w: 130,
    h: 60,
    label: "ROOT CAUSE\nFOUND?",
    kind: "diamond",
  },
  sandbox: { x: 530, y: 60, w: 120, h: 44, label: "SANDBOX FIX", kind: "box" },
  escalate: { x: 360, y: 190, w: 130, h: 44, label: "PAGE HUMAN", kind: "box" },
  pr: { x: 530, y: 190, w: 120, h: 44, label: "OPEN PR", kind: "box" },
  approve: { x: 700, y: 125, w: 120, h: 44, label: "APPROVE", kind: "accent" },
};

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

function Node({ n }: { n: (typeof nodes)[keyof typeof nodes] }) {
  const isDiamond = n.kind === "diamond";
  const isAccent = n.kind === "accent";
  return (
    <div
      className={[
        "absolute flex items-center justify-center text-center px-3 border font-mono text-[11px] tracking-wide leading-tight",
        isDiamond ? "rotate-45" : "",
        isAccent
          ? "bg-primary border-[#c98a2c] text-[#1a1a1a] font-semibold"
          : "bg-(--panel-color) border-(--card-border) text-(--foreground-color)",
      ].join(" ")}
      style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
    >
      <span
        className={
          isDiamond ? "-rotate-45 whitespace-pre-line" : "whitespace-pre-line"
        }
      >
        {n.label}
      </span>
    </div>
  );
}

function Connector({
  from,
  to,
  label,
}: {
  from: [number, number];
  to: [number, number];
  label?: string;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const midX = (x1 + x2) / 2;
  return (
    <svg
      className="absolute overflow-visible pointer-events-none text-(--muted-color)"
      style={{ left: 0, top: 0, width: 1, height: 1 }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <polygon
        points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`}
        className="fill-current"
        transform={`rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI}, ${x2}, ${y2})`}
      />
      {label && (
        <text
          x={midX}
          y={y1 - 8}
          className="fill-[#B8791F] text-[10px] font-mono font-semibold"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

const capabilities = [
  { title: "Incident Flow", sub: "READ-ONLY · LIVE", active: true },
  { title: "Sandbox Verify", sub: "ISOLATED · DAILY", active: false },
  { title: "PR + Review", sub: "QODO · EVERY FIX", active: false },
  { title: "Approval Gate", sub: "HUMAN · ALWAYS ON", active: false },
];

const Section2 = () => {
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
                backgroundImage:
                  "radial-gradient(circle, var(--dot-grid) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            >
              <div className="flex items-center justify-between mb-6 gap-4">
                <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
                  INCIDENT GRAPH
                </span>
                <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
                  CHECKOUT-SVC · P99 4.2S → 380MS
                </span>
              </div>

              <div className="relative h-70" style={{ width: GRAPH_WIDTH - 64 }}>
                <Connector from={[160, 82]} to={[196, 82]} />
                <Connector from={[320, 82]} to={[356, 82]} />
                <Connector from={[449, 78]} to={[526, 82]} label="FOUND" />
                <Connector from={[425, 105]} to={[400, 186]} label="UNKNOWN" />
                <Connector from={[490, 212]} to={[526, 212]} />
                <Connector from={[650, 82]} to={[698, 130]} />
                <Connector from={[650, 212]} to={[698, 150]} />
                {Object.values(nodes).map((n, i) => (
                  <Node n={n} key={i} />
                ))}
              </div>

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
