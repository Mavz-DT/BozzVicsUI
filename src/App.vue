<script setup>
import { onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import { useSettingsStore } from './stores/settings'

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.fetchSettings()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-100">
    <Navbar />
    
    <!-- Dito papasok ang iba't ibang pages (POS, Login, Reports) depende sa URL -->
    <main class="flex-1 min-h-0 overflow-hidden">
      <router-view></router-view>
    </main>
  </div>
</template>