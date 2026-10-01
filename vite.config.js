import {
  defineConfig,
  loadEnv
} from 'vite'

import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(
  ({ mode }) => {
    const env =
      loadEnv(
        mode,
        process.cwd(),
        ''
      )

    const apiUrl =
      env.VITE_API_URL ||
      'http://localhost:5000'

    return {
      plugins: [
        vue(),
        tailwindcss(),

        VitePWA({
          // 'prompt' = hindi auto-update; magpapakita tayo ng banner
          // na may "I-update" button (tingnan ang PwaUpdatePrompt.vue).
          registerType: 'prompt',

          // Ang registration ay ginagawa ng useRegisterSW sa component,
          // kaya huwag nang mag-auto-inject para iisang beses lang.
          injectRegister: false,

          workbox: {
            // Linisin ang lumang precache pagkatapos mag-update.
            cleanupOutdatedCaches: true
          },

          manifest: {
            name: "Bozz Vic's POS",
            short_name: "Bozz Vic's POS",

            description:
              'Restaurant Point-of-Sale System',

            start_url: '/',
            scope: '/',

            display: 'standalone',

            background_color: '#ffffff',
            theme_color: '#1d4ed8',

            lang: 'en',

            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],

      server: {
        proxy: {
          '/api': {
            target:
              apiUrl,

            changeOrigin:
              true,

            secure:
              false
          }
        }
      }
    }
  }
)