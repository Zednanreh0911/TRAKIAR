import { WS_BASE_URL } from '../config/api';

export const createRealtimeSocket = ({ token, onOpen, onMessage, onError, onClose }) => {
  if (!token) {
    return null;
  }

  const socketUrl = `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;
  const socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    onOpen?.();
  };

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      onMessage?.(parsed);
    } catch {
      // Ignorar mensajes inválidos
    }
  };

  socket.onerror = (event) => {
    onError?.(event);
  };

  socket.onclose = (event) => {
    onClose?.(event);
  };

  return socket;
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
