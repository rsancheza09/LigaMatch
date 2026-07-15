import { config } from 'dotenv';
import { resolve } from 'path';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CORS_ORIGIN?: string;
      DATABASE_URL?: string;
      ENV?: string;
      HOST?: string;
      PORT?: string;
      OPENAI_API_KEY?: string;
      OPENAI_MODEL?: string;
    }
  }
}

config({ path: resolve(__dirname, '.env'), quiet: true });
