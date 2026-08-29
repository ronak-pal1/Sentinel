import type { ReactNode } from "react";
import { useProfile } from "../ProfileContext";
import { DemoIncidentProvider } from "./DemoIncidentProvider";
import { RealIncidentProvider } from "./RealIncidentProvider";

export function IncidentProvider({ children }: { children: ReactNode }) {
  const { mode } = useProfile();
  if (mode === "real") {
    return <RealIncidentProvider>{children}</RealIncidentProvider>;
  }
  return <DemoIncidentProvider>{children}</DemoIncidentProvider>;
}

export type { IncidentContextValue } from "./types";
