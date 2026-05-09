import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:4000',
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:5173',
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR || './data'),
  modelRegistryJson: process.env.MODEL_REGISTRY_JSON || '',
  textModelRegistryJson: process.env.TEXT_MODEL_REGISTRY_JSON || '',
  imageModelRegistryJson: process.env.IMAGE_MODEL_REGISTRY_JSON || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
};
