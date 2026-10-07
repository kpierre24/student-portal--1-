import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['hteim_logo.svg', 'hteim_logo.png', 'icon.png'],
        manifest: {
          id: '/',
          name: 'HTEIM School of Ministry',
          short_name: 'HTEIM',
          description: 'Educational portal for the HTEIM School of Ministry.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/hteim_logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/hteim_logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/hteim_logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
        'react': path.resolve(rootDir, 'node_modules/react'),
        'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: true,
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com; connect-src 'self' https://*.supabase.co https://*.googleapis.com https://*.firebaseio.com https://*.google.com wss: ws:; media-src 'self' blob: data: https://*.youtube.com https://*.vimeo.com; frame-src 'self' https://*.youtube.com https://*.vimeo.com; object-src 'none'; base-uri 'self'; form-action 'self';",
      },
    },
    preview: {
      host: true,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com; connect-src 'self' https://*.supabase.co https://*.googleapis.com https://*.firebaseio.com https://*.google.com wss: ws:; media-src 'self' blob: data: https://*.youtube.com https://*.vimeo.com; frame-src 'self' https://*.youtube.com https://*.vimeo.com; object-src 'none'; base-uri 'self'; form-action 'self';",
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('pdfjs-dist') || id.includes('jspdf') || id.includes('html2canvas') || id.includes('mammoth') || id.includes('jszip')) {
                return 'vendor-documents';
              }
              if (id.includes('video.js')) {
                return 'vendor-media';
              }
              if (id.includes('firebase') || id.includes('@supabase')) {
                return 'vendor-cloud';
              }
            }
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
    },
  };
});
