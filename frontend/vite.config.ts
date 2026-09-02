import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Allows tunnels (ngrok, etc.) to reach the dev server despite their Host header not matching localhost.
    allowedHosts: true,
    watch: {
      usePolling: true
    }
  }
});
