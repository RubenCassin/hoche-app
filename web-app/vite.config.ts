import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// App web HOCHE dédiée (desktop + mobile). Servie par le backend sous /app/ ;
// build sorti dans backend/webapp pour partir avec `railway up`.
export default defineConfig({
  plugins: [react()],
  base: '/app/',
  build: {
    outDir: '../backend/webapp',
    emptyOutDir: true,
  },
  server: { port: 5180 },
});
