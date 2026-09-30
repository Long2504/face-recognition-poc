import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', 'VITE_');
  return {
    plugins: [react()],
    envDir: '..',
    publicDir: '../models',
    server: { port: 5174, strictPort: true },
    define: { __APP_API_URL__: JSON.stringify(env.VITE_API_URL ?? 'http://localhost:3000') },
  };
});
