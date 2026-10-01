<script setup>
/*
|--------------------------------------------------------------------------
| PWA Update Prompt
|--------------------------------------------------------------------------
|
| Nagpapakita ng banner kapag may bagong bersyon ng app na na-deploy.
| I-click ang "I-update" para i-activate ang bagong version at
| awtomatikong mag-reload.
|
| TANDAAN: lalabas lang ang banner kapag may mas BAGONG deploy kaysa sa
| kasalukuyang naka-install. Ang pag-delete/reinstall ay kinukuha agad
| ang pinakabago, kaya walang ipapakitang update doon.
|
| Para siguradong madetect agad ang bagong deploy, nagche-check tayo:
|   - sa pag-load / pag-register ng SW
|   - tuwing babalik ang focus sa app (visibilitychange)
|   - tuwing 30 minuto (para sa tab na buong araw bukas)
|
| Nag-lo-log din sa console (DevTools) para ma-verify ang estado.
|--------------------------------------------------------------------------
*/

import { onBeforeUnmount, watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const UPDATE_CHECK_INTERVAL =
  30 * 60 * 1000 // 30 minuto

let swRegistration = null
let intervalId = null

const checkForUpdate = () => {
  if (swRegistration) {
    swRegistration.update().catch(() => {})
  }
}

const onVisible = () => {
  if (document.visibilityState === 'visible') {
    checkForUpdate()
  }
}

const {
  needRefresh,
  updateServiceWorker
} = useRegisterSW({
  immediate: true,

  onRegisteredSW(swUrl, registration) {
    console.log('[PWA] Service worker registered:', swUrl)

    if (!registration) {
      return
    }

    swRegistration = registration

    // Agad na check sa pag-register.
    checkForUpdate()

    // Periodic check.
    intervalId = setInterval(
      checkForUpdate,
      UPDATE_CHECK_INTERVAL
    )

    // Check tuwing babalik ang user sa app.
    document.addEventListener(
      'visibilitychange',
      onVisible
    )
  },

  onRegisterError(error) {
    console.error('[PWA] Service worker registration error:', error)
  }
})

// Para makita sa DevTools console kung kailan may update.
watch(
  needRefresh,
  value => {
    console.log('[PWA] needRefresh =', value)
  }
)

const applyUpdate = () => {
  updateServiceWorker(true)
}

const dismiss = () => {
  needRefresh.value = false
}

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }

  document.removeEventListener(
    'visibilitychange',
    onVisible
  )
})
</script>

<template>
  <transition name="pwa-slide">
    <div
      v-if="needRefresh"
      class="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-4 pb-4 pointer-events-none"
    >
      <div
        class="pointer-events-auto w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-2xl p-4 flex items-center gap-3"
      >
        <div
          class="shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl"
        >
          ⬆️
        </div>

        <div class="flex-1 min-w-0">
          <div class="font-bold text-gray-800">
            May bagong update
          </div>
          <div class="text-sm text-gray-500">
            May mas bagong bersyon ng app. I-click ang I-update.
          </div>
        </div>

        <button
          type="button"
          @click="dismiss"
          class="shrink-0 text-sm text-gray-400 hover:text-gray-600 px-2 py-2"
        >
          Mamaya
        </button>

        <button
          type="button"
          @click="applyUpdate"
          class="shrink-0 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
        >
          I-update
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.pwa-slide-enter-active,
.pwa-slide-leave-active {
  transition: all 0.25s ease;
}

.pwa-slide-enter-from,
.pwa-slide-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style>
