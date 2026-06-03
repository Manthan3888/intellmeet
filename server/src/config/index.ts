import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/intellmeet',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'intellmeet-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'intellmeet-refresh-secret-change-me',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};
