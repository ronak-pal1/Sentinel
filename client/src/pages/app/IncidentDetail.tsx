import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApprovalGate,
  RejectFollowUp,
} from "../../components/dashboard/ApprovalGate";
import { DiffViewer } from "../../components/dashboard/DiffViewer";
import { EventLog } from "../../components/dashboard/EventLog";
import { InvestigationGraph } from "../../components/dashboard/InvestigationGraph";
import { MetricsSparkline } from "../../components/dashboard/MetricsSparkline";
import { PhaseStepper } from "../../components/dashboard/PhaseStepper";
import { StatusPill } from "../../components/dashboard/StatusPill";
import { useIncidents } from "../../lib/IncidentStore";
import type { IncidentPhase } from "../../lib/types";

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    getIncident,
    getLogs,
    getMetrics,
    approve,
    reject,
    retry,
    escalate,
    close,
  } = useIncidents();
  const [scrollPhase, setScrollPhase] = useState<IncidentPhase | null>(null);

  const incident = id ? getIncident(id) : undefined;
  const logs = id ? getLogs(id) : [];
  const metrics = id ? getMetrics(id) : [];

  if (!incident) {
    return (
      <div className="px-8 py-20 text-center font-sans">
        <h1 className="text-2xl font-semibold mb-2">Incident not found</h1>
        <p className="text-(--muted-color) mb-6">
          No incident matches this ID in the current session.
        </p>
        <Link
          to="/app"
          className="text-sm font-medium text-[#B8791F] hover:text-(--foreground-color)"
        >
          ← Back to incidents
        </Link>
      </div>
    );
  }

  const showGate = incident.phase === "awaiting_approval";
  const showRejectFollowUp = incident.phase === "rejected";
  const showDiff =
    incident.diff &&
    [
      "pr_opened",
      "awaiting_approval",
      "resolved",
      "rejected",
    ].includes(incident.phase);
  const isResolved = incident.phase === "resolved";

  return (
    <div className="font-sans text-(--foreground-color) pb-16">
      {/* Incident header */}
      <div className="px-4 sm:px-6 md:px-8 py-6 border-b border-(--border-color) bg-(--panel-color)">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <StatusPill phase={incident.phase} />
              <span className="text-[11px] font-mono text-(--muted-color) tracking-wide">
                {incident.id}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {incident.service}
            </h1>
            <p className="mt-1.5 text-sm text-(--muted-color)">
              {incident.alertType} · started{" "}
              {new Date(incident.startedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
                LIVE LATENCY
              </p>
              <p className="text-sm font-mono text-(--foreground-color) mt-0.5">
                {Math.round(metrics[metrics.length - 1]?.latencyMs ?? 0)}ms
              </p>
            </div>
            <MetricsSparkline points={metrics} width={180} height={40} />
          </div>
        </div>

        <div className="mt-6">
          <PhaseStepper phase={incident.phase} />
        </div>

        {isResolved && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to={`/app/incidents/${incident.id}/postmortem`}
              className="bg-[#EDA53B] hover:bg-[#d9942f] text-(--foreground-color) font-semibold text-sm px-5 py-2.5 transition-colors"
            >
              View Postmortem
            </Link>
            {incident.prUrl && (
              <a
                href={incident.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-(--card-border) text-(--foreground-color) text-sm px-5 py-2.5 hover:border-stone-600 transition-colors font-mono text-[12px]"
              >
                PR #{incident.prNumber} ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* Two column */}
      <div className="flex flex-col xl:flex-row border-b border-(--border-color)">
        {/* Left: graph + diff */}
        <div className="xl:w-[65%] border-b xl:border-b-0 xl:border-r border-(--border-color) min-w-0">
          <InvestigationGraph
            phase={incident.phase}
            dimmed={showGate}
            onNodeClick={(p) => setScrollPhase(p)}
          />
          {showDiff && (
            <div className="px-4 md:px-6 pb-6">
              <DiffViewer incident={incident} />
            </div>
          )}
        </div>

        {/* Right: log + gate */}
        <div className="xl:w-[35%] flex flex-col min-h-105 relative bg-[#0D0D0D]">
          <div className="flex-1 min-h-80">
            <EventLog
              events={logs}
              highlightPhase={scrollPhase}
              scrollToPhase={scrollPhase}
            />
          </div>
          {showGate && (
            <ApprovalGate
              incident={incident}
              onApprove={() => approve(incident.id)}
              onReject={() => reject(incident.id)}
            />
          )}
          {showRejectFollowUp && (
            <div className="p-3 bg-(--panel-color)">
              <RejectFollowUp
                onRetry={() => retry(incident.id)}
                onEscalate={() => escalate(incident.id)}
                onClose={() => close(incident.id)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
