import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/utils';
import type { ChatMessage } from '@/lib/api';

interface Participant {
  socketId: string;
  userId: string;
  userName: string;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface UseMeetingRoomOptions {
  roomCode: string;
  userName: string;
  token: string;
  enabled: boolean;
}

export function useMeetingRoom({ roomCode, userName, token, enabled }: UseMeetingRoomOptions) {
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sharedNotes, setSharedNotes] = useState('');
  const [notesUpdatedBy, setNotesUpdatedBy] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [meetingTasks, setMeetingTasks] = useState<{ text: string; assigneeName?: string }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const createPeerConnection = useCallback(
    (remoteSocketId: string, stream: MediaStream) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('webrtc-ice-candidate', { to: remoteSocketId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(remoteSocketId, event.streams[0]);
          return next;
        });
      };

      peersRef.current.set(remoteSocketId, pc);
      return pc;
    },
    []
  );

  useEffect(() => {
    if (!enabled || !token || !roomCode) return;

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { roomCode, userName });
    });

    socket.on('room-participants', async (parts: Participant[]) => {
      setParticipants(parts.filter((p) => p.socketId !== socket.id));

      const stream = localStreamRef.current;
      if (!stream) return;

      for (const p of parts) {
        if (p.socketId === socket.id || peersRef.current.has(p.socketId)) continue;
        const pc = createPeerConnection(p.socketId, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { to: p.socketId, offer });
      }
    });

    socket.on('user-joined', async ({ socketId }: { socketId: string }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      const pc = createPeerConnection(socketId, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { to: socketId, offer });
    });

    socket.on('webrtc-offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const stream = localStreamRef.current;
      if (!stream) return;

      let pc = peersRef.current.get(from);
      if (!pc) {
        pc = createPeerConnection(from, stream);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { to: from, answer });
    });

    socket.on('webrtc-answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc-ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('user-left', ({ socketId }: { socketId: string }) => {
      peersRef.current.get(socketId)?.close();
      peersRef.current.delete(socketId);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    socket.on('chat-history', (history: ChatMessage[]) => setMessages(history));
    socket.on('chat-message', (msg: ChatMessage) => setMessages((prev) => [...prev, msg]));

    socket.on('user-typing', ({ userName: name, isTyping }: { userName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => (isTyping ? [...new Set([...prev, name])] : prev.filter((n) => n !== name)));
    });

    socket.on('participant-media-update', ({ socketId, isMuted: muted, isVideoOff: videoOff }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isMuted: muted, isVideoOff: videoOff } : p))
      );
    });

    socket.on('notes-sync', ({ content, updatedBy }: { content: string; updatedBy: string }) => {
      setSharedNotes(content);
      setNotesUpdatedBy(updatedBy);
    });

    socket.on('live-transcript', ({ text }: { text: string }) => {
      setLiveTranscript((prev) => [...prev.slice(-20), text]);
    });

    socket.on('quick-task-created', (item: { text: string; assigneeName?: string }) => {
      setMeetingTasks((prev) => [...prev, item]);
    });

    return () => {
      socket.emit('leave-room');
      socket.disconnect();
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current?.stop();
    };
  }, [enabled, token, roomCode, userName, createPeerConnection]);

  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOff(true);
      return stream;
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    socketRef.current?.emit('chat-message', { message });
  }, []);

  const sendTranscriptChunk = useCallback((text: string) => {
    socketRef.current?.emit('transcript-chunk', { text });
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.emit('typing', { isTyping });
  }, []);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    socketRef.current?.emit('media-state', { isMuted: newMuted, isVideoOff });
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);
    socketRef.current?.emit('media-state', { isMuted, isVideoOff: newVideoOff });
  }, [isMuted, isVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      socketRef.current?.emit('screen-share-stopped');
      if (localStreamRef.current) {
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && localStreamRef.current) {
            sender.replaceTrack(localStreamRef.current.getVideoTracks()[0] || null);
          }
        });
      }
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      socketRef.current?.emit('screen-share-started');

      const screenTrack = screenStream.getVideoTracks()[0];
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => toggleScreenShare();
    } catch {
      // user cancelled
    }
  }, [isScreenSharing]);

  const updateNotes = useCallback((content: string) => {
    setSharedNotes(content);
    clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => {
      socketRef.current?.emit('notes-update', { content });
    }, 500);
  }, []);

  const startRecording = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream || isRecording) return;

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [isRecording]);

  const stopRecording = useCallback((): Blob | null => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !isRecording) return null;

    recorder.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);

    if (recordedChunksRef.current.length === 0) return null;
    return new Blob(recordedChunksRef.current, { type: 'video/webm' });
  }, [isRecording]);

  return {
    participants,
    remoteStreams,
    localStream,
    messages,
    typingUsers,
    isMuted,
    isVideoOff,
    isScreenSharing,
    connected,
    sharedNotes,
    notesUpdatedBy,
    isRecording,
    liveTranscript,
    meetingTasks,
    startMedia,
    sendMessage,
    sendTranscriptChunk,
    setTyping,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    updateNotes,
    startRecording,
    stopRecording,
  };
}
