import { getStoredProfile } from "./profile";

export type SseHandlers = {
  onLog?: (data: unknown) => void;
  onPhase?: (data: { id: string; phase: string }) => void;
  onConnected?: () => void;
  onError?: () => void;
};

export function subscribeIncidentEvents(
  incidentId: string,
  handlers: SseHandlers,
): () => void {
  const profile = getStoredProfile();
  if (!profile) {
    handlers.onError?.();
    return () => {};
  }

  const url = `/api/incidents/${incidentId}/events/stream`;
  const es = new EventSource(url, {
    withCredentials: false,
  });

  // EventSource doesn't support custom headers; pass auth via query params
  // We'll use a fetch-based SSE reader instead for auth headers
  const controller = new AbortController();
  let closed = false;

  void (async () => {
    try {
      const response = await fetch(url, {
        headers: {
          "X-Profile-Id": profile.id,
          "X-Profile-Token": profile.token,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        handlers.onError?.();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim() || part.startsWith(":")) continue;
          const lines = part.split("\n");
          let eventType = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              data = line.slice(5).trim();
            }
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data) as unknown;
            if (eventType === "connected") handlers.onConnected?.();
            else if (eventType === "log") handlers.onLog?.(parsed);
            else if (eventType === "phase")
              handlers.onPhase?.(parsed as { id: string; phase: string });
          } catch {
            // ignore malformed events
          }
        }
      }
    } catch {
      if (!closed) handlers.onError?.();
    }
  })();

  es.close();

  return () => {
    closed = true;
    controller.abort();
    es.close();
  };
}
