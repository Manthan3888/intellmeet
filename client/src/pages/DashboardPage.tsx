import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Video, Plus, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () =>
      api<{
        stats: {
          totalMeetings: number;
          liveMeetings: number;
          endedMeetings: number;
          totalDurationMinutes: number;
          totalActionItems: number;
          completedActionItems: number;
          actionItemCompletionRate: number;
        };
        recentMeetings: { _id: string; title: string; status: string; createdAt: string }[];
      }>('/api/analytics/dashboard', { token: accessToken }),
  });

  const { data: meetingsData } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => api<{ meetings: { _id: string; title: string; status: string; roomCode: string; createdAt: string }[] }>('/api/meetings', { token: accessToken }),
  });

  const stats = analytics?.stats;
  const liveMeetings = meetingsData?.meetings.filter((m) => m.status === 'live') || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-slate-400">Here&apos;s what&apos;s happening with your meetings today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Meetings', value: stats?.totalMeetings ?? 0, icon: Video },
          { label: 'Live Now', value: stats?.liveMeetings ?? 0, icon: Clock },
          { label: 'Action Items', value: stats?.totalActionItems ?? 0, icon: CheckCircle2 },
          { label: 'Completion Rate', value: `${stats?.actionItemCompletionRate ?? 0}%`, icon: ArrowRight },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{value}</p>
              </div>
              <Icon className="h-8 w-8 text-indigo-400/50" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Quick Actions" description="Start or join a meeting" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/meetings" className="flex-1">
              <Button className="w-full">
                <Plus className="h-4 w-4" /> New Meeting
              </Button>
            </Link>
            <Link to="/meetings" className="flex-1">
              <Button variant="secondary" className="w-full">
                <Video className="h-4 w-4" /> Join with Code
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Live Meetings" />
          {liveMeetings.length === 0 ? (
            <p className="text-sm text-slate-500">No live meetings right now.</p>
          ) : (
            <div className="space-y-2">
              {liveMeetings.map((m) => (
                <Link
                  key={m._id}
                  to={`/meetings/room/${m.roomCode}`}
                  className="flex items-center justify-between rounded-lg border border-slate-800 p-3 hover:bg-slate-800/50"
                >
                  <span className="font-medium text-white">{m.title}</span>
                  <Badge variant="live">Live</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Meetings" />
        <div className="space-y-2">
          {(analytics?.recentMeetings || []).map((m) => (
            <Link
              key={m._id}
              to={`/meetings/${m._id}`}
              className="flex items-center justify-between rounded-lg border border-slate-800 p-3 hover:bg-slate-800/50"
            >
              <div>
                <p className="font-medium text-white">{m.title}</p>
                <p className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant={m.status === 'ended' ? 'success' : m.status === 'live' ? 'live' : 'default'}>
                {m.status}
              </Badge>
            </Link>
          ))}
          {!analytics?.recentMeetings?.length && <p className="text-sm text-slate-500">No meetings yet. Create your first one!</p>}
        </div>
      </Card>
    </div>
  );
}
