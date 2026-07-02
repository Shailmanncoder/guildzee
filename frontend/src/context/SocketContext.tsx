'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineFriends: Map<string, any>;
  typingUsers: Map<string, { username: string; displayName: string }>;
  messagesNotifier: any;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineFriends, setOnlineFriends] = useState<Map<string, any>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; displayName: string }>>(new Map());
  const [messagesNotifier, setMessagesNotifier] = useState<any>(null);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const getBackendUrl = () => {
      if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
      if (typeof window !== 'undefined') {
        if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
          return `${window.location.protocol}//${window.location.host}/api/backend`;
        }
      }
      return 'http://localhost:4000';
    };
    const backendUrl = getBackendUrl();
    const socketInstance = io(backendUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO Server');
    });

    // Listen for friend status changes
    socketInstance.on('user_status_changed', (data: { userId: string; username: string; displayName: string; status: any; customStatus: any }) => {
      setOnlineFriends((prev) => {
        const next = new Map(prev);
        if (data.status === 'OFFLINE') {
          next.delete(data.userId);
        } else {
          next.set(data.userId, data);
        }
        return next;
      });
    });

    // Listen for incoming messages
    socketInstance.on('message_received', (message: any) => {
      setMessagesNotifier(message);
    });

    // Listen for typing events
    socketInstance.on('typing_start', (data: { senderId: string; username: string; displayName: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(data.senderId, data);
        return next;
      });
    });

    socketInstance.on('typing_stop', (data: { senderId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.senderId);
        return next;
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineFriends,
        typingUsers,
        messagesNotifier,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
export default SocketContext;
