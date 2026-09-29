<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount
} from 'vue'

import {
  useRoute,
  useRouter
} from 'vue-router'

import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

import {
  serverConnectionState,
  serverConnectionMessage
} from '../services/serverConnectionMonitor'

const route = useRoute()
const router = useRouter()

const auth = useAuthStore()
const settingsStore = useSettingsStore()

const mobileMenuOpen = ref(false)
const moreMenuOpen = ref(false)
const adminMenuOpen = ref(false)

const isOnline = ref(
  typeof navigator !== 'undefined'
    ? navigator.onLine
    : true
)

const isAdmin = computed(() => {
  return auth.user?.role === 'Admin'
})

const businessName = computed(() => {
  return (
    settingsStore.businessName ||
    "Bozz Vic's Lomi House"
  )
})

const businessSubtitle = computed(() => {
  return (
    settingsStore.businessSubtitle ||
    'Restaurant POS'
  )
})


/*
|--------------------------------------------------------------------------
| Connection Status
|--------------------------------------------------------------------------
*/

const updateInternetStatus = () => {
  isOnline.value =
    navigator.onLine
}

const internetStatusLabel = computed(() => {
  return isOnline.value
    ? 'Online'
    : 'Offline'
})

const serverStatusLabel = computed(() => {
  switch (
    serverConnectionState.value
  ) {
    case 'connected':
      return 'Connected'

    case 'connecting':
      return 'Connecting...'

    case 'waking':
      return 'Waking...'

    case 'offline':
      return 'Offline'

    case 'error':
      return 'Unavailable'

    default:
      return 'Checking...'
  }
})

const serverStatusTitle = computed(() => {
  return (
    serverConnectionMessage.value ||
    'Checking server connection...'
  )
})

const serverStatusDotClass = computed(() => {
  switch (
    serverConnectionState.value
  ) {
    case 'connected':
      return 'bg-emerald-400'

    case 'connecting':
    case 'waking':
      return 'bg-amber-300 animate-pulse'

    case 'offline':
    case 'error':
      return 'bg-red-400'

    default:
      return 'bg-gray-300 animate-pulse'
  }
})

const serverStatusTextClass = computed(() => {
  switch (
    serverConnectionState.value
  ) {
    case 'connected':
      return 'text-emerald-100'

    case 'connecting':
    case 'waking':
      return 'text-amber-100'

    case 'offline':
    case 'error':
      return 'text-red-100'

    default:
      return 'text-white/70'
  }
})


/*
|--------------------------------------------------------------------------
| Always visible menus
|--------------------------------------------------------------------------
*/

const primaryMenuItems = [
  {
    label: 'Sales',
    to: '/pos'
  },
  {
    label: 'Unsettled Orders',
    to: '/unsettled-orders'
  },
  {
    label: 'Expenses',
    to: '/expenses'
  }
]


/*
|--------------------------------------------------------------------------
| Other menus
|--------------------------------------------------------------------------
*/

const moreMenuItems = [
  {
    label: 'Active Orders',
    to: '/active-orders',
    icon: '📋'
  },
  {
    label: 'Kitchen Orders',
    to: '/kitchen-orders',
    icon: '👨‍🍳'
  },
  {
    label: 'Sales Record',
    to: '/sales-records',
    icon: '🧾'
  },
  {
    label: 'Cash Ledger',
    to: '/cash-ledger',
    icon: '💰'
  },
  {
    label: 'Attendance',
    to: '/attendance',
    icon: '👥'
  },
  {
    label: 'Inventory',
    to: '/inventory',
    icon: '📦'
  },
  {
    label: 'Add-ons',
    to: '/add-ons',
    icon: '➕'
  }
]


/*
|--------------------------------------------------------------------------
| Admin menus
|--------------------------------------------------------------------------
*/

const adminMenuItems = [
  {
    label: 'Menu Management',
    to: '/menu-management',
    icon: '🍽️'
  },
  {
    label: 'Order Audit',
    to: '/order-audit',
    icon: '🔎'
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: '📊'
  },
  {
    label: 'Employees',
    to: '/employees',
    icon: '👤'
  },
  {
    label: 'Expense Item Master',
    to: '/expense-items',
    icon: '🧾'
  },
  {
    label: 'Manage Users',
    to: '/manage-users',
    icon: '🔐'
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: '⚙️'
  }
]


