<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

const isLoading = ref(true)
const settingsStore = useSettingsStore()
const isSaving = ref(false)
const error = ref('')
const success = ref('')

const settings = ref({
  businessName: '',
  businessSubtitle: '',
  themeColor: '#7f1d1d'
})

const fetchSettings = async () => {
  try {
    isLoading.value = true
    error.value = ''

    await settingsStore.fetchSettings()

    settings.value = {
      businessName: settingsStore.businessName,
      businessSubtitle: settingsStore.businessSubtitle,
      themeColor: settingsStore.themeColor
    }
  } catch (err) {
    console.error('Error fetching settings:', err)
    error.value = 'Hindi makuha ang system settings.'
  } finally {
    isLoading.value = false
  }
}

const saveSettings = async () => {
  if (!settings.value.businessName.trim()) {
    error.value = 'Required ang Business Name.'
    return
  }

  try {
    isSaving.value = true
    error.value = ''
    success.value = ''

    const updated = await settingsStore.updateSettings({
      businessName: settings.value.businessName.trim(),
      businessSubtitle: settings.value.businessSubtitle.trim(),
      themeColor: settings.value.themeColor
    })

    settings.value = {
      businessName: updated.businessName || '',
      businessSubtitle: updated.businessSubtitle || '',
      themeColor: updated.themeColor || '#7f1d1d'
    }

    success.value = 'Settings saved successfully!'

    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err) {
    console.error('Error saving settings:', err)

    error.value =
      err.response?.data?.message ||
      'Hindi ma-save ang system settings.'
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <div class="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

    <div>
      <h1 class="text-2xl font-black text-gray-800">
        System Settings
      </h1>

      <p class="text-gray-500 mt-1">
        I-customize ang pangalan at appearance ng POS system.
      </p>
    </div>

    <div
      v-if="isLoading"
      class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500"
    >
      Loading settings...
    </div>

    <div
      v-else
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >

      <div class="bg-gray-800 text-white px-5 py-4">
        <h2 class="font-bold text-lg">
          Business Information
        </h2>
      </div>

      <div class="p-5 space-y-5">

        <div
          v-if="error"
          class="bg-red-100 text-red-700 p-3 rounded-lg text-sm font-medium"
        >
          {{ error }}
        </div>

        <div
          v-if="success"
          class="bg-green-100 text-green-700 p-3 rounded-lg text-sm font-medium"
        >
          {{ success }}
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">
            Business Name
          </label>

          <input
            v-model="settings.businessName"
            type="text"
            placeholder="e.g. BOZZ VIC'S LOMI HOUSE"
            class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">
            Business Subtitle
          </label>

          <input
            v-model="settings.businessSubtitle"
            type="text"
            placeholder="e.g. Point of Sale System"
            class="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Theme Color
          </label>

          <div class="flex items-center gap-3">
            <input
              v-model="settings.themeColor"
              type="color"
              class="w-14 h-10 border border-gray-300 rounded-lg cursor-pointer"
            />

            <input
              v-model="settings.themeColor"
              type="text"
              class="flex-1 border border-gray-300 rounded-lg p-3 font-mono outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#7f1d1d"
            />
          </div>
        </div>

        <div
          class="rounded-xl p-4 border"
          :style="{
            borderColor: settings.themeColor
          }"
        >
          <p class="text-sm text-gray-500 mb-2">
            Preview
          </p>

          <div
            class="text-white rounded-lg px-4 py-3 font-bold"
            :style="{
              backgroundColor: settings.themeColor
            }"
          >
            {{ settings.businessName || "Your Business Name" }}
          </div>
        </div>

        <div class="pt-2">
          <button
            @click="saveSettings"
            :disabled="isSaving"
            class="px-5 py-3 rounded-lg text-white font-bold shadow-md disabled:bg-gray-300"
            :style="{
              backgroundColor: isSaving ? '#d1d5db' : settings.themeColor
            }"
          >
            {{ isSaving ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>