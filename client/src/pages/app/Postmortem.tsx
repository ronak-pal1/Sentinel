import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiCheck, FiCopy, FiExternalLink } from "react-icons/fi";
import { useIncidents } from "../../lib/IncidentStore";

function buildMarkdown(opts: {
  id: string;
  service: string;
  rootCause?: string;
  startedAt: string;
  resolvedAt?: string;
  approvedAt?: string;
  prUrl?: string;
  sandbox?: { latencyMs: number; errorRate: number; requestsReplayed: number };
  confidence?: number;
}) {
  const ttrMs =
    opts.resolvedAt && opts.startedAt
      ? new Date(opts.resolvedAt).getTime() - new Date(opts.startedAt).getTime()
      : null;
  const ttr =
    ttrMs != null
      ? `${Math.max(1, Math.round(ttrMs / 1000))}s`
      : "n/a";

  return `# Postmortem — ${opts.id}

**Service:** ${opts.service}
**Time to resolution:** ${ttr}

## Timeline

- Alert fired at ${new Date(opts.startedAt).toLocaleString()}.
- Agent found root cause${opts.confidence ? ` (${Math.round(opts.confidence * 100)}% confidence)` : ""}${opts.rootCause ? `: ${opts.rootCause}` : "."}.
${opts.sandbox ? `- Fix verified in sandbox: latency ${opts.sandbox.latencyMs}ms, ${opts.sandbox.errorRate}% errors across ${opts.sandbox.requestsReplayed} replayed requests.` : "- Fix verified in sandbox."}
${opts.approvedAt ? `- Human approved at ${new Date(opts.approvedAt).toLocaleString()}.` : ""}
${opts.resolvedAt ? `- Deployed / resolved at ${new Date(opts.resolvedAt).toLocaleString()}.` : ""}

## Links

${opts.prUrl ? `- PR: ${opts.prUrl}` : "- PR: n/a"}
- Incident: /app/incidents/${opts.id}
`;
}

export default function Postmortem() {
  const { id } = useParams<{ id: string }>();
  const { getIncident, getLogs } = useIncidents();
  const [copied, setCopied] = useState(false);

  const incident = id ? getIncident(id) : undefined;
  const logs = id ? getLogs(id) : [];

  if (!incident) {
    return (
      <div className="px-8 py-20 text-center font-sans">
        <h1 className="text-2xl font-semibold mb-2">Postmortem not found</h1>
        <Link to="/app" className="text-[#B8791F] text-sm">
          ← Back to incidents
        </Link>
      </div>
    );
  }

  const ttrMs = incident.resolvedAt
    ? new Date(incident.resolvedAt).getTime() -
      new Date(incident.startedAt).getTime()
    : null;
  const ttrLabel =
    ttrMs != null
      ? ttrMs < 60_000
        ? `${Math.round(ttrMs / 1000)}s`
        : `${Math.round(ttrMs / 60_000)}m`
      : "—";

  const timeline = [
    {
      t: incident.startedAt,
      text: `Alert fired — ${incident.alertType} on ${incident.service}.`,
    },
    incident.rootCause
      ? {
          t: logs.find((l) => l.phase === "root_cause_found")?.timestamp ??
            incident.startedAt,
          text: `Agent found root cause: ${incident.rootCause}.`,
        }
      : null,
    incident.sandboxResult
      ? {
          t:
            logs.find((l) => l.phase === "sandbox_verifying" && l.type === "success")
              ?.timestamp ?? incident.startedAt,
          text: `Fix verified in sandbox — latency ${incident.sandboxResult.latencyMs}ms, ${incident.sandboxResult.errorRate} errors in ${incident.sandboxResult.requestsReplayed} replayed requests.`,
        }
      : null,
    incident.approvedAt
      ? {
          t: incident.approvedAt,
          text: `Human approved at ${new Date(incident.approvedAt).toLocaleTimeString()}.`,
        }
      : null,
    incident.resolvedAt
      ? {
          t: incident.resolvedAt,
          text: `Deployed / resolved at ${new Date(incident.resolvedAt).toLocaleTimeString()}.`,
        }
      : null,
  ].filter(Boolean) as { t: string; text: string }[];

  const md = buildMarkdown({
    id: incident.id,
    service: incident.service,
    rootCause: incident.rootCause,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    approvedAt: incident.approvedAt,
    prUrl: incident.prUrl,
    sandbox: incident.sandboxResult,
    confidence: incident.confidence,
  });

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-8 pb-20 font-sans text-(--foreground-color) max-w-3xl">
      <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
        POSTMORTEM
      </p>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        {incident.service}
      </h1>
      <p className="text-(--muted-color) text-sm mb-8">{incident.id}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <div className="border border-(--border-color) bg-(--surface-color) px-4 py-3">
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            TIME TO RESOLUTION
          </p>
          <p className="text-2xl font-semibold mt-1 font-mono text-[#3D6B4F]">
            {ttrLabel}
          </p>
        </div>
        <div className="border border-(--border-color) bg-(--surface-color) px-4 py-3">
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            RESOLVED BY
          </p>
          <p className="text-2xl font-semibold mt-1 capitalize">
            {incident.resolvedBy ?? "—"}
          </p>
        </div>
        <div className="border border-(--border-color) bg-(--surface-color) px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            CONFIDENCE
          </p>
          <p className="text-2xl font-semibold mt-1 font-mono">
            {incident.confidence != null
              ? `${Math.round(incident.confidence * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
        TIMELINE
      </h2>
      <ul className="space-y-4 mb-10 border-l border-(--border-color) pl-5">
        {timeline.map((item, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-5.75 top-1.5 w-2.5 h-2.5 bg-[#EDA53B] border border-[#c98a2c]" />
            <p className="text-[11px] font-mono text-(--muted-color) mb-0.5">
              {new Date(item.t).toLocaleTimeString()}
            </p>
            <p className="text-sm text-(--foreground-color) leading-relaxed">{item.text}</p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3 mb-10">
        {incident.prUrl && (
          <a
            href={incident.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-(--card-border) px-4 py-2.5 text-sm hover:border-stone-700 transition-colors"
          >
            Pull request <FiExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <Link
          to={`/app/incidents/${incident.id}`}
          className="inline-flex items-center gap-1.5 border border-(--card-border) px-4 py-2.5 text-sm hover:border-stone-700 transition-colors"
        >
          Raw event log
        </Link>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 bg-[#EDA53B] hover:bg-[#d9942f] text-(--foreground-color) font-semibold px-4 py-2.5 text-sm transition-colors"
        >
          {copied ? (
            <>
              <FiCheck className="w-3.5 h-3.5" /> Copied
            </>
          ) : (
            <>
              <FiCopy className="w-3.5 h-3.5" /> Copy as markdown
            </>
          )}
        </button>
      </div>
    </div>
  );
}
