
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['src/main.jsx'],
            refresh: true,
            buildDirectory: 'build',
        }),
        react(),
    ],
    server: {
        port: 5173,
        host: 'localhost',
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
