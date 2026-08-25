import { useState } from "react";
import { FiCircle, FiChevronRight } from "react-icons/fi";

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

function Node({ n }: { n: (typeof nodes)[keyof typeof nodes] }) {
  const isDiamond = n.kind === "diamond";
  const isAccent = n.kind === "accent";
  return (
    <div
      className={[
        "absolute flex items-center justify-center text-center px-3 border font-mono text-[11px] tracking-wide leading-tight",
        isDiamond ? "rotate-45" : "",
        isAccent
          ? "bg-[#EDA53B] border-[#c98a2c] text-[#1a1a1a] font-semibold"
          : "bg-[#FBF7EE] border-stone-300 text-stone-700",
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
  color = "stone-400",
}: {
  from: [number, number];
  to: [number, number];
  label?: string;
  color?: string;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const midX = (x1 + x2) / 2;
  return (
    <svg
      className="absolute overflow-visible pointer-events-none"
      style={{ left: 0, top: 0, width: 1, height: 1 }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={1.5}
        className={`text-${color}`}
      />
      <polygon
        points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`}
        className={`text-${color} fill-current`}
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

const Section2 = () => {
  const [tab, setTab] = useState<"log" | "try">("log");

  return (
    <div className="w-full  font-sans px-8">
      {/* top bar */}
      <div className="flex items-center justify-between bg-[#EDA53B] px-5 py-2.5 ">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-[#1a1a1a]/80 inline-block" />
            <span className="w-2 h-2 bg-[#1a1a1a]/40 inline-block" />
            <span className="w-2 h-2 bg-[#1a1a1a]/40 inline-block" />
          </div>
          <span className="ml-3 text-[11px] font-mono font-semibold tracking-widest text-[#1a1a1a]">
            SENTINEL / INCIDENT / CHECKOUT-SVC
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#1a1a1a]">
          <span className="w-1.5 h-1.5 bg-[#3D6B4F] inline-block" />
          RESOLVED
        </div>
      </div>

      <div className="flex">
        {/* left rail */}
        <div className="w-56 shrink-0 border-r border-stone-300 bg-[#F5F0E4] px-5 py-6">
          <p className="text-[10px] font-mono tracking-widest text-stone-400 mb-4">
            CAPABILITIES
          </p>
          <ul className="space-y-4">
            {[
              { title: "Incident Flow", sub: "READ-ONLY · LIVE", active: true },
              { title: "Sandbox Verify", sub: "ISOLATED · DAILY" },
              { title: "PR + Review", sub: "QODO · EVERY FIX" },
              { title: "Approval Gate", sub: "HUMAN · ALWAYS ON" },
            ].map((item) => (
              <li
                key={item.title}
                className={
                  item.active
                    ? "border-l-2 border-[#1a1a1a] pl-3 -ml-3.5"
                    : "border-l-2 border-transparent pl-3 -ml-3.5"
                }
              >
                <p className="text-[13px] font-medium text-stone-800 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-stone-400 inline-block" />
                  {item.title}
                </p>
                <p className="text-[10px] font-mono tracking-wide text-stone-400 mt-0.5 pl-2.5">
                  {item.sub}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-4 border-t border-stone-300/70">
            <p className="text-[10px] font-mono text-stone-400">
              3 / 4 GATES PASSED
            </p>
            <div className="h-1 bg-stone-300 mt-2 w-full">
              <div className="h-1 bg-[#EDA53B] w-3/4" />
            </div>
          </div>
        </div>

        {/* main canvas */}
        <div className="flex-1 min-w-0  border-r border-black/30">
          <div
            className="relative px-8 py-8 min-h-105"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(120,113,108,0.18) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-mono tracking-widest text-stone-400">
                INCIDENT GRAPH
              </span>
              <span className="text-[10px] font-mono tracking-widest text-stone-400">
                CHECKOUT-SVC · P99 4.2S → 380MS
              </span>
            </div>

            <div className="relative h-70">
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

            {/* sticky notes */}
            <div className="absolute left-8 bottom-6 w-56 bg-[#E3DAC4] border border-stone-400/40 shadow-sm px-4 py-3 -rotate-2">
              <p className="text-[12px] font-medium text-stone-700 leading-snug">
                Read-only first. The agent never touches state until a human
                clicks approve.
              </p>
            </div>
            <div className="absolute left-105 bottom-2 w-48 bg-[#D6E2DC] border border-stone-400/40 shadow-sm px-4 py-3 rotate-1">
              <p className="text-[12px] font-medium text-stone-700 leading-snug">
                No root cause found? Escalate — don't guess.
              </p>
            </div>

            {/* chat / reasoning card */}
            <div className="absolute top-6 right-2 w-64 bg-[#FBF7EE] border border-stone-300 shadow-md">
              <div className="px-3 py-2 border-b border-stone-300">
                <p className="text-[10px] font-mono tracking-widest text-stone-400">
                  AGENT REASONING
                </p>
              </div>
              <div className="p-3 space-y-2">
                <div className="bg-stone-200 px-2.5 py-1.5 text-[11px] text-stone-700">
                  approve rollback of deploy 8f1c?
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-stone-600">
                  <FiCircle className="w-2 h-2 mt-1 fill-[#EDA53B] text-[#EDA53B] shrink-0" />
                  <span>
                    Waiting on you — this action is irreversible once merged.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* tags row */}
          <div className="flex items-center justify-between px-8 py-4 border-t border-stone-300/70">
            <div className="flex gap-2">
              {["TrueForge", "Qodo", "GitHub MCP"].map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-mono tracking-wide border border-stone-300 rounded-full px-3 py-1 text-stone-500"
                >
                  {t}
                </span>
              ))}
            </div>
            <span className="text-[10px] font-mono tracking-widest text-stone-400">
              LIVE · 1 INCIDENT RESOLVED TODAY
            </span>
          </div>
        </div>
      </div>

      {/* terminal */}
      <div className="bg-[#0D0D0D] px-6 py-5">
        <div className="flex items-center gap-4 mb-3">
          <button
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
          <div className="space-y-1.5 font-mono text-[12px]">
            {logLines.map((l, i) => (
              <div key={i} className={`flex gap-2 ${l.c}`}>
                <span className="w-3 shrink-0">{l.t}</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="font-mono text-[12px] text-stone-300 space-y-2">
            <p>$ docker compose up</p>
            <p>$ open localhost:3000</p>
            <p className="text-[#EDA53B]">
              click "Break It" to trigger a simulated incident
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-700">
          <div className="flex items-center gap-2 text-stone-500 font-mono text-[11px]">
            <FiChevronRight className="w-3.5 h-3.5" />
            <span>try: approve rollback</span>
          </div>
          <div className="flex gap-2">
            {["NEXT", "APPROVE", "CLEAR"].map((b) => (
              <button
                key={b}
                className="text-[10px] font-mono tracking-widest border border-stone-600 text-stone-300 px-3 py-1.5 hover:border-[#EDA53B] hover:text-[#EDA53B] transition-colors"
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* footer strip */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#F5F0E4] border-t border-stone-300">
        <span className="text-[10px] font-mono tracking-widest text-stone-400">
          FIG. 01 — READ, VERIFY, GATE, SHIP
        </span>
        <span className="text-[10px] font-mono tracking-widest text-stone-400">
          BUILT ON TRUEFORGE
        </span>
      </div>
    </div>
  );
};

export default Section2;
