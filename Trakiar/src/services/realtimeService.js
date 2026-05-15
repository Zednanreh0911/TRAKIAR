import { WS_BASE_URL } from '../config/api';

export const createManagerRealtimeSocket = ({ token, onOpen, onMessage, onError, onClose }) => {
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
      const payload = JSON.parse(event.data);
      onMessage?.(payload);
    } catch {
      // Ignorar payloads inválidos
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

export const createPassengerRealtimeSocket = ({ token, idRuta, onOpen, onMessage, onError, onClose }) => {
  if (!token || !idRuta) {
    return null;
  }

  const socketUrl = `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}&idRuta=${encodeURIComponent(idRuta)}`;
  const socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    onOpen?.();
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      onMessage?.(payload);
    } catch {
      // Ignorar payloads inválidos
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
