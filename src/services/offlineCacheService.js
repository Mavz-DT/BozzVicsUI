import axios from 'axios'

import {
  replaceCategories,
  replaceMenus,
  replaceAddOns,
  saveCachedSettings,
  replaceOrderNumbers,

  getCachedCategories,
  getCachedMenus,
  getCachedAddOns,
  getCachedSettings,
  getCachedOrderNumbers,

  now
} from '../db/posDatabase'

/*
|--------------------------------------------------------------------------
| BOZZ VIC'S POS — OFFLINE CACHE SERVICE
|--------------------------------------------------------------------------
|
| Purpose:
| - Fetch POS master data from the API
| - Save successful API results into IndexedDB
| - Read cached data when needed later
|
| Important:
| - This service does NOT control PosView.vue.
| - This service does NOT change online POS behavior.
| - Offline selling is NOT enabled here yet.
|--------------------------------------------------------------------------
*/

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API =
  `${API_BASE_URL}/api`

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
|
| The JWT is stored inside:
|
| localStorage
|   └── pos_user
|         └── token
|
| This matches client/src/stores/auth.js.
|--------------------------------------------------------------------------
*/

const getAuthConfig = () => {
  let token = ''

  /*
   * Primary source:
   * pos_user.token
   */
  try {
    const savedUser =
      localStorage.getItem(
        'pos_user'
      )

    if (savedUser) {
      const user =
        JSON.parse(
          savedUser
        )

      token =
        user?.token ||
        ''
    }
  } catch (error) {
    console.error(
      'Offline cache: failed to read saved user:',
      error
    )
  }

  /*
   * Backward-compatible fallback.
   *
   * This allows the service to work even if
   * an older part of the application still
   * stores the JWT under "token".
   */
  if (!token) {
    token =
      localStorage.getItem(
        'token'
      ) || ''
  }

  if (!token) {
    return {}
  }

  return {
    headers: {
      Authorization:
        `Bearer ${token}`
    }
  }
}

/*
|--------------------------------------------------------------------------
| RESPONSE HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Convert different possible API response shapes
 * into one array.
 */
const extractArray = (
  data
) => {
  if (
    Array.isArray(data)
  ) {
    return data
  }

  if (
    Array.isArray(
      data?.categories
    )
  ) {
    return data.categories
  }

  if (
    Array.isArray(
      data?.menus
    )
  ) {
    return data.menus
  }

  if (
    Array.isArray(
      data?.addOns
    )
  ) {
    return data.addOns
  }

  if (
    Array.isArray(
      data?.orderNumbers
    )
  ) {
    return data.orderNumbers
  }

  if (
    Array.isArray(
      data?.data
    )
  ) {
    return data.data
  }

  if (
    Array.isArray(
      data?.results
    )
  ) {
    return data.results
  }

  return []
}

/*
|--------------------------------------------------------------------------
| CATEGORY CACHE
|--------------------------------------------------------------------------
*/

export const refreshCategories =
  async () => {
    try {
      const response =
        await axios.get(
          `${API}/categories`,
          getAuthConfig()
        )

      const categories =
        extractArray(
          response.data
        )

      await replaceCategories(
        categories
      )

      return categories
    } catch (error) {
      console.error(
        'Offline cache: failed to refresh categories:',
        error
      )

      return getCachedCategories()
    }
  }

/*
|--------------------------------------------------------------------------
| MENU CACHE
|--------------------------------------------------------------------------
*/

export const refreshMenus =
  async () => {
    try {
      const response =
        await axios.get(
          `${API}/menus`,
          getAuthConfig()
        )

      const menus =
        extractArray(
          response.data
        )

      await replaceMenus(
        menus
      )

      return menus
    } catch (error) {
      console.error(
        'Offline cache: failed to refresh menus:',
        error
      )

      return getCachedMenus()
    }
  }

/*
|--------------------------------------------------------------------------
| ADD-ON CACHE
|--------------------------------------------------------------------------
*/

