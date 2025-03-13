import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Add xlsx files to the assetsInclude array
  assetsInclude: ['**/*.xlsx'],
  // Optional: Define resolve aliases for easier imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});