import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { realtimeUrl } from "@/lib/api";

export function useRealtime(
  channel: "queue" | "token" | "business",
  id: string | undefined,
  onEvent: () => void,
) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!id) return;
    const socket = new WebSocket(realtimeUrl());
    let closed = false;

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          action: "subscribe",
          channel,
          id,
          accessToken: getAccessToken() ?? undefined,
          ticketToken: channel === "token" ? id : undefined,
        }),
      );
    });
    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as { type?: string };
        if (payload.type === "subscribed") {
          setConnected(true);
          return;
        }
        if (payload.type && payload.type !== "error") onEvent();
      } catch {
        /* ignore */
      }
    });
    socket.addEventListener("close", () => {
      if (!closed) setConnected(false);
    });

    return () => {
      closed = true;
      setConnected(false);
      socket.close();
    };
  }, [channel, id, onEvent]);

  return connected;
}
