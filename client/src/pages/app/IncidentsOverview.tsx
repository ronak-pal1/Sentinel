import { Link, useNavigate } from "react-router-dom";
import { FiAlertCircle } from "react-icons/fi";
import { MetricsSparkline } from "../../components/dashboard/MetricsSparkline";
import { PhaseStepper } from "../../components/dashboard/PhaseStepper";
import { StatusPill } from "../../components/dashboard/StatusPill";
import { useIncidents } from "../../lib/IncidentStore";
import { PHASE_LABELS } from "../../lib/types";

function formatDuration(start: string, end?: string) {
  const ms =
    (end ? new Date(end).getTime() : Date.now()) -
    new Date(start).getTime();
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function IncidentsOverview() {
  const { state, breakIt, systemHealth } = useIncidents();
  const navigate = useNavigate();
  const active = state.activeIncidentId
    ? state.incidents.find((i) => i.id === state.activeIncidentId)
    : undefined;
  const pastList = state.incidents.filter(
    (i) => i.id !== state.activeIncidentId,
  );
  const hasAny = state.incidents.length > 0;

  const onBreakIt = () => {
    const id = breakIt();
    if (id) navigate(`/app/incidents/${id}`);
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-8 pb-20 font-sans text-(--foreground-color)">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
            SENTINEL / INCIDENTS
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-2 text-(--muted-color) text-sm max-w-lg">
            Trigger a synthetic failure and watch the agent investigate,
            sandbox-verify, open a PR, and wait for your approval.
          </p>
        </div>
        <button
          type="button"
          onClick={onBreakIt}
          disabled={!!state.activeIncidentId}
          className="shrink-0 w-full sm:w-auto bg-[#C9736B] hover:bg-[#b8625a] disabled:bg-(--border-color) disabled:text-(--muted-color) text-white font-semibold px-6 py-3.5 text-sm transition-colors disabled:cursor-not-allowed"
        >
          Break It
        </button>
      </div>

      <div className="border border-(--border-color) bg-(--surface-color) px-5 py-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
              LIVE · {systemHealth.service.toUpperCase()}
            </p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <StatusPill status={systemHealth.status} />
              <span className="text-[12px] font-mono text-(--muted-color)">
                p99 {Math.round(systemHealth.latencyMs)}ms · err{" "}
                {systemHealth.errorRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <MetricsSparkline
            points={state.liveMetrics}
            width={220}
            height={44}
          />
        </div>
      </div>

      {active && (
        <Link
          to={`/app/incidents/${active.id}`}
          className="block border-2 border-[#EDA53B] bg-(--panel-color) mb-8 hover:brightness-95 transition-all"
        >
          <div className="px-5 py-3 bg-[#EDA53B] flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] font-mono tracking-widest font-semibold text-(--foreground-color)">
              ACTIVE INCIDENT · {active.id}
            </span>
            <StatusPill phase={active.phase} />
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold">{active.service}</h2>
                <p className="text-sm text-(--muted-color) mt-1">
                  {active.alertType} · started{" "}
                  {new Date(active.startedAt).toLocaleTimeString()}
                </p>
              </div>
              <span className="text-[11px] font-mono tracking-wide text-[#B8791F]">
                {PHASE_LABELS[active.phase]} →
              </span>
            </div>
            <PhaseStepper phase={active.phase} compact />
          </div>
        </Link>
      )}

      {!hasAny && (
        <div className="border border-dashed border-(--card-border) bg-(--panel-color) px-8 py-16 text-center mb-8">
          <FiAlertCircle className="w-8 h-8 text-(--muted-color) mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No incidents yet</h2>
          <p className="text-(--muted-color) text-sm max-w-md mx-auto mb-6">
            Click <span className="font-medium text-(--foreground-color)">Break It</span> to
            inject a synthetic failure into checkout-svc. The agent will
            investigate, verify a fix in sandbox, open a PR, and wait for you.
          </p>
          <button
            type="button"
            onClick={onBreakIt}
            className="bg-[#C9736B] hover:bg-[#b8625a] text-white font-semibold px-6 py-3 text-sm transition-colors"
          >
            Break It
          </button>
        </div>
      )}

      {pastList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color)">
              PAST INCIDENTS
            </h2>
            <span className="text-[11px] font-mono text-(--muted-color)">
              {pastList.length} TOTAL
            </span>
          </div>

          <div className="border border-(--border-color) overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-(--surface-color) border-b border-(--border-color) text-[10px] font-mono tracking-widest text-(--muted-color)">
              <span className="col-span-2">ID</span>
              <span className="col-span-2">SERVICE</span>
              <span className="col-span-3">ROOT CAUSE</span>
              <span className="col-span-1">DUR</span>
              <span className="col-span-2">RESOLVED BY</span>
              <span className="col-span-2">WHEN</span>
            </div>
            {pastList.map((inc) => (
              <Link
                key={inc.id}
                to={`/app/incidents/${inc.id}`}
                className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2 px-4 py-3.5 border-b border-(--border-color) last:border-0 hover:bg-(--surface-color)/60 transition-colors"
              >
                <span className="md:col-span-2 font-mono text-[12px] text-(--foreground-color) truncate">
                  {inc.id.replace("inc-", "")}
                </span>
                <span className="md:col-span-2 text-sm font-medium">
                  {inc.service}
                </span>
                <span className="md:col-span-3 text-sm text-(--muted-color) truncate">
                  {inc.rootCause ?? PHASE_LABELS[inc.phase]}
                </span>
                <span className="md:col-span-1 font-mono text-[12px] text-(--muted-color)">
                  {formatDuration(inc.startedAt, inc.resolvedAt)}
                </span>
                <span className="md:col-span-2 text-sm text-(--muted-color) capitalize">
                  {inc.resolvedBy ?? "—"}
                </span>
                <span className="md:col-span-2 font-mono text-[11px] text-(--muted-color)">
                  {new Date(inc.startedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
