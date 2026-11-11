import { useEffect, useRef, useState } from 'react';

/**
 * Optional live updates via socket.io. Gracefully falls back to polling === false.
 * Usage: const { connected, lastEvent } = useSocket(['log:created']);
 */
export function useSocket(topics = [], options = {}) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let socket = null;
    (async () => {
      try {
        const mod = await import('socket.io-client').catch((e) => { console.error('[socket import failed]', e); return null; });
        if (!mod || cancelled) return;
        const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        const token = localStorage.getItem('devapi_token');
        socket = mod.io(url, {
          withCredentials: true,
          auth: token ? { token } : undefined,
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 3,
        });
        socketRef.current = socket;
        const joinRooms = () => {
          try {
            const pid = options?.projectId;
            const freshToken = (() => { try { return localStorage.getItem('devapi_token'); } catch { return null; } })();
            if (pid && /^[a-fA-F0-9]{24}$/.test(String(pid)) && freshToken) {
              socket.emit('join', { project: String(pid), token: freshToken });
            }
          } catch {}
        };
        socket.on('connect', () => {
          if (!cancelled) setConnected(true);
          joinRooms();
        });
        socket.on('disconnect', () => !cancelled && setConnected(false));
        topics.forEach((t) => socket.on(t, (payload) => !cancelled && setLastEvent({ topic: t, payload, at: Date.now() })));
      } catch (e) {
        console.error('[socket init failed]', e);
      }
    })();
    return () => {
      cancelled = true;
      try {
        socketRef.current?.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(topics), options?.projectId]);

  return { connected, lastEvent };
}
