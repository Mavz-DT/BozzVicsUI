import { createApp } from 'vue'
import { createPinia } from 'pinia'

import router from './router'
import './style.css'
import App from './App.vue'

import {
  initServerConnectionMonitor
} from './services/serverConnectionMonitor'

const app = createApp(App)
const pinia = createPinia()

// =====================================================
// GLOBAL SERVER CONNECTION MONITOR
// =====================================================
//
// Initialize BEFORE mounting the Vue app so that
// API requests made during page initialization are
// already monitored.
// =====================================================

initServerConnectionMonitor()

app.use(pinia)
app.use(router)

app.mount('#app')