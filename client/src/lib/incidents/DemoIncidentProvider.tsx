import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  generateHealthyMetrics,
  seedIncidents,
  seedLogs,
  seedMetrics,
} from "../seed";
import {
  createBreakItIncident,
  runIncidentSimulation,
  type SimAction,
} from "../simulator";
import type {
  Incident,
  IncidentPhase,
  LogEvent,
  MetricPoint,
} from "../types";
import type { IncidentContextValue, IncidentState } from "./types";
import { IncidentContext } from "./context";

type Action =
  | { type: "BREAK_IT"; incident: Incident; logs: LogEvent[]; metrics: MetricPoint[] }
  | { type: "APPEND_LOG"; log: LogEvent }
  | {
      type: "SET_PHASE";
      incidentId: string;
      phase: IncidentPhase;
      patch?: Partial<Incident>;
    }
  | { type: "APPEND_METRIC"; incidentId: string; point: MetricPoint }
  | { type: "SET_METRICS"; incidentId: string; points: MetricPoint[] }
  | { type: "APPEND_LIVE_METRIC"; point: MetricPoint }
  | { type: "SET_LIVE_METRICS"; points: MetricPoint[] }
  | {
      type: "APPROVE";
      incidentId: string;
      approvedAt: string;
    }
  | { type: "REJECT"; incidentId: string }
  | { type: "ESCALATE"; incidentId: string }
  | { type: "CLOSE"; incidentId: string }
  | { type: "CLEAR_ACTIVE" }
  | { type: "SET_ACTIVE"; incidentId: string };

function reducer(state: IncidentState, action: Action): IncidentState {
  switch (action.type) {
    case "BREAK_IT":
      return {
        ...state,
        incidents: [action.incident, ...state.incidents],
        logsByIncident: {
          ...state.logsByIncident,
          [action.incident.id]: action.logs,
        },
        metricsByIncident: {
          ...state.metricsByIncident,
          [action.incident.id]: action.metrics,
        },
        activeIncidentId: action.incident.id,
        liveMetrics: action.metrics,
      };
    case "APPEND_LOG": {
      const prev = state.logsByIncident[action.log.incidentId] ?? [];
      return {
        ...state,
        logsByIncident: {
          ...state.logsByIncident,
          [action.log.incidentId]: [...prev, action.log],
        },
      };
    }
    case "SET_PHASE":
      return {
        ...state,
        incidents: state.incidents.map((inc) =>
          inc.id === action.incidentId
            ? { ...inc, phase: action.phase, ...action.patch }
            : inc,
        ),
      };
    case "APPEND_METRIC": {
      const prev = state.metricsByIncident[action.incidentId] ?? [];
      const next = [...prev, action.point].slice(-60);
      return {
        ...state,
        metricsByIncident: {
          ...state.metricsByIncident,
          [action.incidentId]: next,
        },
        liveMetrics:
          state.activeIncidentId === action.incidentId
            ? [...state.liveMetrics, action.point].slice(-60)
            : state.liveMetrics,
      };
    }
    case "SET_METRICS":
      return {
        ...state,
        metricsByIncident: {
          ...state.metricsByIncident,
          [action.incidentId]: action.points,
        },
        liveMetrics:
          state.activeIncidentId === action.incidentId
            ? action.points
            : state.liveMetrics,
      };
    case "APPEND_LIVE_METRIC":
      return {
        ...state,
        liveMetrics: [...state.liveMetrics, action.point].slice(-60),
      };
    case "SET_LIVE_METRICS":
      return { ...state, liveMetrics: action.points };
    case "APPROVE": {
      const approvedLog: LogEvent = {
        id: `log-approve-${Date.now()}`,
        incidentId: action.incidentId,
        timestamp: action.approvedAt,
        type: "success",
        message: `✓ Approved by you at ${new Date(action.approvedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — merged and deployed`,
        phase: "resolved",
      };
      const prev = state.logsByIncident[action.incidentId] ?? [];
      return {
        ...state,
        activeIncidentId: null,
        incidents: state.incidents.map((inc) =>
          inc.id === action.incidentId
            ? {
                ...inc,
                phase: "resolved",
                approvedBy: "you",
                approvedAt: action.approvedAt,
                resolvedAt: action.approvedAt,
                resolvedBy: "human",
              }
            : inc,
        ),
        logsByIncident: {
          ...state.logsByIncident,
          [action.incidentId]: [...prev, approvedLog],
        },
      };
    }
    case "REJECT": {
      const rejectedLog: LogEvent = {
        id: `log-reject-${Date.now()}`,
        incidentId: action.incidentId,
        timestamp: new Date().toISOString(),
        type: "failure",
        message: "✗ Rejected by you — incident remains open",
        phase: "rejected",
      };
      const prev = state.logsByIncident[action.incidentId] ?? [];
      return {
        ...state,
        incidents: state.incidents.map((inc) =>
          inc.id === action.incidentId
            ? { ...inc, phase: "rejected" }
            : inc,
        ),
        logsByIncident: {
          ...state.logsByIncident,
          [action.incidentId]: [...prev, rejectedLog],
        },
      };
    }
    case "ESCALATE": {
      const escLog: LogEvent = {
        id: `log-esc-${Date.now()}`,
        incidentId: action.incidentId,
        timestamp: new Date().toISOString(),
        type: "action",
        message: "› Escalated — paged on-call human (no guessed fix)",
        phase: "escalated",
      };
      const prev = state.logsByIncident[action.incidentId] ?? [];
      return {
        ...state,
        activeIncidentId: null,
        incidents: state.incidents.map((inc) =>
          inc.id === action.incidentId
            ? {
                ...inc,
                phase: "escalated",
                resolvedAt: new Date().toISOString(),
                resolvedBy: "human",
              }
            : inc,
        ),
        logsByIncident: {
          ...state.logsByIncident,
          [action.incidentId]: [...prev, escLog],
        },
      };
    }
    case "CLOSE": {
      const closeLog: LogEvent = {
        id: `log-close-${Date.now()}`,
        incidentId: action.incidentId,
        timestamp: new Date().toISOString(),
        type: "info",
        message: "Incident closed without merge",
        phase: "rejected",
      };
      const prev = state.logsByIncident[action.incidentId] ?? [];
      return {
        ...state,
        activeIncidentId: null,
        incidents: state.incidents.map((inc) =>
          inc.id === action.incidentId
            ? {
                ...inc,
                phase: "rejected",
                resolvedAt: new Date().toISOString(),
              }
            : inc,
        ),
        logsByIncident: {
          ...state.logsByIncident,
          [action.incidentId]: [...prev, closeLog],
        },
      };
    }
    case "CLEAR_ACTIVE":
      return { ...state, activeIncidentId: null };
    case "SET_ACTIVE":
      return { ...state, activeIncidentId: action.incidentId };
    default:
      return state;
  }
}

