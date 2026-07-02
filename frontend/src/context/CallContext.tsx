'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

interface CallState {
  isActive: boolean;
  isReceiving: boolean;
  callerId: string | null;
  calleeId: string | null;
  callerName: string | null;
  type: 'voice' | 'video' | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface VoiceUser {
  userId: string;
  socketId: string;
  displayName: string;
  stream: MediaStream | null;
}

interface CallContextType {
  call: CallState;
  initiateCall: (targetUserId: string, targetName: string, type: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  endCall: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  isCameraOff: boolean;
  toggleCamera: () => void;
  
  // Voice Channels Extensions
  activeVoiceChannelId: string | null;
  voiceUsers: VoiceUser[];
  joinVoiceChannel: (channelId: string) => Promise<void>;
  leaveVoiceChannel: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  // 1-on-1 calls state
  const [call, setCall] = useState<CallState>({
    isActive: false,
    isReceiving: false,
    callerId: null,
    calleeId: null,
    callerName: null,
    type: null,
    localStream: null,
    remoteStream: null,
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Multi-peer Voice Rooms state
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const loggerCall = (...args: any[]) => {
    console.log('[RTC-CALL]', ...args);
  };

  const cleanupStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  // --- 1-ON-1 CALLS LOGIC ---
  useEffect(() => {
    if (!socket) return;

    socket.on('call_invite', (data: { callerId: string; offer: any; type: 'voice' | 'video' }) => {
      setCall({
        isActive: false,
        isReceiving: true,
        callerId: data.callerId,
        calleeId: user?.id || null,
        callerName: `User_${data.callerId.slice(0, 5)}`,
        type: data.type,
        localStream: null,
        remoteStream: null,
      });
      loggerCall('Receiving call invitation from', data.callerId);
    });

    socket.on('call_accept', (data: { calleeId: string; answer: any }) => {
      setCall((prev) => ({ ...prev, isActive: true, isReceiving: false }));
      loggerCall('Call accepted by', data.calleeId);
    });

    socket.on('call_end', () => {
      cleanupStreams();
      setCall({
        isActive: false,
        isReceiving: false,
        callerId: null,
        calleeId: null,
        callerName: null,
        type: null,
        localStream: null,
        remoteStream: null,
      });
      loggerCall('Call terminated by peer');
    });

    return () => {
      socket.off('call_invite');
      socket.off('call_accept');
      socket.off('call_end');
    };
  }, [socket, user]);

  const initiateCall = async (targetUserId: string, targetName: string, type: 'voice' | 'video') => {
    if (!socket || !user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      localStreamRef.current = stream;

      setCall({
        isActive: false,
        isReceiving: false,
        callerId: user.id,
        calleeId: targetUserId,
        callerName: targetName,
        type,
        localStream: stream,
        remoteStream: null,
      });

      socket.emit('call_invite', {
        targetUserId,
        offer: { sdp: 'mock_offer_sdp' },
        type,
      });
    } catch (err) {
      console.error('Failed to get media devices for call', err);
    }
  };

  const acceptCall = async () => {
    if (!socket || !call.callerId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.type === 'video',
      });
      localStreamRef.current = stream;

      setCall((prev) => ({
        ...prev,
        isActive: true,
        isReceiving: false,
        localStream: stream,
      }));

      socket.emit('call_accept', {
        callerId: call.callerId,
        answer: { sdp: 'mock_answer_sdp' },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const endCall = () => {
    if (!socket) return;
    const peerId = call.callerId === user?.id ? call.calleeId : call.callerId;
    if (peerId) {
      socket.emit('call_end', { targetUserId: peerId });
    }
    cleanupStreams();
    setCall({
      isActive: false,
      isReceiving: false,
      callerId: null,
      calleeId: null,
      callerName: null,
      type: null,
      localStream: null,
      remoteStream: null,
    });
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (stream && call.type === 'video') {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  // --- MULTI-PEER VOICE CHANNELS LOGIC ---

  useEffect(() => {
    if (!socket || !activeVoiceChannelId) return;

    // Listen for peer join
    socket.on('user_joined_voice', async (data: { userId: string; username: string; displayName: string; socketId: string }) => {
      loggerCall(`Peer ${data.displayName} (${data.socketId}) joined the voice room.`);
      
      // Add peer with null stream first
      setVoiceUsers((prev) => {
        if (prev.some((vu) => vu.socketId === data.socketId)) return prev;
        return [...prev, { userId: data.userId, socketId: data.socketId, displayName: data.displayName, stream: null }];
      });

      // Create new peer connection
      const pc = createPeerConnection(data.socketId);
      
      // Create and send SDP Offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice_channel_signal', {
          targetSocketId: data.socketId,
          signal: { sdp: offer },
        });
      } catch (err) {
        console.error('Failed to create RTC offer', err);
      }
    });

    // Listen for peer exit
    socket.on('user_left_voice', (data: { userId: string; socketId: string }) => {
      loggerCall(`Peer ${data.socketId} left the voice room.`);
      
      // Close PeerConnection
      const pc = peerConnectionsRef.current.get(data.socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.socketId);
      }

      setVoiceUsers((prev) => prev.filter((vu) => vu.socketId !== data.socketId));
    });

    // Listen for SDP signals
    socket.on('voice_channel_signal', async (data: { senderSocketId: string; senderUserId: string; signal: any }) => {
      const { senderSocketId, signal } = data;
      
      let pc = peerConnectionsRef.current.get(senderSocketId);
      if (!pc) {
        pc = createPeerConnection(senderSocketId);
      }

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('voice_channel_signal', {
              targetSocketId: senderSocketId,
              signal: { sdp: answer },
            });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Failed to process RTC signal', err);
      }
    });

    return () => {
      socket.off('user_joined_voice');
      socket.off('user_left_voice');
      socket.off('voice_channel_signal');
    };
  }, [socket, activeVoiceChannelId]);

  const createPeerConnection = (targetSocketId: string): RTCPeerConnection => {
    // Standard STUN servers configuration
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    peerConnectionsRef.current.set(targetSocketId, pc);

    // Track ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice_channel_signal', {
          targetSocketId,
          signal: { candidate: event.candidate },
        });
      }
    };

