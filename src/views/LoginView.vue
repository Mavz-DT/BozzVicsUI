<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)

const errorMessage = ref('')

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const handleLogin = async () => {
  errorMessage.value = ''

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/login`,
      {
        username: username.value,
        password: password.value
      }
    )

    // I-save ang user data sa Pinia
    authStore.login(response.data)

    // Ilipat ang user sa POS page
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
</script>

<template>
  <!-- Background -->
  <div
    class="min-h-screen flex flex-col items-center justify-center relative bg-cover bg-center px-4"
    style="background-image: url('/bg.png');"
  >
    <!-- Overlay -->
    <div class="absolute inset-0 bg-black/40"></div>

    <!-- Glassmorphism Container -->
    <div
      class="relative z-10 bg-white/10 backdrop-blur-md border border-white/30 p-6 sm:p-10 rounded-[2rem] shadow-2xl w-full max-w-md text-white"
    >
      <!-- Header -->
      <div class="text-center mb-8 sm:mb-10">
        <h2 class="text-3xl font-bold tracking-wide">
          {{ settingsStore.businessName || 'Login' }}
        </h2>

        <p class="text-white/80 font-medium mt-2">
          {{ settingsStore.businessSubtitle || 'Mag-login para makapagsimula' }}
        </p>
      </div>

      <form
        @submit.prevent="handleLogin"
        class="space-y-6"
      >
        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-500/80 text-white rounded-lg text-sm font-bold text-center"
        >
          {{ errorMessage }}
        </div>

        <!-- Username -->
        <div class="relative">
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
        <div class="relative pt-4">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            placeholder="Password"
            autocomplete="current-password"
            class="w-full bg-transparent border-0 border-b-2 border-white/50 text-white placeholder-white/80 py-2 pr-10 focus:ring-0 focus:border-white outline-none transition-colors"
          />

          <!-- Show / Hide Password -->
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-1 bottom-2 text-white/70 hover:text-white transition-colors cursor-pointer"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :title="showPassword ? 'Hide password' : 'Show password'"
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
        <div class="pt-4">
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