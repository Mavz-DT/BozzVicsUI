<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

import Navbar from './components/Navbar.vue'
import SessionExpiredBanner from './components/SessionExpiredBanner.vue'
import PwaUpdatePrompt from './components/PwaUpdatePrompt.vue'

import { useSettingsStore } from './stores/settings'

const route = useRoute()
const settingsStore = useSettingsStore()

const hideNavbar = () => {
  return route.path === '/login'
}

onMounted(() => {
  // Existing settings loading
  settingsStore.fetchSettings()
})
</script>

<template>
  <div
    class="min-h-screen flex flex-col bg-gray-100"
  >
    <Navbar
      v-if="!hideNavbar()"
    />

    <!-- Session Expired Banner -->
    <SessionExpiredBanner
      v-if="!hideNavbar()"
    />

    <!-- Dito papasok ang iba't ibang pages -->
    <main
      class="flex-1 min-h-0 overflow-hidden"
    >
      <router-view />
    </main>

    <!-- Global PWA update banner -->
    <PwaUpdatePrompt />
  </div>
</template>