import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "./ProfileContext";

export function useRequireRealMode(redirectTo = "/app") {
  const { mode, loading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || mode === "real") return;
    navigate(redirectTo, { replace: true });
  }, [loading, mode, navigate, redirectTo]);

  return { allowed: mode === "real", loading };
}
