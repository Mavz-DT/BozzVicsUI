import axios from 'axios'
import { ref } from 'vue'

// =====================================================
// BOZZ VIC'S POS
// GLOBAL SERVER CONNECTION MONITOR
// =====================================================
//
// Purpose:
// - Monitor API requests globally
// - Detect slow API responses / Render cold starts
// - Give the cashier visible feedback instead of looking
//   like the POS has frozen
// - Works with both Axios and native fetch()
// - Only monitors /api/... requests
//
// States:
// - idle
// - connecting
// - waking
// - connected
// - offline
// - error
// =====================================================


// =====================================================
// GLOBAL STATE
// =====================================================

export const serverConnectionState =
  ref('idle')

export const serverConnectionMessage =
  ref('')


export const isServerConnecting =
  ref(false)


// =====================================================
// INTERNAL STATE
// =====================================================

let monitorInstalled =
  false

let pendingRequests =
  0

let slowTimer =
  null

let wakingTimer =
  null

let connectedTimer =
  null

let slowMessageShown =
  false

let savedFetch =
  null


// =====================================================
// API REQUEST DETECTION
// =====================================================

const isApiRequest =
  url => {

    if (!url) {
      return false
    }

    const value =
      String(url)

    return /\/api(?:\/|$)/.test(
      value
    )
  }


// =====================================================
// CLEAR TIMERS
// =====================================================

const clearTimers =
  () => {

    if (slowTimer) {
      clearTimeout(
        slowTimer
      )

      slowTimer =
        null
    }

    if (wakingTimer) {
      clearTimeout(
        wakingTimer
      )

      wakingTimer =
        null
    }

    if (connectedTimer) {
      clearTimeout(
        connectedTimer
      )

      connectedTimer =
        null
    }
  }


// =====================================================
// SHOW IDLE
// =====================================================

const setIdle =
  () => {

    clearTimers()

    isServerConnecting.value =
      false

    serverConnectionState.value =
      'idle'

    serverConnectionMessage.value =
      ''

    slowMessageShown =
      false
  }


// =====================================================
// START MONITORING
// =====================================================

const beginRequest =
  () => {

    pendingRequests += 1

    if (
      pendingRequests !== 1
    ) {
      return
    }

    // Reset any previous state
    clearTimers()

    slowMessageShown =
      false

    // =================================================
    // WAIT A LITTLE FIRST
    // =================================================
    //
    // Fast API requests should feel completely normal.
    // We do not show a banner immediately.
    //
    slowTimer =
      setTimeout(() => {

        if (
          pendingRequests <= 0
        ) {
          return
        }

        if (
          navigator.onLine === false
        ) {
          serverConnectionState.value =
            'offline'

          serverConnectionMessage.value =
            'Walang internet connection.'

          isServerConnecting.value =
            false

          slowMessageShown =
            true

          return
        }

        serverConnectionState.value =
          'connecting'

        serverConnectionMessage.value =
          'Connecting to server...'

        isServerConnecting.value =
          true

        slowMessageShown =
          true

        // =============================================
        // RENDER COLD START
        // =============================================

        wakingTimer =
          setTimeout(() => {

            if (
              pendingRequests <= 0
            ) {
              return
            }

            if (
              navigator.onLine === false
            ) {
              serverConnectionState.value =
                'offline'

              serverConnectionMessage.value =
                'Walang internet connection.'

              return
            }

            serverConnectionState.value =
              'waking'

            serverConnectionMessage.value =
              'Server is waking up. Please wait...'

          }, 5500)

      }, 2500)
  }


// =====================================================
// FINISH MONITORING
// =====================================================

