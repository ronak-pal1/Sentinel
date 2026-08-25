import { FiExternalLink } from "react-icons/fi";
import type { Incident } from "../../lib/types";

type Props = {
  incident: Incident;
};

function parseDiff(diff: string) {
  return diff.split("\n").map((line, i) => {
    let kind: "add" | "remove" | "meta" | "context" = "context";
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
      kind = "meta";
    } else if (line.startsWith("+")) {
      kind = "add";
    } else if (line.startsWith("-")) {
      kind = "remove";
    }
    return { line, kind, index: i + 1 };
  });
}

export function DiffViewer({ incident }: Props) {
  const lines = incident.diff ? parseDiff(incident.diff) : [];
  const comments = incident.qodoComments ?? [];
  const file =
    comments[0]?.file ??
    lines.find((l) => l.line.startsWith("+++"))?.line.replace("+++ b/", "") ??
    "checkout-svc/config.yaml";

  // Map comment line numbers to nearby added lines for display
  const commentByApproxLine = new Map(
    comments.map((c) => [c.line, c]),
  );

  let contentLine = 0;

  return (
    <div className="border border-(--border-color) bg-(--panel-color)">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-(--border-color) bg-(--surface-color)">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            DIFF · PR #{incident.prNumber ?? "—"}
          </p>
          <p className="text-[12px] font-mono text-(--foreground-color) mt-0.5">{file}</p>
        </div>
        {incident.prUrl && (
          <a
            href={incident.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wide text-[#B8791F] hover:text-(--foreground-color) border border-(--border-color) px-3 py-1.5 bg-(--panel-color)"
          >
            Open on GitHub <FiExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="font-mono text-[12px] overflow-x-auto">
        {lines.length === 0 && (
          <p className="px-4 py-6 text-(--muted-color)">No diff available yet.</p>
        )}
        {lines.map((row) => {
          if (row.kind === "add" || row.kind === "remove" || row.kind === "context") {
            if (!row.line.startsWith("@@") && !row.line.startsWith("---") && !row.line.startsWith("+++")) {
              contentLine += 1;
            }
          }
          const lineNum = contentLine;
          const comment = commentByApproxLine.get(lineNum);

          return (
            <div key={row.index}>
              <div
                className={[
                  "flex",
                  row.kind === "add"
                    ? "bg-[#D6E2DC]/70"
                    : row.kind === "remove"
                      ? "bg-[#F0D8D5]/80"
                      : row.kind === "meta"
                        ? "bg-(--surface-color) text-(--muted-color)"
                        : "",
                ].join(" ")}
              >
                <span className="w-8 shrink-0 text-right pr-2 text-(--muted-color) select-none py-0.5">
                  {row.kind !== "meta" ? lineNum : ""}
                </span>
                <span
                  className={[
                    "w-4 shrink-0 select-none py-0.5",
                    row.kind === "add"
                      ? "text-[#3D6B4F]"
                      : row.kind === "remove"
                        ? "text-[#8B3F38]"
                        : "text-(--muted-color)",
                  ].join(" ")}
                >
                  {row.kind === "add" ? "+" : row.kind === "remove" ? "-" : " "}
                </span>
                <pre className="flex-1 py-0.5 pr-4 whitespace-pre overflow-x-auto text-(--foreground-color)">
                  {row.kind === "add" || row.kind === "remove"
                    ? row.line.slice(1)
                    : row.line}
                </pre>
              </div>
              {comment && (
                <div className="mx-8 my-2 border border-[#EDA53B]/50 bg-(--accent-soft) px-3 py-2">
                  <p className="text-[10px] font-mono tracking-widest text-[#B8791F] mb-1">
                    QODO REVIEW
                  </p>
                  <p className="text-[12px] text-(--foreground-color) leading-snug">
                    {comment.comment}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {comments.length === 0 && incident.phase === "pr_opened" && (
        <div className="px-4 py-3 border-t border-(--border-color) text-[11px] font-mono text-(--muted-color) tracking-wide">
          Qodo review pending…
        </div>
      )}
    </div>
  );
}