/*
|--------------------------------------------------------------------------
| Menu helpers
|--------------------------------------------------------------------------
*/

const closeAllMenus = () => {
  moreMenuOpen.value = false
  adminMenuOpen.value = false
}

const toggleMoreMenu = () => {
  adminMenuOpen.value = false
  moreMenuOpen.value =
    !moreMenuOpen.value
}

const toggleAdminMenu = () => {
  moreMenuOpen.value = false
  adminMenuOpen.value =
    !adminMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
  closeAllMenus()
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value =
    !mobileMenuOpen.value

  closeAllMenus()
}


/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

const handleLogout = async () => {
  closeMobileMenu()

  try {
    if (
      typeof auth.logout ===
      'function'
    ) {
      await auth.logout()
    }
  } catch (error) {
    console.error(
      'Logout error:',
      error
    )
  }

  router.push('/login')
}


/*
|--------------------------------------------------------------------------
| Route changes
|--------------------------------------------------------------------------
*/

watch(
  () => route.fullPath,
  () => {
    closeAllMenus()
    mobileMenuOpen.value = false
  }
)


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isActiveRoute = path => {
  return route.path === path
}

const handleDocumentClick = () => {
  closeAllMenus()
}


/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

onMounted(() => {
  window.addEventListener(
    'online',
    updateInternetStatus
  )

  window.addEventListener(
    'offline',
    updateInternetStatus
  )

  document.addEventListener(
    'click',
    handleDocumentClick
  )
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'online',
    updateInternetStatus
  )

  window.removeEventListener(
    'offline',
    updateInternetStatus
  )

  document.removeEventListener(
    'click',
    handleDocumentClick
  )
})
</script>


