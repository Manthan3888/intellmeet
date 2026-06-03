import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BarChart3, Clock, CheckCircle2, Video, Download } from 'lucide-react';
import { API_URL } from '@/lib/utils';

export function AnalyticsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
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
          tasksByStatus: { todo: number; inProgress: number; done: number };
        };
        meetingsByMonth: Record<string, number>;
      }>('/api/analytics/dashboard', { token: accessToken }),
  });

  const stats = data?.stats;
  const months = Object.entries(data?.meetingsByMonth || {}).sort();

  if (isLoading) return <p className="text-slate-500">Loading analytics...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics & Insights</h1>
          <p className="text-slate-400">Meeting productivity metrics and engagement reports.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            const token = JSON.parse(localStorage.getItem('intellmeet-auth') || '{}')?.state?.accessToken;
            const res = await fetch(`${API_URL}/api/analytics/export`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'intellmeet-analytics.csv';
            a.click();
          }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Meetings', value: stats?.totalMeetings ?? 0, icon: Video, color: 'text-indigo-400' },
          { label: 'Total Duration', value: `${stats?.totalDurationMinutes ?? 0} min`, icon: Clock, color: 'text-cyan-400' },
          { label: 'Action Items', value: stats?.totalActionItems ?? 0, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Completion Rate', value: `${stats?.actionItemCompletionRate ?? 0}%`, icon: BarChart3, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Meetings by Month" />
          {months.length === 0 ? (
            <p className="text-sm text-slate-500">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {months.map(([month, count]) => {
                const max = Math.max(...months.map(([, c]) => c));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={month}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-400">{month}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Task Distribution" />
          <div className="space-y-4">
            {[
              { label: 'To Do', count: stats?.tasksByStatus.todo ?? 0, color: 'bg-slate-500' },
              { label: 'In Progress', count: stats?.tasksByStatus.inProgress ?? 0, color: 'bg-amber-500' },
              { label: 'Done', count: stats?.tasksByStatus.done ?? 0, color: 'bg-emerald-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-4">
                <div className={`h-3 w-3 rounded-full ${color}`} />
                <span className="flex-1 text-sm text-slate-400">{label}</span>
                <span className="font-semibold text-white">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Productivity Insights" />
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• {stats?.endedMeetings ?? 0} meetings completed with AI-generated summaries</li>
          <li>• {stats?.completedActionItems ?? 0} of {stats?.totalActionItems ?? 0} action items marked complete</li>
          <li>• Average meeting duration: {stats?.totalMeetings ? Math.round((stats.totalDurationMinutes / stats.totalMeetings) || 0) : 0} minutes</li>
        </ul>
      </Card>
    </div>
  );
}
