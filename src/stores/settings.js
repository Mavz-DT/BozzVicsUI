import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useSettingsStore = defineStore('settings', () => {
  const businessName = ref("BOZZ VIC'S LOMI HOUSE")
  const businessSubtitle = ref('Point of Sale System')
  const themeColor = ref('#7f1d1d')
  const isLoaded = ref(false)

  const applyTheme = () => {
    document.documentElement.style.setProperty(
      '--theme-color',
      themeColor.value
    )
  }

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings')

      businessName.value =
        res.data.businessName || "BOZZ VIC'S LOMI HOUSE"

      businessSubtitle.value =
        res.data.businessSubtitle || 'Point of Sale System'

      themeColor.value =
        res.data.themeColor || '#7f1d1d'

      applyTheme()
      isLoaded.value = true
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const updateSettings = async (data) => {
    const res = await axios.put('/api/settings', data)

    businessName.value =
      res.data.businessName || businessName.value

    businessSubtitle.value =
      res.data.businessSubtitle || businessSubtitle.value

    themeColor.value =
      res.data.themeColor || themeColor.value

    applyTheme()
    isLoaded.value = true

    return res.data
  }

  return {
    businessName,
    businessSubtitle,
    themeColor,
    isLoaded,
    fetchSettings,
    updateSettings,
    applyTheme
  }
})