export const refreshAddOns =
  async () => {
    try {
      const response =
        await axios.get(
          `${API}/add-ons`,
          getAuthConfig()
        )

      const addOns =
        extractArray(
          response.data
        )

      await replaceAddOns(
        addOns
      )

      return addOns
    } catch (error) {
      console.error(
        'Offline cache: failed to refresh add-ons:',
        error
      )

      return getCachedAddOns()
    }
  }

/*
|--------------------------------------------------------------------------
| SETTINGS CACHE
|--------------------------------------------------------------------------
*/

export const refreshSettings =
  async () => {
    try {
      const response =
        await axios.get(
          `${API}/settings`,
          getAuthConfig()
        )

      const settings =
        response.data || null

      await saveCachedSettings(
        settings
      )

      return settings
    } catch (error) {
      console.error(
        'Offline cache: failed to refresh settings:',
        error
      )

      return getCachedSettings()
    }
  }

/*
|--------------------------------------------------------------------------
| ORDER NUMBER CACHE
|--------------------------------------------------------------------------
*/

export const refreshOrderNumbers =
  async () => {
    try {
      const response =
        await axios.get(
          `${API}/order-numbers`,
          getAuthConfig()
        )

      const orderNumbers =
        extractArray(
          response.data
        )

      await replaceOrderNumbers(
        orderNumbers
      )

      return orderNumbers
    } catch (error) {
      console.error(
        'Offline cache: failed to refresh order numbers:',
        error
      )

      return getCachedOrderNumbers()
    }
  }

/*
|--------------------------------------------------------------------------
| REFRESH ALL OFFLINE CACHE
|--------------------------------------------------------------------------
|
| We use Promise.allSettled() so one failing endpoint
| does not prevent the other master data from refreshing.
|--------------------------------------------------------------------------
*/

export const refreshAllOfflineCache =
  async () => {
    const results =
      await Promise.allSettled([
        refreshCategories(),
        refreshMenus(),
        refreshAddOns(),
        refreshSettings(),
        refreshOrderNumbers()
      ])

    const [
      categoriesResult,
      menusResult,
      addOnsResult,
      settingsResult,
      orderNumbersResult
    ] = results

    const categories =
      categoriesResult.status ===
      'fulfilled'
        ? categoriesResult.value
        : await getCachedCategories()

    const menus =
      menusResult.status ===
      'fulfilled'
        ? menusResult.value
        : await getCachedMenus()

    const addOns =
      addOnsResult.status ===
      'fulfilled'
        ? addOnsResult.value
        : await getCachedAddOns()

    const settings =
      settingsResult.status ===
      'fulfilled'
        ? settingsResult.value
        : await getCachedSettings()

    const orderNumbers =
      orderNumbersResult.status ===
      'fulfilled'
        ? orderNumbersResult.value
        : await getCachedOrderNumbers()

    const result = {
      categories:
        Array.isArray(categories)
          ? categories.length
          : 0,

      menus:
        Array.isArray(menus)
          ? menus.length
          : 0,

      addOns:
        Array.isArray(addOns)
          ? addOns.length
          : 0,

      settings:
        settings
          ? 1
          : 0,

      orderNumbers:
        Array.isArray(orderNumbers)
          ? orderNumbers.length
          : 0,

      refreshedAt:
        now()
    }

    console.log(
      'POS offline cache refreshed:',
      result
    )

    return result
  }

/*
|--------------------------------------------------------------------------
| GET ALL OFFLINE MASTER DATA
|--------------------------------------------------------------------------
|
| This only reads IndexedDB.
| It does not call the API.
|--------------------------------------------------------------------------
*/

export const getOfflineMasterData =
  async () => {
    const [
      categories,
      menus,
      addOns,
      settings,
      orderNumbers
    ] = await Promise.all([
      getCachedCategories(),
      getCachedMenus(),
      getCachedAddOns(),
      getCachedSettings(),
      getCachedOrderNumbers()
    ])

    return {
      categories,
      menus,
      addOns,
      settings,
      orderNumbers
    }
  }

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  refreshCategories,
  refreshMenus,
  refreshAddOns,
  refreshSettings,
  refreshOrderNumbers,
  refreshAllOfflineCache,
  getOfflineMasterData
}