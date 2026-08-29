import { NavLink, Outlet } from "react-router-dom";
import { IncidentProvider } from "../lib/IncidentStore";
import { useProfile } from "../lib/ProfileContext";

const AppShell = () => {
  const { profile } = useProfile();

  return (
    <IncidentProvider>
      <div className="font-sans text-(--foreground-color)">
        <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 border-b border-(--border-color) bg-(--surface-color)">
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2 pb-3">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                [
                  "px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-(--foreground-color) border-b-2 border-primary"
                    : "text-(--muted-color) hover:text-(--foreground-color)",
                ].join(" ")
              }
            >
              Incidents
            </NavLink>
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                [
                  "px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-(--foreground-color) border-b-2 border-primary"
                    : "text-(--muted-color) hover:text-(--foreground-color)",
                ].join(" ")
              }
            >
              Settings
            </NavLink>
            {profile ? (
              <span className="ml-auto text-[11px] font-mono text-(--muted-color)">
                {profile.displayName}
              </span>
            ) : null}
          </nav>
        </div>
        <Outlet />
      </div>
    </IncidentProvider>
  );
};

export default AppShell;
