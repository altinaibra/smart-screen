import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = 'http://localhost:5080';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/uploads': backend,
      '/player': backend,
      '/downloads': backend,
    },
  },
  build: {
    // Build-i vendoset te backend-i, që .NET ta shërbejë direkt në http://localhost:5080/
    outDir: '../backend/SmartScreen.Api/wwwroot/app',
    emptyOutDir: true,
  },
});
