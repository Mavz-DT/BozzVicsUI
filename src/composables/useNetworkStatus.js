import {
  ref,
  onMounted,
  onUnmounted
} from 'vue'

/*
|--------------------------------------------------------------------------
| BOZZ VIC'S POS — NETWORK STATUS
|--------------------------------------------------------------------------
|
| Provides reactive Online / Offline state.
|
| Usage:
|
| const {
|   isOnline,
|   isOffline
| } = useNetworkStatus()
|
| isOnline.value
| isOffline.value
|
|--------------------------------------------------------------------------
*/

const isOnline =
  ref(
    typeof navigator !==
      'undefined'
      ? navigator.onLine
      : true
  )

const isOffline =
  ref(
    !isOnline.value
  )

const updateNetworkStatus =
  () => {
    isOnline.value =
      navigator.onLine

    isOffline.value =
      !isOnline.value
  }

let listenerCount = 0

export const useNetworkStatus =
  () => {
    onMounted(() => {
      if (listenerCount === 0) {
        window.addEventListener(
          'online',
          updateNetworkStatus
        )

        window.addEventListener(
          'offline',
          updateNetworkStatus
        )
      }

      listenerCount++
    })

    onUnmounted(() => {
      listenerCount--

      if (
        listenerCount === 0
      ) {
        window.removeEventListener(
          'online',
          updateNetworkStatus
        )

        window.removeEventListener(
          'offline',
          updateNetworkStatus
        )
      }
    })

    return {
      isOnline,
      isOffline
    }
  }

export default useNetworkStatus