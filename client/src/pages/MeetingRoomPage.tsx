import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, Meeting, uploadFile } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Card';
import { useLiveTranscription } from '@/hooks/useLiveTranscription';
import {
  Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, MessageSquare, Send, Users,
  StickyNote, Circle, Square, FileText, ListPlus,
} from 'lucide-react';

function VideoTile({ stream, label, muted = false }: { stream: MediaStream | null; label: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/30 text-2xl font-bold text-indigo-300">
            {label.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">{label}</div>
    </div>
  );
}

type SidePanel = 'chat' | 'notes' | 'participants' | 'transcript' | 'tasks';

export function MeetingRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const [mediaStarted, setMediaStarted] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>('chat');
  const [taskText, setTaskText] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: joinData } = useQuery({
    queryKey: ['join', roomCode],
    queryFn: () => api<{ meeting: Meeting }>(`/api/meetings/join/${roomCode}`, { method: 'POST' }),
    enabled: !!roomCode && !!accessToken,
  });

  const meeting = joinData?.meeting;

  const room = useMeetingRoom({
    roomCode: roomCode || '',
    userName: user?.name || 'Guest',
    token: accessToken || '',
    enabled: mediaStarted && !!roomCode,
  });

  const transcription = useLiveTranscription(
    (text) => room.sendTranscriptChunk(text),
    mediaStarted
  );

  const quickTaskMutation = useMutation({
    mutationFn: () =>
      api(`/api/meetings/${meeting?._id}/quick-task`, {
        method: 'POST',
        body: JSON.stringify({ text: taskText, assigneeName: taskAssignee || user?.name }),
      }),
    onSuccess: () => {
      setTaskText('');
      setTaskAssignee('');
    },
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      const blob = room.stopRecording();
      if (blob && meeting?._id) {
        const form = new FormData();
        form.append('recording', blob, 'meeting-recording.webm');
        await uploadFile(`/api/meetings/${meeting._id}/recording`, form).catch(() => undefined);
      }
      return api<{ meeting: Meeting }>(`/api/meetings/${meeting?._id}/end`, { method: 'POST' });
    },
    onSuccess: (data) => navigate(`/meetings/${data.meeting._id}`),
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.messages]);

  const handleStart = async () => {
    await room.startMedia();
    setMediaStarted(true);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    room.sendMessage(message);
    setMessage('');
    room.setTyping(false);
  };

  const handleTyping = (val: string) => {
    setMessage(val);
    room.setTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => room.setTyping(false), 2000);
  };

  const isHost = meeting?.hostId === user?.id || meeting?.hostId?.toString() === user?.id;

  const allParticipants = [
    { userName: `${user?.name} (You)`, isMuted: room.isMuted, isVideoOff: room.isVideoOff, isLocal: true },
    ...room.participants.map((p) => ({ ...p, isLocal: false })),
  ];

  if (!mediaStarted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-4">
        <h1 className="text-2xl font-bold text-white">{meeting?.title || 'Meeting Room'}</h1>
        <p className="text-slate-400">
          Room code: <span className="font-mono text-indigo-400">{roomCode}</span>
        </p>
        <Button size="lg" onClick={handleStart}>
          <Video className="h-5 w-5" /> Start Camera & Join
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 lg:flex-row">
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{meeting?.title}</h1>
            <p className="text-xs text-slate-500">
              {room.connected ? 'Connected' : 'Connecting...'} · {allParticipants.length} participants
              {room.isRecording && <span className="ml-2"><Badge variant="live">REC</Badge></span>}
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 overflow-auto">
          <VideoTile stream={room.localStream} label={`${user?.name} (You)`} muted />
          {Array.from(room.remoteStreams.entries()).map(([socketId, stream]) => {
            const participant = room.participants.find((p) => p.socketId === socketId);
            return <VideoTile key={socketId} stream={stream} label={participant?.userName || 'Participant'} />;
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <Button variant={room.isMuted ? 'danger' : 'secondary'} size="sm" onClick={room.toggleMute}>
            {room.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button variant={room.isVideoOff ? 'danger' : 'secondary'} size="sm" onClick={room.toggleVideo}>
            {room.isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>
          <Button variant={room.isScreenSharing ? 'primary' : 'secondary'} size="sm" onClick={room.toggleScreenShare}>
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={room.isRecording ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => (room.isRecording ? room.stopRecording() : room.startRecording())}
          >
            {room.isRecording ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4 text-red-400" />}
          </Button>
          {isHost && (
            <Button variant="danger" size="sm" onClick={() => endMutation.mutate()} loading={endMutation.isPending}>
              End Meeting
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate('/meetings')}>
            <PhoneOff className="h-4 w-4 text-red-400" /> Leave
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-col border-t border-slate-800 lg:w-96 lg:border-l lg:border-t-0">
        <div className="flex border-b border-slate-800">
          {([
            { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
            { id: 'notes' as const, icon: StickyNote, label: 'Notes' },
            { id: 'transcript' as const, icon: FileText, label: 'Live' },
            { id: 'tasks' as const, icon: ListPlus, label: 'Tasks' },
            { id: 'participants' as const, icon: Users, label: 'People' },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setSidePanel(id)}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm ${
                sidePanel === id ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {sidePanel === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[240px] max-h-[50vh] lg:max-h-none">
              {room.messages.map((msg, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-indigo-400">{msg.userName}</span>
                  <span className="text-slate-500 text-xs ml-2">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  <p className="text-slate-300 mt-0.5">{msg.message}</p>
                </div>
              ))}
              {room.typingUsers.length > 0 && (
                <p className="text-xs text-slate-500 italic">{room.typingUsers.join(', ')} typing...</p>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 border-t border-slate-800 p-3">
              <Input
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
              />
              <Button size="sm" onClick={handleSend}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {sidePanel === 'notes' && (
          <div className="flex flex-1 flex-col p-3">
            <p className="mb-2 text-xs text-slate-500">
              Collaborative notes {room.notesUpdatedBy && `· last edit by ${room.notesUpdatedBy}`}
            </p>
            <Textarea
              value={room.sharedNotes}
              onChange={(e) => room.updateNotes(e.target.value)}
              rows={12}
              placeholder="Take shared meeting notes..."
              className="flex-1 min-h-[200px]"
            />
          </div>
        )}

        {sidePanel === 'transcript' && (
          <div className="flex flex-1 flex-col p-3">
            <div className="mb-3 flex gap-2">
              {transcription.supported ? (
                <Button size="sm" variant={transcription.isListening ? 'danger' : 'secondary'} onClick={() => (transcription.isListening ? transcription.stop() : transcription.start())}>
                  {transcription.isListening ? 'Stop' : 'Start'} Transcription
                </Button>
              ) : (
                <p className="text-xs text-slate-500">Speech recognition not supported in this browser</p>
              )}
            </div>
            {transcription.interimText && <p className="mb-2 text-xs italic text-slate-500">{transcription.interimText}</p>}
            <div className="flex-1 overflow-y-auto space-y-1 text-sm text-slate-300">
              {room.liveTranscript.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              {!room.liveTranscript.length && <p className="text-slate-500">Live transcript will appear here (Day 15)</p>}
            </div>
          </div>
        )}

        {sidePanel === 'tasks' && (
          <div className="flex flex-1 flex-col p-3 gap-3">
            <div className="flex gap-2">
              <Input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Quick task..." />
              <Button size="sm" disabled={!taskText.trim()} onClick={() => quickTaskMutation.mutate()} loading={quickTaskMutation.isPending}>
                Add
              </Button>
            </div>
            <Input value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} placeholder="Assignee (optional)" className="text-sm" />
            <div className="flex-1 overflow-y-auto space-y-2">
              {room.meetingTasks.map((t, i) => (
                <div key={i} className="rounded-lg border border-slate-800 p-2 text-sm text-white">
                  {t.text}
                  {t.assigneeName && <p className="text-xs text-slate-500">@{t.assigneeName}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {sidePanel === 'participants' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {allParticipants.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/30 text-sm font-semibold text-indigo-300">
                    {p.userName.charAt(0)}
                  </div>
                  <span className="text-sm text-white">{p.userName}</span>
                </div>
                <div className="flex gap-1">
                  {p.isMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
                  {p.isVideoOff && <VideoOff className="h-3.5 w-3.5 text-amber-400" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
