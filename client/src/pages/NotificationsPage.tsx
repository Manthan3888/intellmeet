import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Notification } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotificationsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ notifications: Notification[] }>('/api/notifications', { token: accessToken }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api('/api/notifications/read-all', { method: 'POST', token: accessToken }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: 'PATCH', token: accessToken }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400">Mentions, action items, and meeting updates.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => markAllRead.mutate()}>
          Mark all read
        </Button>
      </div>

      <div className="space-y-2">
        {data?.notifications.map((n) => (
          <Card
            key={n._id}
            className={`p-4 ${!n.read ? 'border-indigo-500/30 bg-indigo-500/5' : ''}`}
          >
            <div className="flex gap-3">
              <Bell className={`h-5 w-5 shrink-0 ${n.read ? 'text-slate-500' : 'text-indigo-400'}`} />
              <div className="flex-1">
                <p className="font-medium text-white">{n.title}</p>
                <p className="text-sm text-slate-400">{n.message}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                <div className="mt-2 flex gap-2">
                  {n.link && (
                    <Link to={n.link} className="text-xs text-indigo-400 hover:underline">
                      View
                    </Link>
                  )}
                  {!n.read && (
                    <button onClick={() => markRead.mutate(n._id)} className="text-xs text-slate-500 hover:text-white">
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {!data?.notifications.length && (
          <Card className="text-center py-12">
            <Bell className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No notifications yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
