import type { Incident } from "../../lib/types";

type Props = {
  incident: Incident;
  onApprove: () => void;
  onReject: () => void;
};

export function ApprovalGate({ incident, onApprove, onReject }: Props) {
  const sandbox = incident.sandboxResult;
  const hasPr = Boolean(incident.prUrl);

  return (
    <div
      className="sticky bottom-0 z-20 border-t-2 border-[#EDA53B] bg-(--panel-color) shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
      style={{ animation: "sentinel-gate-in 0.45s ease-out" }}
      role="alertdialog"
      aria-labelledby="approval-gate-title"
      aria-describedby="approval-gate-desc"
    >
      <div className="px-4 py-3 border-b border-[#EDA53B]/40 flex items-center gap-2">
        <span className="w-2 h-2 bg-[#EDA53B] animate-pulse inline-block" />
        <h3
          id="approval-gate-title"
          className="text-[11px] font-mono tracking-widest font-semibold text-(--foreground-color)"
        >
          APPROVAL REQUIRED
        </h3>
        <span className="ml-auto text-[10px] font-mono tracking-wide text-[#B8791F]">
          HUMAN GATE · NEVER SKIPPED
        </span>
      </div>

      <div className="px-4 py-4 space-y-3" id="approval-gate-desc">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-1">
            WHAT THE AGENT WANTS TO DO
          </p>
          <p className="text-sm font-medium text-(--foreground-color) leading-snug">
            {incident.proposedAction ??
              (hasPr
                ? `Merge PR #${incident.prNumber} and mark incident resolved`
                : `Open a fix PR, merge it, and redeploy ${incident.service}`)}
          </p>
          {hasPr && incident.prUrl ? (
            <a
              href={incident.prUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 text-[12px] font-mono text-[#B8791F] hover:underline"
            >
              View PR #{incident.prNumber} →
            </a>
          ) : null}
        </div>

        <div>
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-1">
            WHY
          </p>
          <p className="text-[13px] text-(--foreground-color) leading-snug">
            {incident.rootCause ?? "Root cause diagnosed during investigation."}
            {incident.confidence != null && (
              <span className="text-(--muted-color) font-mono text-[11px] ml-2">
                ({Math.round(incident.confidence * 100)}% confidence)
              </span>
            )}
          </p>
        </div>

        <div className="bg-(--success-bg) border border-[#8FBF9F]/50 px-3 py-2">
          <p className="text-[10px] font-mono tracking-widest text-(--success-fg) mb-1">
            EVIDENCE — SANDBOX VERIFIED
          </p>
          <p className="text-[12px] text-(--foreground-color) font-mono">
            {sandbox
              ? `Sandbox confirmed: latency ${sandbox.latencyMs}ms, ${sandbox.errorRate}% errors in ${sandbox.requestsReplayed} replayed requests`
              : "Sandbox verification complete."}
          </p>
        </div>

        <p className="text-[12px] text-[#C9736B] font-medium leading-snug border border-[#C9736B]/40 bg-[#C9736B]/10 px-3 py-2">
          {hasPr
            ? "Approving will merge the open GitHub PR and mark this incident resolved. Ensure your token has write access to the repo."
            : "Approving will open a GitHub PR (if a patch is ready), attempt to merge it, and resolve the incident."}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 bg-[#EDA53B] hover:bg-[#d9942f] text-[#1a1a1a] font-semibold text-sm px-4 py-3 transition-colors"
          >
            {hasPr ? "Approve & merge PR" : "Approve & open PR"}
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex-1 bg-transparent border border-(--card-border) hover:border-(--foreground-color) text-(--foreground-color) font-medium text-sm px-4 py-3 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

type RejectFollowUpProps = {
  onRetry: () => void;
  onEscalate: () => void;
  onClose: () => void;
};

export function RejectFollowUp({
  onRetry,
  onEscalate,
  onClose,
}: RejectFollowUpProps) {
  return (
    <div className="border border-[#C9736B]/50 bg-[#F0D8D5]/40 px-4 py-4 space-y-3">
      <p className="text-[11px] font-mono tracking-widest text-[#8B3F38] font-semibold">
        FIX REJECTED — WHAT NEXT?
      </p>
      <p className="text-sm text-(--foreground-color)">
        The incident stays open. Choose how to continue.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="bg-[#EDA53B] hover:bg-[#d9942f] text-[#1a1a1a] font-medium text-sm px-4 py-2.5 transition-colors"
        >
          Retry with different fix
        </button>
        <button
          type="button"
          onClick={onEscalate}
          className="border border-(--card-border) hover:border-stone-600 text-(--foreground-color) font-medium text-sm px-4 py-2.5 transition-colors"
        >
          Escalate to human
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-(--muted-color) hover:text-(--foreground-color) text-sm px-4 py-2 transition-colors font-mono text-[11px] tracking-wide"
        >
          Close incident
        </button>
      </div>
    </div>
  );
}
