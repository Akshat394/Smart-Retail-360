import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.loca.lt',
      '.ngrok.io',
      '.serveo.net',
      '.tunnelto.dev',
      '.loca.lt',
      'tricky-hornets-stare.loca.lt',
      'public-cooks-sip.loca.lt',
      'large-boxes-wear.loca.lt',
      'afraid-lies-juggle.loca.lt',
      'two-plants-mix.loca.lt'
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'leaflet';
            }
            if (id.includes('lucide-react')) {
              return 'lucide';
            }
            if (id.includes('mapbox-gl')) {
              return 'mapbox';
            }
            if (id.includes('@vis.gl')) {
              return 'google-maps';
            }
            return 'vendor';
          }
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
