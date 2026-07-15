import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from the root of jobhunt.blackhartconsulting.com, so base is '/'.
// In dev, proxy the API to the Express server on :8080 so the SPA and API
// share an origin the way they do in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
