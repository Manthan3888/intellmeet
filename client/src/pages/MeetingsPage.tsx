import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Meeting } from '@/lib/api';
import { Card, CardHeader, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Plus, Video, Copy, Trash2, Search } from 'lucide-react';

export function MeetingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.length >= 2) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      const qs = params.toString();
      return api<{ meetings: Meeting[] }>(`/api/meetings${qs ? `?${qs}` : ''}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api<{ meeting: Meeting }>('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setShowCreate(false);
      setTitle('');
      setDescription('');
      navigate(`/meetings/room/${data.meeting.roomCode}`);
    },
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => api<{ meeting: Meeting }>(`/api/meetings/join/${code}`, { method: 'POST' }),
    onSuccess: (data) => navigate(`/meetings/room/${data.meeting.roomCode}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/meetings/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Meetings</h1>
          <p className="text-slate-400">Create, join, and manage your video meetings.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Meeting
        </Button>
      </div>

      <Card>
        <CardHeader title="Search & Filter" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or room code..." className="pl-10" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </Card>

      <Card>
        <CardHeader title="Join with Room Code" />
        <div className="flex gap-3">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter 8-character code"
            maxLength={8}
            className="max-w-xs uppercase"
          />
          <Button
            variant="secondary"
            onClick={() => joinCode && joinMutation.mutate(joinCode)}
            loading={joinMutation.isPending}
            disabled={joinCode.length < 4}
          >
            Join
          </Button>
        </div>
        {joinMutation.isError && <p className="mt-2 text-sm text-red-400">{(joinMutation.error as Error).message}</p>}
      </Card>

      {showCreate && (
        <Card>
          <CardHeader title="Create Meeting" description="Set up a new video meeting room" />
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly standup" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Meeting agenda..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Schedule (optional)</label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => title && createMutation.mutate()} loading={createMutation.isPending}>
                Create & Join
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {isLoading && <p className="text-slate-500">Loading meetings...</p>}
        {data?.meetings.map((meeting) => (
          <Card key={meeting._id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-white">{meeting.title}</h3>
                <Badge variant={meeting.status === 'live' ? 'live' : meeting.status === 'ended' ? 'success' : 'default'}>
                  {meeting.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Host: {meeting.hostName} · Code: <span className="font-mono text-indigo-400">{meeting.roomCode}</span>
              </p>
              {meeting.description && <p className="mt-1 text-sm text-slate-500">{meeting.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {meeting.status !== 'ended' && (
                <Link to={`/meetings/room/${meeting.roomCode}`}>
                  <Button size="sm">
                    <Video className="h-4 w-4" /> Join
                  </Button>
                </Link>
              )}
              <Link to={`/meetings/${meeting._id}`}>
                <Button size="sm" variant="secondary">
                  Details
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => copyCode(meeting.roomCode)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(meeting._id)}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          </Card>
        ))}
        {!isLoading && !data?.meetings.length && (
          <Card className="text-center py-12">
            <Video className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No meetings yet. Create your first meeting to get started.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
