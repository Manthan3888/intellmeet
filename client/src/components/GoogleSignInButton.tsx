import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function GoogleSignInButton() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) return null;

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    const data = await api<{
      user: { id: string; name: string; email: string; role: string; avatar?: string };
      accessToken: string;
      refreshToken: string;
    }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: response.credential }),
    });
    setAuth(
      { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, avatar: data.user.avatar },
      data.accessToken,
      data.refreshToken
    );
    navigate('/dashboard');
  };

  return (
    <div className="flex justify-center">
      <GoogleLogin onSuccess={handleSuccess} onError={() => undefined} theme="filled_black" size="large" width="100%" />
    </div>
  );
}
