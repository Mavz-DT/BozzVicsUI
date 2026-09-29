import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { getCachedSettings } from '../db/posDatabase'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API =
  `${API_BASE_URL}/api`

export const useSettingsStore =
  defineStore(
    'settings',
    () => {
      const businessName =
        ref(
          "BOZZ VIC'S LOMI HOUSE"
        )

      const businessSubtitle =
        ref(
          'Point of Sale System'
        )

      const themeColor =
        ref(
          '#7f1d1d'
        )

      /*
      |--------------------------------------------------------------------------
      | OFFLINE CACHING
      |--------------------------------------------------------------------------
      |
      | Admin controls whether the POS is allowed to use
      | local cached data for future offline operation.
      |
      | Default is OFF.
      |--------------------------------------------------------------------------
      */

      const offlineCachingEnabled =
        ref(false)

      const isLoaded =
        ref(false)

      /*
      |--------------------------------------------------------------------------
      | APPLY THEME
      |--------------------------------------------------------------------------
      */

      const applyTheme = () => {
        document.documentElement.style.setProperty(
          '--theme-color',
          themeColor.value
        )
      }

      /*
      |--------------------------------------------------------------------------
      | FETCH SETTINGS
      |--------------------------------------------------------------------------
      */

      const fetchSettings = async () => {
        try {
          const res = await axios.get(
            `${API}/settings`
          )

          const settings = res.data

          businessName.value =
            settings.businessName ||
            businessName.value

          businessSubtitle.value =
            settings.businessSubtitle ||
            businessSubtitle.value

          themeColor.value =
            settings.themeColor ||
            themeColor.value

          offlineCachingEnabled.value =
            settings.offlineCachingEnabled === true

          applyTheme()

          isLoaded.value = true

        } catch (error) {
          console.error(
            'Error fetching settings:',
            error
          )

          // =====================================================
          // OFFLINE FALLBACK
          // =====================================================

          try {
            const cachedSettings =
              await getCachedSettings()

            if (cachedSettings) {

              businessName.value =
                cachedSettings.businessName ||
                businessName.value

              businessSubtitle.value =
                cachedSettings.businessSubtitle ||
                businessSubtitle.value

              themeColor.value =
                cachedSettings.themeColor ||
                themeColor.value

              offlineCachingEnabled.value =
                cachedSettings.offlineCachingEnabled === true

              applyTheme()

              console.log(
                'POS using cached settings:',
                cachedSettings
              )
            }

          } catch (cacheError) {
            console.error(
              'Error loading cached settings:',
              cacheError
            )
          }

          isLoaded.value = true
        }
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE SETTINGS
      |--------------------------------------------------------------------------
      */

      const updateSettings =
        async (
          data
        ) => {
          const res =
            await axios.put(
              `${API}/settings`,
              data
            )

          businessName.value =
            res.data.businessName ||
            businessName.value

          businessSubtitle.value =
            res.data.businessSubtitle ||
            businessSubtitle.value

          themeColor.value =
            res.data.themeColor ||
            themeColor.value

          offlineCachingEnabled.value =
            res.data.offlineCachingEnabled === true

          applyTheme()

          isLoaded.value =
            true

          return res.data
        }

      return {
        businessName,
        businessSubtitle,
        themeColor,
        offlineCachingEnabled,
        isLoaded,
        fetchSettings,
        updateSettings,
        applyTheme
      }
    }
  )