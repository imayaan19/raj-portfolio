import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // Don't crash for optional Google keys in dev — warn instead.
    console.warn(`[env] Missing ${name}`);
    return '';
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:4000/api/gmail/callback',
    postConnectRedirect:
      process.env.GMAIL_POST_CONNECT_REDIRECT ||
      'http://localhost:4000/api/gmail/connected',
  },

  gmailKeywords: (process.env.GMAIL_KEYWORDS || 'feedback,evaluation,survey,deadline')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean),
};
