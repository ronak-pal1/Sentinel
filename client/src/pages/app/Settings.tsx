import { useState } from "react";
import { StatusPill } from "../../components/dashboard/StatusPill";

const connectors = [
  { name: "GitHub MCP", status: "Connected" as const, detail: "PRs · reviews · merge" },
  { name: "Sandbox", status: "Connected" as const, detail: "Ephemeral clone · traffic replay" },
  { name: "Metrics source", status: "Connected" as const, detail: "Grafana · checkout-svc" },
];

export default function Settings() {
  const [key, setKey] = useState("sk-demo························");

  return (
    <div className="px-4 sm:px-6 md:px-8 py-8 pb-20 font-sans text-(--foreground-color) max-w-2xl">
      <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
        SENTINEL / SETTINGS
      </p>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Connections</h1>
      <p className="text-(--muted-color) text-sm mb-10">
        Demo mode — all connectors are mocked. No authentication is required to
        run Break It.
      </p>

      <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
        MCP SERVERS
      </h2>
      <ul className="border border-(--border-color) mb-10 divide-y divide-stone-200">
        {connectors.map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between gap-4 px-4 py-4 bg-(--panel-color)"
          >
            <div>
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-[11px] font-mono text-(--muted-color) mt-0.5 tracking-wide">
                {c.detail}
              </p>
            </div>
            <StatusPill status="healthy" label="Connected" />
          </li>
        ))}
      </ul>

      <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
        MODEL PROVIDER
      </h2>
      <div className="border border-(--border-color) bg-(--surface-color) px-4 py-4 mb-10 space-y-3">
        <label className="block">
          <span className="text-[11px] font-mono tracking-widest text-(--muted-color)">
            API KEY (OPTIONAL)
          </span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-2 w-full bg-(--panel-color) border border-(--border-color) px-3 py-2.5 font-mono text-sm text-(--foreground-color) outline-none focus:border-[#EDA53B]"
            autoComplete="off"
          />
        </label>
        <p className="text-[12px] text-(--muted-color)">
          Not required for the demo simulator. Leave as-is to explore the UI.
        </p>
      </div>

      <h2 className="text-[11px] font-mono tracking-widest text-(--muted-color) mb-4">
        SANDBOX LIMITS
      </h2>
      <div className="border border-(--border-color) bg-(--panel-color) px-4 py-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            MAX REPLAY
          </p>
          <p className="font-mono mt-1">500 requests</p>
        </div>
        <div>
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            TIMEOUT
          </p>
          <p className="font-mono mt-1">60s</p>
        </div>
        <div>
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            ISOLATION
          </p>
          <p className="font-mono mt-1">ephemeral clone</p>
        </div>
        <div>
          <p className="text-[10px] font-mono tracking-widest text-(--muted-color)">
            NETWORK
          </p>
          <p className="font-mono mt-1">egress denied</p>
        </div>
      </div>
    </div>
  );
}
