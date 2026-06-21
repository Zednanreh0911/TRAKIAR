import { WS_BASE_URL } from '../config/api';

export const createRealtimeSocket = ({ token, onOpen, onMessage, onError, onClose }) => {
  if (!token) {
    return null;
  }

  const socketUrl = `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;

  if (!/^wss?:\/\//i.test(socketUrl)) {
    onError?.(new Error(`URL WebSocket inválida: ${socketUrl}`));
    return null;
  }

  let ws = null;
  let isIntentionalClose = false;
  let reconnectTimer = null;

  const connect = () => {
    if (isIntentionalClose) return;
    
    ws = new WebSocket(socketUrl);

    ws.onopen = () => {
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage?.(parsed);
      } catch {
        // Ignorar mensajes inválidos
      }
    };

    ws.onerror = (event) => {
      onError?.(event);
    };

    ws.onclose = (event) => {
      if (!isIntentionalClose) {
        // Reconnect after 5 seconds
        reconnectTimer = setTimeout(connect, 5000);
      }
      onClose?.(event);
    };
  };

  connect();

  return {
    get readyState() {
      return ws ? ws.readyState : WebSocket.CLOSED;
    },
    send(data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    },
    close() {
      isIntentionalClose = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    }
  };
};

export const sendDriverRealtimeLocation = (socket, payload) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  socket.send(
    JSON.stringify({
      type: 'driver_location',
      data: payload,
    })
  );

  return true;
};
