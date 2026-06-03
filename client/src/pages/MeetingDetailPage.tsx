import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Meeting, Project, Team, Task } from '@/lib/api';
import { Card, CardHeader, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sparkles, CheckCircle2, Circle, ListTodo, Download, ListPlus, StickyNote } from 'lucide-react';
import { useState } from 'react';
import { API_URL } from '@/lib/utils';

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState('');
  const [taskMessage, setTaskMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => api<{ meeting: Meeting }>(`/api/meetings/${id}`),
    enabled: !!id,
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api<{ teams: Team[] }>('/api/teams'),
  });

  const selectedTeam = teamsData?.teams[0];
  const { data: projectsData } = useQuery({
    queryKey: ['projects', selectedTeam?._id],
    queryFn: () => api<{ projects: Project[] }>(`/api/teams/${selectedTeam!._id}/projects`),
    enabled: !!selectedTeam?._id,
  });

  const toggleActionItem = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) =>
      api(`/api/meetings/${id}/action-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meeting', id] }),
  });

  const createTasks = useMutation({
    mutationFn: (projectId: string) =>
      api<{ tasks: Task[] }>(`/api/meetings/${id}/create-tasks`, {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      }),
    onSuccess: (res) => {
      setTaskMessage(`Created ${res.tasks.length} tasks on Kanban board`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => setTaskMessage(err.message),
  });

  const meeting = data?.meeting;
  const projects = projectsData?.projects || [];

  const handleExport = async () => {
    const token = localStorage.getItem('intellmeet-auth');
    const parsed = token ? JSON.parse(token) : null;
    const res = await fetch(`${API_URL}/api/meetings/${id}/export`, {
      headers: parsed?.state?.accessToken ? { Authorization: `Bearer ${parsed.state.accessToken}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${meeting?.roomCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <p className="text-slate-500">Loading meeting details...</p>;
  if (!meeting) return <p className="text-red-400">Meeting not found</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
            <Badge variant={meeting.status === 'ended' ? 'success' : meeting.status === 'live' ? 'live' : 'default'}>
              {meeting.status}
            </Badge>
          </div>
          <p className="mt-1 text-slate-400">
            Hosted by {meeting.hostName} · Room: {meeting.roomCode}
            {meeting.durationMinutes ? ` · ${meeting.durationMinutes} min` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          {meeting.status !== 'ended' && (
            <Link to={`/meetings/room/${meeting.roomCode}`}>
              <Button size="sm">Rejoin</Button>
            </Link>
          )}
        </div>
      </div>

      {meeting.recordingUrl && (
        <Card>
          <CardHeader title="Meeting Recording" />
          <video controls className="w-full rounded-lg" src={meeting.recordingUrl.startsWith('/') ? `${API_URL}${meeting.recordingUrl}` : meeting.recordingUrl}>
            <track kind="captions" />
          </video>
        </Card>
      )}

      {meeting.summary && (
        <Card>
          <CardHeader title="AI Meeting Summary" description="Automatically generated after the meeting ended" />
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{meeting.summary}</p>
          </div>
        </Card>
      )}

      {meeting.sharedNotes && (
        <Card>
          <CardHeader title="Shared Notes" />
          <div className="flex gap-3">
            <StickyNote className="h-5 w-5 shrink-0 text-cyan-400 mt-0.5" />
            <p className="text-slate-300 whitespace-pre-wrap">{meeting.sharedNotes}</p>
          </div>
        </Card>
      )}

      {meeting.actionItems.length > 0 && (
        <Card>
          <CardHeader title="Action Items" description="Smart extracted tasks from your meeting" />
          <div className="space-y-2">
            {meeting.actionItems.map((item) => (
              <button
                key={item._id}
                onClick={() => toggleActionItem.mutate({ itemId: item._id, completed: !item.completed })}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-800 p-3 text-left hover:bg-slate-800/50"
              >
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-500" />
                )}
                <div>
                  <p className={`text-sm ${item.completed ? 'text-slate-500 line-through' : 'text-white'}`}>{item.text}</p>
                  {item.assigneeName && <p className="text-xs text-slate-500 mt-0.5">Assignee: {item.assigneeName}</p>}
                </div>
              </button>
            ))}
          </div>

          {meeting.status === 'ended' && projects.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
              <select
                value={selectedProject || projects[0]?._id}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => createTasks.mutate(selectedProject || projects[0]._id)}
                loading={createTasks.isPending}
              >
                <ListPlus className="h-4 w-4" /> Add to Kanban
              </Button>
              {taskMessage && <p className="text-sm text-emerald-400">{taskMessage}</p>}
            </div>
          )}
        </Card>
      )}

      {meeting.chatMessages && meeting.chatMessages.length > 0 && (
        <Card>
          <CardHeader title="Meeting Transcript" description="Chat messages captured during the meeting" />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {meeting.chatMessages.map((msg, i) => (
              <div key={i} className="text-sm border-b border-slate-800/50 pb-2">
                <span className="font-medium text-indigo-400">{msg.userName}</span>
                <span className="text-slate-500 text-xs ml-2">{new Date(msg.timestamp).toLocaleString()}</span>
                <p className="text-slate-300">{msg.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {meeting.status === 'ended' && !meeting.summary && (
        <Card className="text-center py-8">
          <ListTodo className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-slate-400">Meeting ended. AI summary will appear once processed.</p>
        </Card>
      )}
    </div>
  );
}
