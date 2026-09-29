import axios from 'axios'
import { ref } from 'vue'

// =====================================================
// BOZZ VIC'S POS
// GLOBAL SERVER CONNECTION MONITOR
// =====================================================
//
// Purpose:
// - Monitor API requests globally
// - Distinguish Internet connection from API server connection
// - Detect slow requests / Render cold starts
// - Keep server status visible even when there is no active request
// - Works with Axios and native fetch()
// - Only monitors /api/... requests
//
// Server states:
// - checking
// - connected
// - connecting
// - waking
// - offline
// - error
//
// IMPORTANT:
// "connected" means the API server has successfully responded
// to an HTTP request. A 401/403/404/500 still proves that the
// server is reachable; those application errors are handled
// separately by the page/auth logic.
// =====================================================


// =====================================================
// GLOBAL STATE
// =====================================================

export const serverConnectionState =
  ref('checking')

export const serverConnectionMessage =
  ref('Checking server connection...')

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
// SET SERVER CONNECTED
// =====================================================

const setServerConnected =
  () => {

    clearTimers()

    isServerConnecting.value =
      false

    serverConnectionState.value =
      'connected'

    serverConnectionMessage.value =
      'Connected to server.'

    slowMessageShown =
      false
  }


// =====================================================
// START REQUEST MONITORING
// =====================================================

const beginRequest =
  () => {

    pendingRequests += 1

    // Another API request is already active.
    if (
      pendingRequests !== 1
    ) {
      return
    }

    clearTimers()

    slowMessageShown =
      false

    // =================================================
    // WAIT BEFORE SHOWING STATUS CHANGE
    // =================================================
    //
    // Fast requests remain visually quiet.
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
            'No internet connection.'

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
        // POSSIBLE RENDER COLD START
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
                'No internet connection.'

              isServerConnecting.value =
                false

              return
            }

            serverConnectionState.value =
              'waking'

            serverConnectionMessage.value =
              'Server is waking up. Please wait...'

            isServerConnecting.value =
              true

          }, 5500)

      }, 2500)
  }


// =====================================================
// FINISH REQUEST MONITORING
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

    // Another request is still running.
    if (
      pendingRequests > 0
    ) {
      return
    }

    // =================================================
    // NETWORK FAILURE
    // =================================================

    if (
      networkError
    ) {

      clearTimers()

      isServerConnecting.value =
        false

      if (
        navigator.onLine === false
      ) {

        serverConnectionState.value =
          'offline'

        serverConnectionMessage.value =
          'No internet connection.'

      } else {

        serverConnectionState.value =
          'error'

        serverConnectionMessage.value =
          'Unable to connect to server.'

      }

      slowMessageShown =
        true

      // Keep error status visible.
      connectedTimer =
        setTimeout(() => {

          if (
            navigator.onLine === false
          ) {

            serverConnectionState.value =
              'offline'

            serverConnectionMessage.value =
              'No internet connection.'

            return
          }

          serverConnectionState.value =
            'checking'

          serverConnectionMessage.value =
            'Waiting for next server connection check.'

          slowMessageShown =
            false

        }, 4500)

      return
    }


    // =================================================
    // SERVER RESPONDED
    // =================================================
    //
    // Important:
    // Even a 401/403/404/500 means the server was reached.
    //
    // The individual page/auth logic will handle the
    // actual HTTP/application error.
    //
    // So our global status becomes CONNECTED.
    // =================================================

    setServerConnected()
  }


// =====================================================
// BROWSER ONLINE / OFFLINE
// =====================================================

const handleOffline =
  () => {

    clearTimers()

    isServerConnecting.value =
      false

    serverConnectionState.value =
      'offline'

    serverConnectionMessage.value =
      'No internet connection.'

    slowMessageShown =
      true
  }


const handleOnline =
  () => {

    clearTimers()

    isServerConnecting.value =
      false

    // We know internet is back, but we do not
    // yet know whether the API server is reachable.
    // The next API request will confirm it.

    serverConnectionState.value =
      'checking'

    serverConnectionMessage.value =
      'Internet connection restored. Checking server...'

    slowMessageShown =
      false
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

          // HTTP error = server was reached.
          // No response = network/server connection failure.

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


        // Non-API fetch requests are untouched.
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
          'No internet connection.'
      }
    }
  }


// =====================================================
// DEBUG HELPER
// =====================================================

export const getPendingServerRequests =
  () => {

    return pendingRequests
  }