import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, User } from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Shield, Users, Video, ListTodo } from 'lucide-react';

export function AdminPage() {
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api<{ stats: { users: number; meetings: number; liveMeetings: number; tasks: number } }>('/api/admin/stats'),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api<{ users: User[] }>('/api/admin/users'),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const stats = statsData?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="h-7 w-7 text-indigo-400" /> Admin Dashboard
        </h1>
        <p className="text-slate-400">Platform overview and user management (Day 29)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Users', value: stats?.users ?? 0, icon: Users },
          { label: 'Meetings', value: stats?.meetings ?? 0, icon: Video },
          { label: 'Live', value: stats?.liveMeetings ?? 0, icon: Video },
          { label: 'Tasks', value: stats?.tasks ?? 0, icon: ListTodo },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <Icon className="mb-2 h-6 w-6 text-indigo-400" />
            <p className="text-sm text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="User Management" description="Assign admin or member roles" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersData?.users.map((u) => (
                <tr key={u.id || u._id} className="border-b border-slate-800/50">
                  <td className="py-3 pr-4 text-white">{u.name}</td>
                  <td className="py-3 pr-4 text-slate-400">{u.email}</td>
                  <td className="py-3 pr-4 capitalize text-slate-300">{u.role}</td>
                  <td className="py-3">
                    {u.role === 'member' ? (
                      <Button size="sm" variant="secondary" onClick={() => updateRole.mutate({ id: (u.id || u._id)!, role: 'admin' })}>
                        Make Admin
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => updateRole.mutate({ id: (u.id || u._id)!, role: 'member' })}>
                        Make Member
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
