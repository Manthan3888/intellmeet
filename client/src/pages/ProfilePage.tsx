import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile, User } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User as UserIcon, Camera } from 'lucide-react';
import { useRef, useState } from 'react';

export function ProfilePage() {
  const { user, accessToken, setAuth, refreshToken } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || '');
  const [message, setMessage] = useState('');

  const { data } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<{ user: User }>('/api/auth/me'),
    enabled: !!accessToken,
  });

  const profile = data?.user || user;

  const updateProfile = useMutation({
    mutationFn: () => api<{ user: User }>('/api/users/profile', { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: (res) => {
      if (user && refreshToken) {
        setAuth({ ...user, name: res.user.name, avatar: res.user.avatar }, accessToken!, refreshToken);
      }
      setMessage('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('avatar', file);
      return uploadFile<{ user: User; avatarUrl: string }>('/api/users/avatar', form);
    },
    onSuccess: (res) => {
      if (user && refreshToken) {
        setAuth({ ...user, avatar: res.user.avatar }, accessToken!, refreshToken);
      }
      setMessage('Avatar uploaded');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-slate-400">Manage your account and avatar.</p>
      </div>

      <Card>
        <CardHeader title="Your Profile" description="Update your display name and photo" />
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="h-24 w-24 rounded-full object-cover border-2 border-indigo-500/50" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600/30 text-3xl font-bold text-indigo-300">
                {profile?.name?.charAt(0).toUpperCase() || <UserIcon />}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-indigo-600 p-2 hover:bg-indigo-500"
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar.mutate(e.target.files[0])}
            />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Display name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Email</label>
              <Input value={profile?.email || ''} disabled className="opacity-60" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Role</label>
              <Input value={profile?.role || 'member'} disabled className="opacity-60 capitalize" />
            </div>
            {message && <p className="text-sm text-emerald-400">{message}</p>}
            <Button onClick={() => updateProfile.mutate()} loading={updateProfile.isPending}>
              Save changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