const initialState: IncidentState = {
  incidents: seedIncidents,
  logsByIncident: seedLogs,
  metricsByIncident: seedMetrics,
  liveMetrics: generateHealthyMetrics(40),
  activeIncidentId: null,
};

export function DemoIncidentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cancelSim = useRef<(() => void) | null>(null);
  const recoveryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const emitSim = useCallback((action: SimAction) => {
    dispatch(action);
  }, []);

  useEffect(() => {
    if (state.activeIncidentId) return;
    const id = setInterval(() => {
      dispatch({
        type: "APPEND_LIVE_METRIC",
        point: {
          t: Date.now(),
          latencyMs: 360 + Math.round((Math.random() - 0.5) * 40),
          errorRate: Math.random() * 0.25,
        },
      });
    }, 2500);
    return () => clearInterval(id);
  }, [state.activeIncidentId]);

  useEffect(() => {
    return () => {
      cancelSim.current?.();
      recoveryTimers.current.forEach(clearTimeout);
    };
  }, []);

  const breakIt = useCallback(() => {
    if (state.activeIncidentId) return null;
    cancelSim.current?.();
    const { incident, initialLogs, initialMetrics } = createBreakItIncident();
    dispatch({
      type: "BREAK_IT",
      incident,
      logs: initialLogs,
      metrics: initialMetrics,
    });
    cancelSim.current = runIncidentSimulation(incident.id, emitSim);
    return incident.id;
  }, [state.activeIncidentId, emitSim]);

  const approve = useCallback((incidentId: string) => {
    cancelSim.current?.();
    cancelSim.current = null;
    const approvedAt = new Date().toISOString();
    dispatch({ type: "APPROVE", incidentId, approvedAt });
    recoveryTimers.current.forEach(clearTimeout);
    recoveryTimers.current = [];
    for (let i = 0; i < 10; i++) {
      recoveryTimers.current.push(
        setTimeout(() => {
          const point = {
            t: Date.now(),
            latencyMs:
              i < 3
                ? 1200 - i * 250 + Math.random() * 80
                : 360 + Math.random() * 40,
            errorRate: i < 3 ? 3 - i : Math.random() * 0.2,
          };
          dispatch({ type: "APPEND_METRIC", incidentId, point });
          dispatch({ type: "APPEND_LIVE_METRIC", point });
        }, 400 + i * 450),
      );
    }
  }, []);

  const reject = useCallback((incidentId: string) => {
    cancelSim.current?.();
    cancelSim.current = null;
    dispatch({ type: "REJECT", incidentId });
  }, []);

  const retry = useCallback(
    (incidentId: string) => {
      cancelSim.current?.();
      dispatch({ type: "SET_ACTIVE", incidentId });
      dispatch({
        type: "SET_PHASE",
        incidentId,
        phase: "investigating",
        patch: {
          prUrl: undefined,
          prNumber: undefined,
          diff: undefined,
          qodoComments: undefined,
          sandboxResult: undefined,
          approvedBy: undefined,
          approvedAt: undefined,
          resolvedAt: undefined,
        },
      });
      dispatch({
        type: "APPEND_LOG",
        log: {
          id: `log-retry-${Date.now()}`,
          incidentId,
          timestamp: new Date().toISOString(),
          type: "action",
          message: "› Retrying investigation with alternate fix path",
          phase: "investigating",
        },
      });
      cancelSim.current = runIncidentSimulation(incidentId, emitSim);
    },
    [emitSim],
  );

  const escalate = useCallback((incidentId: string) => {
    cancelSim.current?.();
    cancelSim.current = null;
    dispatch({ type: "ESCALATE", incidentId });
  }, []);

  const close = useCallback((incidentId: string) => {
    cancelSim.current?.();
    cancelSim.current = null;
    dispatch({ type: "CLOSE", incidentId });
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
      else if (
        active.phase === "alert" ||
        active.phase === "investigating" ||
        active.phase === "root_cause_found" ||
        active.phase === "sandbox_verifying" ||
        active.phase === "pr_opened"
      )
        status = "investigating";
      else status = "degraded";
    }
    return {
      service: "checkout-svc",
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
      isRealMode: false,
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
