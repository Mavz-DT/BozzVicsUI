<script setup>
import {
  ref,
  onMounted
} from 'vue'

import { useRouter } from 'vue-router'

import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

import {
  serverConnectionState,
  serverConnectionMessage
} from '../services/serverConnectionMonitor'

const router = useRouter()

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)

const errorMessage = ref('')

const isCheckingServer =
  ref(false)

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')


// =====================================================
// SERVER CONNECTION CHECK
// =====================================================

const checkServerConnection =
  async () => {

    if (
      isCheckingServer.value
    ) {
      return
    }

    isCheckingServer.value =
      true

    serverConnectionState.value =
      'connecting'

    serverConnectionMessage.value =
      'Connecting to server...'

    const controller =
      new AbortController()

    const timeoutId =
      setTimeout(() => {

        controller.abort()

      }, 60000)


    try {

      /*
      |--------------------------------------------------------------------------
      | SERVER PING
      |--------------------------------------------------------------------------
      |
      | /api is used only to confirm that the backend server
      | can be reached.
      |
      | Kahit 404/401/403 ang response, ibig sabihin reachable
      | ang server. Ang importante dito ay may HTTP response.
      |
      |--------------------------------------------------------------------------
      */

      const response =
        await fetch(
          `${API_BASE_URL}/api/health`,
          {
            method: 'GET',

            cache: 'no-store',

            signal:
              controller.signal
          }
        )


      /*
      |--------------------------------------------------------------------------
      | SERVER REACHED
      |--------------------------------------------------------------------------
      */

      if (
        response
      ) {

        serverConnectionState.value =
          'connected'

        serverConnectionMessage.value =
          'Connected to server.'

        return
      }

    } catch (error) {

      console.error(
        'Server connection check error:',
        error
      )


      if (
        navigator.onLine === false
      ) {

        serverConnectionState.value =
          'offline'

        serverConnectionMessage.value =
          'No internet connection.'

      } else {

        serverConnectionState.value =
          'error'

        serverConnectionMessage.value =
          'Unable to connect to server.'

      }

    } finally {

      clearTimeout(
        timeoutId
      )

      isCheckingServer.value =
        false
    }
  }


// =====================================================
// LOGIN
// =====================================================

const handleLogin =
  async () => {

    errorMessage.value = ''

    try {

      const response =
        await fetch(
          `${API_BASE_URL}/api/auth/login`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              username:
                username.value,

              password:
                password.value
            })
          }
        )


      const data =
        await response.json()


      if (
        !response.ok
      ) {

        throw {
          response: {
            data
          }
        }
      }


      /*
      |--------------------------------------------------------------------------
      | LOGIN SUCCESS
      |--------------------------------------------------------------------------
      */

      authStore.login(
        data
      )

      router.push('/pos')

    } catch (error) {

      console.error(
        'Login error:',
        error
      )

      errorMessage.value =
        error.response?.data?.message ||
        'May problema sa server.'
    }
  }


// =====================================================
// INITIAL SERVER CHECK
// =====================================================

onMounted(() => {

  checkServerConnection()

})
</script>


