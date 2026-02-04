import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:4000', // local nest app
                changeOrigin: true,
            },
            '/.well-known': {
                target: 'http://localhost:4000', // local nest app
                changeOrigin: true,
            },
            '/admin': {
                target: 'http://localhost:5174', // local admin dashboard
                changeOrigin: true,
            },
        },
    },
});

