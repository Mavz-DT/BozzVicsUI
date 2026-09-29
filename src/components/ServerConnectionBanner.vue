<script setup>
import {
  serverConnectionState,
  serverConnectionMessage
} from '../services/serverConnectionMonitor'
</script>

<template>
  <div
    v-if="
      serverConnectionState === 'connecting' ||
      serverConnectionState === 'waking' ||
      serverConnectionState === 'offline' ||
      serverConnectionState === 'error' ||
      serverConnectionState === 'connected'
    "
    class="fixed top-0 inset-x-0 z-[9998] px-3 py-2 sm:px-5"
  >
    <div
      class="mx-auto max-w-4xl rounded-xl border shadow-lg bg-white"
      :class="{
        'border-blue-200': serverConnectionState === 'connecting',
        'border-amber-200': serverConnectionState === 'waking',
        'border-red-200':
          serverConnectionState === 'offline' ||
          serverConnectionState === 'error',
        'border-emerald-200':
          serverConnectionState === 'connected'
      }"
    >
      <div
        class="flex items-center gap-3 px-4 py-3"
      >

        <!-- CONNECTING / WAKING SPINNER -->
        <div
          v-if="
            serverConnectionState === 'connecting' ||
            serverConnectionState === 'waking'
          "
          class="w-8 h-8 shrink-0 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"
        ></div>

        <!-- OFFLINE ICON -->
        <div
          v-else-if="
            serverConnectionState === 'offline'
          "
          class="w-8 h-8 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black"
        >
          !
        </div>

        <!-- ERROR ICON -->
        <div
          v-else-if="
            serverConnectionState === 'error'
          "
          class="w-8 h-8 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black"
        >
          !
        </div>

        <!-- CONNECTED ICON -->
        <div
          v-else-if="
            serverConnectionState === 'connected'
          "
          class="w-8 h-8 shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black"
        >
          ✓
        </div>

        <!-- MESSAGE -->
        <div
          class="min-w-0 flex-1"
        >
          <p
            v-if="
              serverConnectionState === 'connecting'
            "
            class="font-black text-blue-800"
          >
            Connecting to server...
          </p>

          <p
            v-else-if="
              serverConnectionState === 'waking'
            "
            class="font-black text-amber-800"
          >
            Server is waking up...
          </p>

          <p
            v-else-if="
              serverConnectionState === 'offline'
            "
            class="font-black text-red-800"
          >
            No internet connection
          </p>

          <p
            v-else-if="
              serverConnectionState === 'error'
            "
            class="font-black text-red-800"
          >
            Server connection problem
          </p>

          <p
            v-else-if="
              serverConnectionState === 'connected'
            "
            class="font-black text-emerald-800"
          >
            Server connected
          </p>

          <p
            class="text-xs mt-0.5"
            :class="{
              'text-blue-700':
                serverConnectionState === 'connecting',

              'text-amber-700':
                serverConnectionState === 'waking',

              'text-red-700':
                serverConnectionState === 'offline' ||
                serverConnectionState === 'error',

              'text-emerald-700':
                serverConnectionState === 'connected'
            }"
          >
            {{
              serverConnectionMessage
            }}
          </p>
        </div>

      </div>
    </div>
  </div>
</template>