<template>

  <!-- Background -->

  <div
    class="min-h-screen flex flex-col items-center justify-center relative bg-cover bg-center px-4"
    style="background-image: url('/bg.png');"
  >

    <!-- Overlay -->

    <div
      class="absolute inset-0 bg-black/40"
    ></div>


    <!-- Glassmorphism Container -->

    <div
      class="relative z-10 bg-white/10 backdrop-blur-md border border-white/30 p-6 sm:p-10 rounded-[2rem] shadow-2xl w-full max-w-md text-white"
    >

      <!-- Header -->

      <div
        class="text-center mb-6 sm:mb-8"
      >

        <h2
          class="text-3xl font-bold tracking-wide"
        >
          {{
            settingsStore.businessName ||
            'Login'
          }}
        </h2>


        <p
          class="text-white/80 font-medium mt-2"
        >
          {{
            settingsStore.businessSubtitle ||
            'Mag-login para makapagsimula'
          }}
        </p>


        <!-- ================================================= -->
        <!-- SERVER CONNECTION STATUS -->
        <!-- ================================================= -->

        <div
          class="mt-5 flex flex-col items-center gap-3"
        >

          <!-- Status -->

          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold backdrop-blur-sm"
            :class="{

              'bg-blue-500/20 border-blue-300/40 text-blue-100':
                serverConnectionState ===
                'checking',

              'bg-blue-500/20 border-blue-300/40 text-blue-100':
                serverConnectionState ===
                'connecting',

              'bg-amber-500/20 border-amber-300/40 text-amber-100':
                serverConnectionState ===
                'waking',

              'bg-emerald-500/20 border-emerald-300/40 text-emerald-100':
                serverConnectionState ===
                'connected',

              'bg-red-500/20 border-red-300/40 text-red-100':
                serverConnectionState ===
                'offline',

              'bg-red-500/20 border-red-300/40 text-red-100':
                serverConnectionState ===
                'error'
            }"
          >

            <!-- Status Dot -->

            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              :class="{

                'bg-blue-300 animate-pulse':
                  serverConnectionState ===
                  'checking',

                'bg-blue-300 animate-pulse':
                  serverConnectionState ===
                  'connecting',

                'bg-amber-300 animate-pulse':
                  serverConnectionState ===
                  'waking',

                'bg-emerald-300':
                  serverConnectionState ===
                  'connected',

                'bg-red-300':
                  serverConnectionState ===
                  'offline',

                'bg-red-300':
                  serverConnectionState ===
                  'error'
              }"
            ></span>


            <!-- Status Label -->

            <span>

              {{
                serverConnectionState ===
                'checking'
                  ? 'Checking server...'
                  : serverConnectionState ===
                    'connecting'
                    ? 'Connecting to server...'
                    : serverConnectionState ===
                      'waking'
                      ? 'Server is waking up...'
                      : serverConnectionState ===
                        'connected'
                        ? 'Server connected'
                        : serverConnectionState ===
                          'offline'
                          ? 'No internet connection'
                          : 'Server connection problem'
              }}

            </span>

          </div>


          <!-- Connection Message -->

          <p
            class="text-[11px] text-white/70 text-center"
          >
            {{
              serverConnectionMessage
            }}
          </p>


          <!-- Connect Button -->

          <button
            type="button"
            @click="
              checkServerConnection
            "
            :disabled="
              isCheckingServer
            "
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >

            <!-- Spinner -->

            <span
              v-if="
                isCheckingServer
              "
              class="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
            ></span>

            <!-- Button Text -->

            <span>
              {{
                isCheckingServer
                  ? 'Connecting...'
                  : 'Connect to Server'
              }}
            </span>

          </button>

        </div>

      </div>


      <form
        @submit.prevent="
          handleLogin
        "
        class="space-y-6"
      >

        <!-- Error Message -->

        <div
          v-if="errorMessage"
          class="p-3 bg-red-500/80 text-white rounded-lg text-sm font-bold text-center"
        >
          {{
            errorMessage
          }}
        </div>


        <!-- Username -->

        <div
          class="relative"
        >

          <input
            v-model="username"
            type="text"
            required
            placeholder="Username"
            autocomplete="username"
            class="w-full bg-transparent border-0 border-b-2 border-white/50 text-white placeholder-white/80 py-2 pr-2 focus:ring-0 focus:border-white outline-none transition-colors"
          />

        </div>


        <!-- Password -->

        <div
          class="relative pt-4"
        >

          <input
            v-model="password"
            :type="
              showPassword
                ? 'text'
                : 'password'
            "
            required
            placeholder="Password"
            autocomplete="current-password"
            class="w-full bg-transparent border-0 border-b-2 border-white/50 text-white placeholder-white/80 py-2 pr-10 focus:ring-0 focus:border-white outline-none transition-colors"
          />


          <!-- Show / Hide Password -->

          <button
            type="button"
            @click="
              showPassword =
                !showPassword
            "
            class="absolute right-1 bottom-2 text-white/70 hover:text-white transition-colors cursor-pointer"
            :aria-label="
              showPassword
                ? 'Hide password'
                : 'Show password'
            "
            :title="
              showPassword
                ? 'Hide password'
                : 'Show password'
            "
          >

            <!-- Eye Open -->

            <svg
              v-if="!showPassword"
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >

              <path
                d="M2.062 12.348a1 1 0 0 1 0-.696C3.772 7.562 7.523 5 12 5s8.228 2.562 9.938 6.652a1 1 0 0 1 0 .696C20.228 16.438 16.477 19 12 19s-8.228-2.562-9.938-6.652Z"
              />

              <circle
                cx="12"
                cy="12"
                r="3"
              />

            </svg>


            <!-- Eye Off -->

            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >

              <path
                d="M3.53 3.53 20.47 20.47"
              />

              <path
                d="M10.58 10.58a2 2 0 0 0 2.83 2.83"
              />

              <path
                d="M9.88 5.09A10.94 10.94 0 0 1 12 5c4.477 0 8.228 2.562 9.938 6.652a1 1 0 0 1 0 .696 10.96 10.96 0 0 1-4.138 4.744"
              />

              <path
                d="M6.61 6.61A10.96 10.96 0 0 0 2.062 11.652a1 1 0 0 0 0 .696C3.772 16.438 7.523 19 12 19a10.94 10.94 0 0 0 5.39-1.39"
              />

            </svg>

          </button>

        </div>


        <!-- Login Button -->

        <div
          class="pt-4"
        >

          <button
            type="submit"
            class="w-full bg-white text-gray-900 py-3 rounded-full font-bold text-lg hover:bg-gray-200 transition-colors shadow-md"
          >
            Login
          </button>

        </div>


        <!-- Copyright -->

        <div
          class="pt-2 text-center text-white/70 text-xs sm:text-sm font-medium tracking-wide"
        >
          © 2026 Designed by: RDT Systems
        </div>

      </form>

    </div>

  </div>

</template>