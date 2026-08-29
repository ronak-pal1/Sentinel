import { useState, type FormEvent } from "react";
import { createProfile } from "../../lib/api";
import { useProfile } from "../../lib/ProfileContext";

export default function Onboarding() {
  const { setProfile } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Enter a display name to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createProfile(name);
      setProfile({
        id: created.id,
        token: created.token,
        displayName: created.displayName,
        mode: created.mode ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create profile");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 md:px-8 py-16 font-sans text-(--foreground-color)">
      <div className="w-full max-w-md border border-(--border-color) bg-(--panel-color) p-8">
        <p className="text-[10px] font-mono tracking-widest text-(--muted-color) mb-2">
          SENTINEL / ONBOARDING
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Set up your workspace
        </h1>
        <p className="text-sm text-(--muted-color) mb-8">
          Create a local profile to access your incidents and settings. No
          password required — your credentials are saved in this browser.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="block text-[11px] font-mono tracking-widest text-(--muted-color) mb-2"
            >
              DISPLAY NAME
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Ronak"
              maxLength={128}
              className="w-full border border-(--border-color) bg-(--surface-color) px-3 py-2.5 text-sm outline-none focus:border-primary"
              autoFocus
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-[#e0a240] disabled:opacity-60 text-black font-medium px-6 py-3 text-sm transition-colors"
          >
            {submitting ? "Creating profile…" : "Get started"}
          </button>
        </form>
      </div>
    </div>
  );
}
