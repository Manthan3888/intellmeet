import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client | null {
  if (!config.googleClientId) return null;
  if (!client) client = new OAuth2Client(config.googleClientId);
  return client;
}

export async function verifyGoogleToken(idToken: string): Promise<{ email: string; name: string; picture?: string } | null> {
  const oauth = getClient();
  if (!oauth) return null;

  const ticket = await oauth.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) return null;

  return {
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
  };
}
