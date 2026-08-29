import type { ReactNode } from "react";
import { ProfileProvider, useProfile } from "../lib/ProfileContext";
import ModeSelection from "../pages/app/ModeSelection";
import Onboarding from "../pages/app/Onboarding";

function ProfileGateInner({ children }: { children: ReactNode }) {
  const { profile, loading, mode } = useProfile();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-sans text-(--muted-color) text-sm">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return <Onboarding />;
  }

  if (!mode) {
    return <ModeSelection />;
  }

  return <>{children}</>;
}

export default function ProfileGate({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <ProfileGateInner>{children}</ProfileGateInner>
    </ProfileProvider>
  );
}