<template>
  <nav
    class="relative z-40 w-full text-white shadow-md"
    :style="{
      backgroundColor: settingsStore.themeColor
    }"
  >

    <!-- ===================================================== -->
    <!-- DESKTOP / TABLET -->
    <!-- ===================================================== -->

    <div
      class="hidden min-h-[58px] items-center gap-2 px-3 lg:px-5 md:flex"
      @click.stop
    >

      <!-- Brand -->
      <router-link
        to="/pos"
        class="mr-1 flex min-w-0 shrink-0 items-center gap-2"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-lg"
        >
          🍽️
        </div>

        <div
          class="min-w-0 max-w-[170px] lg:max-w-[230px]"
        >
          <div
            class="truncate text-sm font-black leading-tight lg:text-base"
          >
            {{ businessName }}
          </div>

          <div
            class="truncate text-[9px] leading-tight text-white/60 lg:text-[10px]"
          >
            {{ businessSubtitle }}
          </div>
        </div>
      </router-link>


      <!-- Primary menus -->
      <div
        class="flex shrink-0 items-center gap-1"
      >
        <router-link
          v-for="item in primaryMenuItems"
          :key="item.to"
          :to="item.to"
          class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          active-class="bg-white/15 text-white"
        >
          {{ item.label }}
        </router-link>
      </div>


      <!-- More dropdown -->
      <div
        class="relative shrink-0"
        @click.stop
      >
        <button
          type="button"
          class="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white"
          @click="toggleMoreMenu"
        >
          <span>More</span>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform"
            :class="
              moreMenuOpen
                ? 'rotate-180'
                : ''
            "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <transition name="dropdown">
          <div
            v-if="moreMenuOpen"
            class="absolute left-0 top-full z-[100] mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 text-gray-700 shadow-2xl"
          >
            <div
              class="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400"
            >
              Other Menus
            </div>

            <router-link
              v-for="item in moreMenuItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors hover:bg-gray-100"
              :class="
                isActiveRoute(item.to)
                  ? 'text-white'
                  : 'text-gray-700'
              "
              :style="
                isActiveRoute(item.to)
                  ? {
                      backgroundColor:
                        settingsStore.themeColor
                    }
                  : {}
              "
              @click="closeAllMenus"
            >
              <span
                class="w-7 text-center text-base"
              >
                {{ item.icon }}
              </span>

              <span>
                {{ item.label }}
              </span>
            </router-link>
          </div>
        </transition>
      </div>


      <!-- Admin dropdown -->
      <div
        v-if="isAdmin"
        class="relative shrink-0"
        @click.stop
      >
        <button
          type="button"
          class="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white"
          @click="toggleAdminMenu"
        >
          <span>Admin</span>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform"
            :class="
              adminMenuOpen
                ? 'rotate-180'
                : ''
            "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <transition name="dropdown">
          <div
            v-if="adminMenuOpen"
            class="absolute left-0 top-full z-[100] mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 text-gray-700 shadow-2xl"
          >
            <div
              class="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400"
            >
              Admin Menu
            </div>

            <router-link
              v-for="item in adminMenuItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors hover:bg-gray-100"
              :class="
                isActiveRoute(item.to)
                  ? 'text-white'
                  : 'text-gray-700'
              "
              :style="
                isActiveRoute(item.to)
                  ? {
                      backgroundColor:
                        settingsStore.themeColor
                    }
                  : {}
              "
              @click="closeAllMenus"
            >
              <span
                class="w-7 text-center text-base"
              >
                {{ item.icon }}
              </span>

              <span>
                {{ item.label }}
              </span>
            </router-link>
          </div>
        </transition>
      </div>


      <!-- Spacer -->
      <div class="min-w-1 flex-1"></div>


      <!-- =================================================== -->
      <!-- CONNECTION STATUS -->
      <!-- =================================================== -->

      <div
        class="hidden shrink-0 items-center gap-2 xl:flex"
        :title="serverStatusTitle"
      >

        <!-- Internet -->
        <div
          class="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-bold"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="
              isOnline
                ? 'bg-emerald-400'
                : 'bg-red-400'
            "
          ></span>

          <span class="text-white/70">
            Internet
          </span>

          <span
            :class="
              isOnline
                ? 'text-emerald-100'
                : 'text-red-100'
            "
          >
            {{ internetStatusLabel }}
          </span>
        </div>


        <!-- Server -->
        <div
          class="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-bold"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="serverStatusDotClass"
          ></span>

          <span class="text-white/70">
            Server
          </span>

          <span
            :class="
              serverStatusTextClass
            "
          >
            {{ serverStatusLabel }}
          </span>
        </div>

      </div>


      <!-- Compact connection status for smaller desktop/tablet -->
      <div
        class="hidden md:flex xl:hidden shrink-0 items-center gap-1"
        :title="serverStatusTitle"
      >

        <span
          class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10"
          :class="
            isOnline
              ? 'text-emerald-100'
              : 'text-red-100'
          "
          :title="
            `Internet: ${internetStatusLabel}`
          "
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="
              isOnline
                ? 'bg-emerald-400'
                : 'bg-red-400'
            "
          ></span>
        </span>

        <span
          class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10"
          :title="
            `Server: ${serverStatusLabel}`
          "
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="
              serverStatusDotClass
            "
          ></span>
        </span>

      </div>


      <!-- Logged-in user -->
      <div
        class="flex shrink-0 items-center gap-2 pl-2"
      >
        <div
          class="hidden h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-black lg:flex"
        >
          {{
            auth.user?.username
              ?.charAt(0)
              ?.toUpperCase()
          }}
        </div>

        <div
          class="max-w-[100px] text-right leading-tight lg:max-w-[130px]"
        >
          <div
            class="truncate text-xs font-black"
          >
            {{ auth.user?.username }}
          </div>

          <div
            class="text-[9px] uppercase tracking-wide text-white/60"
          >
            {{ auth.user?.role }}
          </div>
        </div>

        <button
          type="button"
          class="whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-2 text-xs font-bold hover:bg-white/20"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
    </div>


    <!-- ===================================================== -->
    <!-- MOBILE HEADER -->
    <!-- ===================================================== -->

    <div
      class="flex min-h-[58px] items-center justify-between gap-2 px-3 md:hidden"
    >

      <!-- Brand -->
      <router-link
        to="/pos"
        class="flex min-w-0 items-center gap-2"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-lg"
        >
          🍽️
        </div>

        <div class="min-w-0">
          <div
            class="truncate text-sm font-black leading-tight"
          >
            {{ businessName }}
          </div>

          <div
            class="truncate text-[9px] text-white/60"
          >
            {{ businessSubtitle }}
          </div>
        </div>
      </router-link>


      <!-- Mobile connection status -->
      <div
        class="flex shrink-0 items-center gap-1"
      >

        <!-- Internet -->
        <div
          class="flex h-8 items-center gap-1 rounded-lg bg-white/10 px-1.5"
          :title="
            `Internet: ${internetStatusLabel}`
          "
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="
              isOnline
                ? 'bg-emerald-400'
                : 'bg-red-400'
            "
          ></span>

          <span
            class="hidden sm:inline text-[9px] font-bold"
            :class="
              isOnline
                ? 'text-emerald-100'
                : 'text-red-100'
            "
          >
            {{ internetStatusLabel }}
          </span>
        </div>


        <!-- Server -->
        <div
          class="flex h-8 items-center gap-1 rounded-lg bg-white/10 px-1.5"
          :title="serverStatusTitle"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="serverStatusDotClass"
          ></span>

          <span
            class="hidden sm:inline text-[9px] font-bold"
            :class="serverStatusTextClass"
          >
            {{
              serverStatusLabel
            }}
          </span>
        </div>

      </div>


      <!-- User + hamburger -->
      <div
        class="flex shrink-0 items-center gap-2"
      >
        <div
          class="hidden sm:block max-w-[95px] text-right leading-tight"
        >
          <div
            class="truncate text-xs font-black"
          >
            {{ auth.user?.username }}
          </div>

          <div
            class="text-[9px] uppercase text-white/60"
          >
            {{ auth.user?.role }}
          </div>
        </div>

        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
          aria-label="Open menu"
          :aria-expanded="mobileMenuOpen"
          @click="toggleMobileMenu"
        >
          <svg
            v-if="!mobileMenuOpen"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>

          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>


    <!-- ===================================================== -->
    <!-- MOBILE OVERLAY -->
    <!-- ===================================================== -->

    <transition name="fade">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-40 bg-black/50 md:hidden"
        @click="closeMobileMenu"
      ></div>
    </transition>


    <!-- ===================================================== -->
    <!-- MOBILE DRAWER -->
    <!-- ===================================================== -->

    <transition name="drawer">
      <aside
        v-if="mobileMenuOpen"
        class="fixed left-0 top-0 z-50 flex h-full w-[84vw] max-w-sm flex-col bg-white text-gray-800 shadow-2xl md:hidden"
      >

        <!-- Drawer header -->
        <div
          class="flex shrink-0 items-center justify-between p-4 text-white"
          :style="{
            backgroundColor:
              settingsStore.themeColor
          }"
        >
          <div
            class="flex min-w-0 items-center gap-3"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl"
            >
              🍽️
            </div>

            <div class="min-w-0">
              <div
                class="truncate font-black"
              >
                {{ businessName }}
              </div>

              <div
                class="truncate text-xs text-white/70"
              >
                {{ businessSubtitle }}
              </div>
            </div>
          </div>

          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
            aria-label="Close menu"
            @click="closeMobileMenu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>


        <!-- User -->
        <div
          class="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-4"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-black"
            :style="{
              backgroundColor:
                settingsStore.themeColor
            }"
          >
            {{
              auth.user?.username
                ?.charAt(0)
                ?.toUpperCase()
            }}
          </div>

          <div class="min-w-0">
            <div
              class="truncate font-black text-gray-800"
            >
              {{ auth.user?.username }}
            </div>

            <div
              class="text-xs text-gray-500"
            >
              {{ auth.user?.role }}
            </div>
          </div>
        </div>


        <!-- Mobile server status -->
        <div
          class="border-b border-gray-200 bg-white px-4 py-3"
        >
          <div
            class="flex items-center justify-between gap-3"
          >

            <div
              class="flex items-center gap-2"
            >
              <span
                class="h-2.5 w-2.5 rounded-full"
                :class="
                  isOnline
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                "
              ></span>

              <span
                class="text-xs font-bold text-gray-600"
              >
                Internet
              </span>

              <span
                class="text-xs font-black"
                :class="
                  isOnline
                    ? 'text-emerald-600'
                    : 'text-red-600'
                "
              >
                {{ internetStatusLabel }}
              </span>
            </div>


            <div
              class="flex items-center gap-2"
              :title="serverStatusTitle"
            >
              <span
                class="h-2.5 w-2.5 rounded-full"
                :class="
                  serverConnectionState ===
                    'connected'
                    ? 'bg-emerald-500'
                    : serverConnectionState ===
                        'connecting' ||
                      serverConnectionState ===
                        'waking'
                      ? 'bg-amber-500 animate-pulse'
                      : serverConnectionState ===
                          'offline' ||
                        serverConnectionState ===
                          'error'
                        ? 'bg-red-500'
                        : 'bg-gray-400 animate-pulse'
                "
              ></span>

              <span
                class="text-xs font-bold text-gray-600"
              >
                Server
              </span>

              <span
                class="text-xs font-black"
                :class="
                  serverConnectionState ===
                    'connected'
                    ? 'text-emerald-600'
                    : serverConnectionState ===
                        'connecting' ||
                      serverConnectionState ===
                        'waking'
                      ? 'text-amber-600'
                      : serverConnectionState ===
                          'offline' ||
                        serverConnectionState ===
                          'error'
                        ? 'text-red-600'
                        : 'text-gray-500'
                "
              >
                {{
                  serverStatusLabel
                }}
              </span>
            </div>

          </div>

          <p
            v-if="
              serverConnectionState ===
                'connecting' ||
              serverConnectionState ===
                'waking'
            "
            class="mt-2 text-[10px] font-semibold text-amber-600"
          >
            {{
              serverConnectionMessage
            }}
          </p>
        </div>


        <!-- Mobile menu content -->
        <div class="flex-1 overflow-y-auto p-3">

          <div
            class="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-gray-400"
          >
            Menu
          </div>


          <!-- Primary -->
          <router-link
            v-for="item in primaryMenuItems"
            :key="
              `mobile-primary-${item.to}`
            "
            :to="item.to"
            class="mb-1 flex items-center rounded-xl px-4 py-3 font-bold transition-colors hover:bg-gray-100"
            :style="
              isActiveRoute(item.to)
                ? {
                    backgroundColor:
                      settingsStore.themeColor,
                    color: '#ffffff'
                  }
                : {}
            "
            @click="closeMobileMenu"
          >
            {{ item.label }}
          </router-link>


          <!-- More menus -->
          <router-link
            v-for="item in moreMenuItems"
            :key="
              `mobile-more-${item.to}`
            "
            :to="item.to"
            class="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition-colors hover:bg-gray-100"
            :style="
              isActiveRoute(item.to)
                ? {
                    backgroundColor:
                      settingsStore.themeColor,
                    color: '#ffffff'
                  }
                : {}
            "
            @click="closeMobileMenu"
          >
            <span
              class="w-7 text-center text-lg"
            >
              {{ item.icon }}
            </span>

            <span>
              {{ item.label }}
            </span>
          </router-link>


          <!-- Admin -->
          <template v-if="isAdmin">

            <div
              class="mt-4 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-gray-400"
            >
              Admin
            </div>

            <router-link
              v-for="item in adminMenuItems"
              :key="
                `mobile-admin-${item.to}`
              "
              :to="item.to"
              class="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition-colors hover:bg-gray-100"
              :style="
                isActiveRoute(item.to)
                  ? {
                      backgroundColor:
                        settingsStore.themeColor,
                      color: '#ffffff'
                    }
                  : {}
              "
              @click="closeMobileMenu"
            >
              <span
                class="w-7 text-center text-lg"
              >
                {{ item.icon }}
              </span>

              <span>
                {{ item.label }}
              </span>
            </router-link>

          </template>
        </div>


        <!-- Logout -->
        <div
          class="shrink-0 border-t border-gray-200 p-3"
        >
          <button
            type="button"
            class="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 font-black text-red-600 hover:bg-red-100"
            @click="handleLogout"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3"
              />
            </svg>

            Logout
          </button>
        </div>

      </aside>
    </transition>

  </nav>
</template>


<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>