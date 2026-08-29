import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiCircle, FiChevronRight } from "react-icons/fi";
import { SentinelFlowCanvas } from "../components/flow";
import {
  capabilityConfigs,
  capabilitiesList,
  type CapabilityId,
} from "./section2Capabilities";

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

const Section2 = () => {
  const [activeCapability, setActiveCapability] =
    useState<CapabilityId>("incident");
  const activeConfig = capabilityConfigs[activeCapability];
  const isIncidentDemo = activeCapability === "incident";

  const { nodes, edges } = useMemo(
    () => activeConfig.graphBuilder(),
    [activeCapability, activeConfig],
  );

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

  const incidentAgentStatus =
    status === "resolved"
      ? "Approved — merge is in progress."
      : status === "awaiting"
        ? "Waiting on you — this action is irreversible once merged."
        : status === "running"
          ? "Investigating — gathering evidence before any write."
          : "Idle — press Break It to inject a failure.";

  const gateLabel = isIncidentDemo
    ? status === "resolved"
      ? "4 / 4 GATES PASSED"
      : status === "awaiting"
        ? "3 / 4 GATES PASSED"
        : status === "running"
          ? `${Math.min(3, Math.ceil((visibleCount / logLines.length) * 3))} / 4 GATES PASSED`
          : "0 / 4 GATES PASSED"
    : `${activeConfig.gateIndex} / 4 GATES PASSED`;

  const gateWidth = isIncidentDemo
    ? status === "resolved"
      ? "100%"
      : status === "awaiting"
        ? "75%"
        : status === "running"
          ? `${Math.max(15, (visibleCount / logLines.length) * 75)}%`
          : "0%"
    : `${(activeConfig.gateIndex / 4) * 100}%`;

  const displayPrompt = isIncidentDemo
    ? prompt
    : "switch to Incident Flow to run the live demo";

  const breakIt = () => {
    if (!isIncidentDemo) return;
    setTab("log");
    setVisibleCount(1);
    setStatus("running");
    setPrompt("try: next — step through the investigation");
  };

  const next = () => {
    if (!isIncidentDemo) return;
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
    if (!isIncidentDemo) return;
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
    if (!isIncidentDemo) return;
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
              isIncidentDemo && status === "resolved"
                ? "bg-[#3D6B4F]"
                : isIncidentDemo && status === "awaiting"
                  ? "bg-[#C9736B]"
                  : isIncidentDemo && status === "running"
                    ? "bg-[#1a1a1a]"
                    : "bg-stone-500",
            ].join(" ")}
          />
          <span className="hidden xs:inline sm:inline">
            {isIncidentDemo ? statusLabel : activeConfig.title.toUpperCase()}
          </span>
          <span className="sm:hidden">
            {isIncidentDemo
              ? status === "resolved"
                ? "OK"
                : status === "awaiting"
                  ? "WAIT"
                  : status === "running"
                    ? "RUN"
                    : "IDLE"
              : activeConfig.gateIndex}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row border border-(--border-color) border-t-0">
        <div className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-(--border-color) bg-(--surface-color) px-5 py-5 lg:py-6">
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-4">
            CAPABILITIES
          </p>
          <ul className="grid grid-cols-2 lg:grid-cols-1 gap-4" role="tablist">
            {capabilitiesList.map((item) => {
              const selected = activeCapability === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveCapability(item.id)}
                    className={[
                      "w-full text-left border-l-2 pl-3 -ml-0.5 lg:-ml-3.5 py-1 transition-colors",
                      selected
                        ? "border-(--foreground-color) bg-(--panel-color)"
                        : "border-transparent hover:border-(--muted-color)/40 hover:bg-(--panel-color)/50",
                    ].join(" ")}
                  >
                    <p className="text-[13px] font-medium text-(--foreground-color) flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-(--muted-color) inline-block" />
                      {item.title}
                    </p>
                    <p className="text-[10px] font-mono tracking-wide text-(--muted-color) mt-0.5 pl-2.5">
                      {item.sub}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 lg:mt-10 pt-4 border-t border-(--border-color)">
            <p className="text-[10px] font-mono text-(--muted-color)">
              {gateLabel}
            </p>
            <div className="h-1 bg-(--border-color) mt-2 w-full">
              <div
                className="h-1 bg-[#EDA53B] transition-all duration-300"
                style={{ width: gateWidth }}
              />
            </div>
          </div>
        </div>

        <div
          className="flex-1 min-w-0 border-r-0 lg:border-r border-(--border-color) bg-(--canvas-color)"
          role="tabpanel"
        >
          <div className="relative px-4 sm:px-8 py-6 sm:py-8 min-h-72 lg:min-h-105">
            <SentinelFlowCanvas
              key={activeCapability}
              nodes={nodes}
              edges={edges}
              phase={activeConfig.highlightPhase}
              draggable
              interactive={false}
              minHeight="14rem"
              header={activeConfig.header}
            />

            <div className="flex flex-col gap-3 mt-4 lg:hidden">
              {activeConfig.notes.map((note, i) => (
                <div
                  key={i}
                  className="border border-(--card-border) shadow-sm px-4 py-3"
                  style={note.style}
                >
                  <p className="text-[12px] font-medium text-(--foreground-color) leading-snug">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>

            {activeConfig.notes.map((note, i) => (
              <div
                key={i}
                className={`hidden lg:block ${note.className}`}
                style={note.style}
              >
                <p className="text-[12px] font-medium text-(--foreground-color) leading-snug">
                  {note.text}
                </p>
              </div>
            ))}

            <div className="relative w-full mt-4 lg:absolute lg:top-6 lg:right-2 lg:w-64 lg:mt-0 bg-(--panel-color) border border-(--card-border) shadow-md">
              <div className="px-3 py-2 border-b border-(--border-color)">
                <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
                  AGENT REASONING
                </p>
              </div>
              <div className="p-3 space-y-2">
                <div className="bg-(--surface-color) px-2.5 py-1.5 text-[11px] text-(--foreground-color)">
                  {activeConfig.agentPrompt}
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-(--muted-color)">
                  <FiCircle className="w-2 h-2 mt-1 fill-[#EDA53B] text-[#EDA53B] shrink-0" />
                  <span>
                    {isIncidentDemo
                      ? incidentAgentStatus
                      : activeConfig.agentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 sm:px-8 py-4 border-t border-(--border-color)">
            <div className="flex flex-wrap gap-2">
              {activeConfig.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-mono tracking-wide border border-(--card-border) rounded-full px-3 py-1 text-(--muted-color)"
                >
                  {t}
                </span>
              ))}
            </div>
            <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
              {isIncidentDemo
                ? "LIVE · 1 INCIDENT RESOLVED TODAY"
                : activeConfig.footerRight}
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
            {isIncidentDemo ? (
              <>
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
              </>
            ) : (
              activeConfig.staticLogLines.map((l, i) => (
                <div key={i} className={`flex gap-2 ${l.c}`}>
                  <span className="w-3 shrink-0">{l.t}</span>
                  <span>{l.text}</span>
                </div>
              ))
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
                disabled={!isIncidentDemo}
                className="text-[10px] font-mono tracking-widest bg-[#C9736B] text-white px-3 py-1.5 hover:bg-[#b8625a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            <span className="truncate">{displayPrompt}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={breakIt}
              disabled={!isIncidentDemo}
              className="text-[10px] font-mono tracking-widest border border-[#C9736B] text-[#C9736B] px-3 py-1.5 hover:bg-[#C9736B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              BREAK IT
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!isIncidentDemo || status === "resolved"}
              className="text-[10px] font-mono tracking-widest border border-stone-600 text-stone-300 px-3 py-1.5 hover:border-[#EDA53B] hover:text-[#EDA53B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              NEXT
            </button>
            <button
              type="button"
              onClick={approve}
              disabled={
                !isIncidentDemo || status === "resolved" || status === "idle"
              }
              className="text-[10px] font-mono tracking-widest border border-stone-600 text-stone-300 px-3 py-1.5 hover:border-[#EDA53B] hover:text-[#EDA53B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              APPROVE
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={!isIncidentDemo}
              className="text-[10px] font-mono tracking-widest border border-stone-600 text-stone-300 px-3 py-1.5 hover:border-[#EDA53B] hover:text-[#EDA53B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              CLEAR
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-(--surface-color) border border-t-0 border-(--border-color)">
        <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
          {activeConfig.footerFig}
        </span>
        <span className="text-[10px] font-mono tracking-widest text-(--muted-color)">
          {isIncidentDemo ? "BUILT ON TRUEFORGE" : activeConfig.footerRight}
        </span>
      </div>
    </div>
  );
};

export default Section2;
