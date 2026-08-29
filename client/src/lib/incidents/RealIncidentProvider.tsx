import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  approveIncident,
  closeIncident,
  escalateIncident,
  getIncidentMetrics,
  getLiveMetrics,
  listIncidentEvents,
  listIncidents,
  rejectIncident,
  retryIncident,
} from "../api";
import { subscribeIncidentEvents } from "../sse";
import type { Incident, LogEvent } from "../types";
import type { IncidentContextValue, IncidentState } from "./types";
import { IncidentContext } from "./context";

const TERMINAL = new Set(["resolved", "rejected", "escalated"]);
const ACTIVE = new Set([
  "alert",
  "investigating",
  "root_cause_found",
  "sandbox_verifying",
  "pr_opened",
  "awaiting_approval",
]);

const emptyState: IncidentState = {
  incidents: [],
  logsByIncident: {},
  metricsByIncident: {},
  liveMetrics: [],
  activeIncidentId: null,
};

export function RealIncidentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IncidentState>(emptyState);
  const [streamIncidentId, setStreamIncidentId] = useState<string | null>(
    null,
  );

  const refreshIncidents = useCallback(async () => {
    try {
      const incidents = await listIncidents();
      const active = incidents.find((i) => ACTIVE.has(i.phase));
      setState((prev) => ({
        ...prev,
        incidents,
        activeIncidentId: active?.id ?? null,
      }));
      if (active && active.id !== streamIncidentId) {
        setStreamIncidentId(active.id);
      } else if (!active) {
        setStreamIncidentId(null);
      }
    } catch {
      // keep previous state on poll failure
    }
  }, [streamIncidentId]);

  useEffect(() => {
    void refreshIncidents();
    const id = setInterval(() => void refreshIncidents(), 5000);
    return () => clearInterval(id);
  }, [refreshIncidents]);

  useEffect(() => {
    void getLiveMetrics()
      .then((points) => {
        setState((prev) => ({ ...prev, liveMetrics: points }));
      })
      .catch(() => {});
    const id = setInterval(() => {
      void getLiveMetrics()
        .then((points) => {
          setState((prev) => ({ ...prev, liveMetrics: points }));
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!streamIncidentId) return;

    void listIncidentEvents(streamIncidentId).then((logs) => {
      setState((prev) => ({
        ...prev,
        logsByIncident: {
          ...prev.logsByIncident,
          [streamIncidentId]: logs,
        },
      }));
    });

    void getIncidentMetrics(streamIncidentId).then((metrics) => {
      setState((prev) => ({
        ...prev,
        metricsByIncident: {
          ...prev.metricsByIncident,
          [streamIncidentId]: metrics,
        },
      }));
    });

    const unsubscribe = subscribeIncidentEvents(streamIncidentId, {
      onLog: (data) => {
        const log = data as LogEvent;
        setState((prev) => {
          const prevLogs = prev.logsByIncident[streamIncidentId] ?? [];
          if (prevLogs.some((l) => l.id === log.id)) return prev;
          return {
            ...prev,
            logsByIncident: {
              ...prev.logsByIncident,
              [streamIncidentId]: [...prevLogs, log],
            },
          };
        });
      },
      onPhase: ({ phase }) => {
        setState((prev) => ({
          ...prev,
          incidents: prev.incidents.map((inc) =>
            inc.id === streamIncidentId ? { ...inc, phase: phase as Incident["phase"] } : inc,
          ),
        }));
        void refreshIncidents();
      },
    });

    return unsubscribe;
  }, [streamIncidentId, refreshIncidents]);

  const breakIt = useCallback(() => null, []);

  const approve = useCallback(
    (incidentId: string) => {
      void approveIncident(incidentId).then((inc) => {
        setState((prev) => ({
          ...prev,
          incidents: prev.incidents.map((i) =>
            i.id === incidentId ? inc : i,
          ),
          activeIncidentId: null,
        }));
        setStreamIncidentId(null);
      });
    },
    [],
  );

  const reject = useCallback((incidentId: string) => {
    void rejectIncident(incidentId).then((inc) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((i) =>
          i.id === incidentId ? inc : i,
        ),
      }));
    });
  }, []);

  const retry = useCallback((incidentId: string) => {
    void retryIncident(incidentId).then((inc) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((i) =>
          i.id === incidentId ? inc : i,
        ),
        activeIncidentId: incidentId,
      }));
      setStreamIncidentId(incidentId);
    });
  }, []);

  const escalate = useCallback((incidentId: string) => {
    void escalateIncident(incidentId).then((inc) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((i) =>
          i.id === incidentId ? inc : i,
        ),
        activeIncidentId: null,
      }));
      setStreamIncidentId(null);
    });
  }, []);

  const close = useCallback((incidentId: string) => {
    void closeIncident(incidentId).then((inc) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((i) =>
          i.id === incidentId ? inc : i,
        ),
        activeIncidentId: null,
      }));
      setStreamIncidentId(null);
    });
  }, []);

  const getIncident = useCallback(
    (id: string) => state.incidents.find((i) => i.id === id),
    [state.incidents],
  );

  const getLogs = useCallback(
    (id: string) => state.logsByIncident[id] ?? [],
    [state.logsByIncident],
  );

  const getMetrics = useCallback(
    (id: string) => state.metricsByIncident[id] ?? state.liveMetrics,
    [state.metricsByIncident, state.liveMetrics],
  );

  const systemHealth = useMemo((): IncidentContextValue["systemHealth"] => {
    const active = state.activeIncidentId
      ? state.incidents.find((i) => i.id === state.activeIncidentId)
      : undefined;
    const last = state.liveMetrics[state.liveMetrics.length - 1];
    let status: IncidentContextValue["systemHealth"]["status"] = "healthy";
    if (active) {
      if (active.phase === "awaiting_approval") status = "awaiting_approval";
      else if (active.phase === "resolved") status = "resolved";
      else if (ACTIVE.has(active.phase)) status = "investigating";
      else if (TERMINAL.has(active.phase)) status = "degraded";
    }
    return {
      service: active?.service ?? "production",
      status,
      latencyMs: last?.latencyMs ?? 380,
      errorRate: last?.errorRate ?? 0,
    };
  }, [state.activeIncidentId, state.incidents, state.liveMetrics]);

  const value = useMemo(
    (): IncidentContextValue => ({
      state,
      breakIt,
      approve,
      reject,
      retry,
      escalate,
      close,
      getIncident,
      getLogs,
      getMetrics,
      systemHealth,
      isRealMode: true,
    }),
    [
      state,
      breakIt,
      approve,
      reject,
      retry,
      escalate,
      close,
      getIncident,
      getLogs,
      getMetrics,
      systemHealth,
    ],
  );

  return (
    <IncidentContext.Provider value={value}>
      {children}
    </IncidentContext.Provider>
  );
}
