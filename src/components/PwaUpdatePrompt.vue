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
| Nagche-check din tuwing 1 oras para sa mga tab na buong araw bukas
| (tulad ng POS), para hindi sila ma-stuck sa lumang bersyon.
|--------------------------------------------------------------------------
*/

import { useRegisterSW } from 'virtual:pwa-register/vue'

const UPDATE_CHECK_INTERVAL =
  60 * 60 * 1000 // 1 oras

const {
  needRefresh,
  updateServiceWorker
} = useRegisterSW({
  onRegisteredSW(swUrl, registration) {
    if (!registration) {
      return
    }

    setInterval(() => {
      registration.update()
    }, UPDATE_CHECK_INTERVAL)
  }
})

const applyUpdate = () => {
  // true = i-reload ang page pagkatapos i-activate ang bagong SW.
  updateServiceWorker(true)
}

const dismiss = () => {
  needRefresh.value = false
}
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
