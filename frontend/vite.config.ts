import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: { host: true, port: Number(process.env.PORT_FRONTEND) || 5173 },
  plugins: [react()],
});