    // Attach local audio track
    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Capture remote audio stream track
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setVoiceUsers((prev) =>
        prev.map((vu) => (vu.socketId === targetSocketId ? { ...vu, stream: remoteStream } : vu))
      );
    };

    return pc;
  };

  const joinVoiceChannel = async (channelId: string) => {
    if (!socket || !user) return;
    loggerCall('Joining voice channel', channelId);

    // Leave any current voice channel first
    if (activeVoiceChannelId) {
      leaveVoiceChannel();
    }

    try {
      // Get microphone audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false, // Voice MVP uses audio only
      });
      localStreamRef.current = stream;

      setActiveVoiceChannelId(channelId);
      socket.emit('voice_channel_join', { channelId });
    } catch (err) {
      console.error('Failed to access microphone', err);
      alert('Failed to connect to voice channel: Microphone access is required.');
    }
  };

  const leaveVoiceChannel = () => {
    if (!socket || !activeVoiceChannelId) return;
    loggerCall('Leaving voice channel', activeVoiceChannelId);

    // Emit socket leave event
    socket.emit('voice_channel_leave', { channelId: activeVoiceChannelId });

    // Clean up peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    cleanupStreams();
    setActiveVoiceChannelId(null);
    setVoiceUsers([]);
  };

  return (
    <CallContext.Provider
      value={{
        call,
        initiateCall,
        acceptCall,
        endCall,
        isMuted,
        toggleMute,
        isCameraOff,
        toggleCamera,
        
        // Voice rooms attributes
        activeVoiceChannelId,
        voiceUsers,
        joinVoiceChannel,
        leaveVoiceChannel,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
export default CallContext;
