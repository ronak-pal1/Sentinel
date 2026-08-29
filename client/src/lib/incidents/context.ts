import { createContext, useContext } from "react";
import type { IncidentContextValue } from "./types";

export const IncidentContext = createContext<IncidentContextValue | null>(null);

export function useIncidents(): IncidentContextValue {
  const ctx = useContext(IncidentContext);
  if (!ctx) {
    throw new Error("useIncidents must be used within IncidentProvider");
  }
  return ctx;
}