const endRequest =
  ({
    networkError = false
  } = {}) => {

    pendingRequests =
      Math.max(
        0,
        pendingRequests - 1
      )

    // Another API request is still running.
    if (
      pendingRequests > 0
    ) {
      return
    }

    clearTimers()

    // =================================================
    // NETWORK ERROR
    // =================================================

    if (
      networkError
    ) {

      isServerConnecting.value =
        false

      serverConnectionState.value =
        navigator.onLine === false
          ? 'offline'
          : 'error'

      serverConnectionMessage.value =
        navigator.onLine === false
          ? 'Walang internet connection.'
          : 'Unable to connect to the server.'

      slowMessageShown =
        true

      // Keep the message visible for a while.
      connectedTimer =
        setTimeout(() => {
          setIdle()
        }, 4500)

      return
    }


    // =================================================
    // SUCCESS AFTER A SLOW REQUEST
    // =================================================

    if (
      slowMessageShown
    ) {

      isServerConnecting.value =
        false

      serverConnectionState.value =
        'connected'

      serverConnectionMessage.value =
        'Server connected.'

      connectedTimer =
        setTimeout(() => {
          setIdle()
        }, 1200)

      return
    }


    // =================================================
    // NORMAL FAST REQUEST
    // =================================================

    setIdle()
  }


// =====================================================
// BROWSER ONLINE / OFFLINE
// =====================================================

const handleOffline =
  () => {

    if (
      pendingRequests > 0
    ) {

      serverConnectionState.value =
        'offline'

      serverConnectionMessage.value =
        'Walang internet connection.'

      isServerConnecting.value =
        false
    }
  }


const handleOnline =
  () => {

    if (
      pendingRequests > 0
    ) {

      serverConnectionState.value =
        'connecting'

      serverConnectionMessage.value =
        'Internet connection restored. Connecting to server...'

      isServerConnecting.value =
        true

      return
    }

    setIdle()
  }


// =====================================================
// INSTALL AXIOS MONITOR
// =====================================================

const installAxiosMonitor =
  () => {

    axios.interceptors.request.use(
      config => {

        const requestUrl =
          `${config.baseURL || ''}${config.url || ''}`

        if (
          isApiRequest(
            requestUrl
          )
        ) {
          beginRequest()
        }

        return config
      },
      error => {

        return Promise.reject(
          error
        )
      }
    )


    axios.interceptors.response.use(
      response => {

        const requestUrl =
          `${response.config?.baseURL || ''}${response.config?.url || ''}`

        if (
          isApiRequest(
            requestUrl
          )
        ) {
          endRequest({
            networkError:
              false
          })
        }

        return response
      },

      error => {

        const requestUrl =
          `${error.config?.baseURL || ''}${error.config?.url || ''}`

        if (
          isApiRequest(
            requestUrl
          )
        ) {

          endRequest({
            networkError:
              !error.response
          })
        }

        return Promise.reject(
          error
        )
      }
    )
  }


// =====================================================
// INSTALL FETCH MONITOR
// =====================================================

const installFetchMonitor =
  () => {

    if (
      typeof window ===
      'undefined'
    ) {
      return
    }

    if (
      typeof window.fetch !==
      'function'
    ) {
      return
    }

    if (
      savedFetch
    ) {
      return
    }

    savedFetch =
      window.fetch.bind(
        window
      )


    window.fetch =
      async (...args) => {

        const input =
          args[0]

        let requestUrl =
          ''

        if (
          typeof input ===
          'string'
        ) {
          requestUrl =
            input
        } else if (
          input &&
          typeof input.url ===
          'string'
        ) {
          requestUrl =
            input.url
        }


        if (
          !isApiRequest(
            requestUrl
          )
        ) {

          return savedFetch(
            ...args
          )
        }


        beginRequest()

        try {

          const response =
            await savedFetch(
              ...args
            )

          endRequest({
            networkError:
              false
          })

          return response

        } catch (error) {

          endRequest({
            networkError:
              true
          })

          throw error
        }
      }
  }


// =====================================================
// INSTALL GLOBAL MONITOR
// =====================================================

export const initServerConnectionMonitor =
  () => {

    if (
      monitorInstalled
    ) {
      return
    }

    monitorInstalled =
      true


    installAxiosMonitor()

    installFetchMonitor()


    if (
      typeof window !==
      'undefined'
    ) {

      window.addEventListener(
        'offline',
        handleOffline
      )

      window.addEventListener(
        'online',
        handleOnline
      )


      if (
        navigator.onLine ===
        false
      ) {
        serverConnectionState.value =
          'offline'

        serverConnectionMessage.value =
          'Walang internet connection.'
      }
    }
  }


// =====================================================
// OPTIONAL DEBUG HELPERS
// =====================================================

export const getPendingServerRequests =
  () => {

    return pendingRequests
  }