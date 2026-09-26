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
  <div
    class="h-full flex items-center justify-center bg-gray-100 p-4 pt-20"
  >
    <div
      class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
    >
      <div
        class="text-center mb-8"
      >
        <h2
          class="text-3xl font-black text-blue-800"
        >
          {{ settingsStore.businessName }}
        </h2>

        <p
          class="text-gray-500 font-medium mt-2"
        >
          {{
            settingsStore.businessSubtitle ||
            'Mag-login para makapagsimula'
          }}
        </p>
      </div>

      <form
        @submit.prevent="handleLogin"
        class="space-y-5"
      >
        <div
          v-if="errorMessage"
          class="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold text-center"
        >
          {{ errorMessage }}
        </div>

        <div>
          <label
            class="block text-gray-700 font-bold mb-2"
          >
            Username
          </label>

          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label
            class="block text-gray-700 font-bold mb-2"
          >
            Password
          </label>

          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors shadow-md mt-4"
        >
          Login
        </button>
      </form>
    </div>
  </div>
</template>