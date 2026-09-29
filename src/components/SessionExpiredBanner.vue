<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router =
  useRouter()

const authStore =
  useAuthStore()

const handleReLogin = () => {
  authStore.logout()

  router.push('/login')
}
</script>

<template>
  <div
    v-if="authStore.sessionExpired"
    class="fixed top-0 inset-x-0 z-[9999] px-3 py-3 sm:px-5"
  >
    <div
      class="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 shadow-xl"
    >
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4"
      >

        <!-- MESSAGE -->
        <div
          class="flex items-start gap-3 min-w-0"
        >
          <div
            class="w-10 h-10 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-lg"
          >
            !
          </div>

          <div
            class="min-w-0"
          >
            <p
              class="font-black text-red-800"
            >
              Login Session Expired
            </p>

            <p
              class="text-sm text-red-700 mt-0.5"
            >
              Kailangan mong mag-logout at mag-login ulit para magpatuloy sa POS.
            </p>
          </div>
        </div>

        <!-- ACTION -->
        <button
          type="button"
          @click="handleReLogin"
          class="shrink-0 min-h-[44px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black shadow-sm transition"
        >
          Logout &amp; Re-login
        </button>

      </div>
    </div>
  </div>
</template>