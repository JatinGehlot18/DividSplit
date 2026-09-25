import { Platform } from 'react-native';
import Config from 'react-native-config';

type Env = 'dev' | 'staging' | 'prod';

// Dev has no backend deployed — it talks to whatever server you're running
// locally, so .env.dev intentionally leaves API_URL blank.
const LOCAL_API_URL = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:4000`;

function assertEnv(value: string | undefined): Env {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'dev' || normalized === 'staging' || normalized === 'prod') return normalized;
  throw new Error(`Invalid or missing ENV (got "${value}"). Run with ENVFILE=.env.dev|.env.staging|.env.prod.`);
}

const env = assertEnv(Config.ENV);

if (env !== 'dev' && !Config.API_URL) {
  throw new Error(`API_URL is missing from .env.${env} — refusing to start against an unset backend.`);
}

export const AppConfig = {
  env,
  apiUrl: Config.API_URL || LOCAL_API_URL,
  enableLogs: Config.ENABLE_LOGS === 'true',
  // Not yet set for staging/prod — see .env.dev. Google sign-in is disabled
  // wherever this is unset (src/auth/googleAuth.ts).
  googleClientId: Config.GOOGLE_CLIENT_ID || undefined,
};
