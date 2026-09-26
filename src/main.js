import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia) // Ito ang kulang, idinidikit natin ang Pinia sa App
app.use(router)
app.mount('#app')