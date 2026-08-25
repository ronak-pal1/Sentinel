import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import type { IncidentPhase, LogEvent } from "../../lib/types";

const typeStyle: Record<
  LogEvent["type"],
  { icon: string; color: string }
> = {
  info: { icon: "·", color: "text-stone-500" },
  success: { icon: "✓", color: "text-[#8FBF9F]" },
  action: { icon: "›", color: "text-[#EDA53B]" },
  failure: { icon: "✗", color: "text-[#C9736B]" },
};

type Props = {
  events: LogEvent[];
  highlightPhase?: IncidentPhase | null;
  scrollToPhase?: IncidentPhase | null;
};

export function EventLog({ events, highlightPhase, scrollToPhase }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [events.length]);

  useEffect(() => {
    if (!scrollToPhase || !containerRef.current) return;
    const target = containerRef.current.querySelector(
      `[data-phase="${scrollToPhase}"]`,
    );
    if (target) {
      stickToBottom.current = false;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [scrollToPhase]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = dist < 48;
  };

  return (
    <div className="bg-[#0D0D0D] flex flex-col h-full min-h-80">
      <div className="flex items-center gap-4 px-5 pt-4 pb-2 border-b border-stone-800">
        <span className="text-[10px] font-mono tracking-widest text-[#EDA53B] border-b-2 border-[#EDA53B] pb-1">
          EVENT LOG
        </span>
        <span className="text-[10px] font-mono tracking-widest text-stone-600 ml-auto">
          {events.length} EVENTS
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5 font-mono text-[12px]"
      >
        {events.length === 0 && (
          <p className="text-stone-600">Waiting for events…</p>
        )}
        {events.map((e) => {
          const s = typeStyle[e.type];
          const isHighlight =
            highlightPhase && e.phase === highlightPhase;
          const open = expanded[e.id];
          return (
            <div
              key={e.id}
              data-phase={e.phase}
              className={[
                "group",
                isHighlight ? "bg-[#EDA53B]/10 -mx-2 px-2 py-0.5" : "",
              ].join(" ")}
            >
              <div className={`flex gap-2 ${s.color}`}>
                <span className="w-3 shrink-0">{s.icon}</span>
                <span className="text-stone-600 shrink-0 w-14">
                  {new Date(e.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    {e.tool && (
                      <span className="text-stone-600 shrink-0">
                        [{e.tool}]
                      </span>
                    )}
                    <span className="wrap-break-word">{e.message}</span>
                    {e.detail && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [e.id]: !prev[e.id],
                          }))
                        }
                        className="shrink-0 text-stone-600 hover:text-[#EDA53B] mt-0.5"
                        aria-label={open ? "Collapse" : "Expand"}
                      >
                        {open ? (
                          <FiChevronDown className="w-3 h-3" />
                        ) : (
                          <FiChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  {e.detail && open && (
                    <pre className="mt-1.5 text-[11px] text-stone-500 whitespace-pre-wrap border-l border-stone-700 pl-3">
                      {e.detail}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
