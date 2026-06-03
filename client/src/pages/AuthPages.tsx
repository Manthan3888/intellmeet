import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader } from '@/components/ui/Card';
import { Video } from 'lucide-react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => api<{ user: { id: string; name: string; email: string; role: string }; accessToken: string; refreshToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    onSuccess: (data) => {
      setAuth({ id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role }, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <Video className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardHeader title="Welcome back" description="Sign in to your IntellMeet account" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            mutation.mutate();
          }}
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" loading={mutation.isPending}>
            Sign in
          </Button>
        </form>
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-500">or</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>
        <GoogleSignInButton />
        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-indigo-400 hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () =>
      api<{ user: { id: string; name: string; email: string; role: string }; accessToken: string; refreshToken: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    onSuccess: (data) => {
      setAuth({ id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role }, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <Video className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardHeader title="Create account" description="Start collaborating with IntellMeet" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            mutation.mutate();
          }}
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" />
          </div>
          <Button type="submit" className="w-full" loading={mutation.isPending}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
