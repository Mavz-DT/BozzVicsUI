<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API = `${API_BASE_URL}/api/auth`

const getAuthHeaders = () => {
  const token =
    authStore.getToken?.() ||
    localStorage.getItem('token') ||
    ''

  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {}
}

/*
|--------------------------------------------------------------------------
| STATE
|--------------------------------------------------------------------------
*/

const users = ref([])

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const search = ref('')

const isUserModalOpen = ref(false)
const isPasswordModalOpen = ref(false)
const isDeleteModalOpen = ref(false)

const isSaving = ref(false)
const isChangingPassword = ref(false)
const isDeleting = ref(false)

const editingUser = ref(null)
const deletingUser = ref(null)
const passwordUser = ref(null)

const userForm = ref({
  username: '',
  password: '',
  role: 'Cashier'
})

const passwordForm = ref({
  password: '',
  confirmPassword: ''
})

const isEditMode = computed(() => {
  return !!editingUser.value
})

const currentUserId = computed(() => {
  return String(
    authStore.user?._id ||
    authStore.user?.id ||
    ''
  )
})

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const parseApiError = error => {
  return (
    error.response?.data?.message ||
    'May nangyaring error. Pakisubukan ulit.'
  )
}

const extractUsers = data => {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.users)) {
    return data.users
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  return []
}

const formatDate = date => {
  if (!date) return ''

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const isCurrentUser = user => {
  return String(user?._id || '') === currentUserId.value
}

const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) {
    return users.value
  }

  return users.value.filter(user => {
    const username =
      String(user?.username || '').toLowerCase()

    const role =
      String(user?.role || '').toLowerCase()

    return (
      username.includes(query) ||
      role.includes(query)
    )
  })
})

const adminCount = computed(() => {
  return users.value.filter(
    user => user?.role === 'Admin'
  ).length
})

const cashierCount = computed(() => {
  return users.value.filter(
    user => user?.role === 'Cashier'
  ).length
})

/*
|--------------------------------------------------------------------------
| FETCH USERS
|--------------------------------------------------------------------------
*/

const fetchUsers = async () => {
  try {
    isLoading.value = true
    clearMessages()

    const response = await axios.get(
      `${API}/users`,
      {
        headers: getAuthHeaders()
      }
    )

    users.value = extractUsers(
      response.data
    )
  } catch (error) {
    console.error('Error fetching users:', error)

    users.value = []

    errorMessage.value =
      parseApiError(error)
  } finally {
    isLoading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| USER MODAL
|--------------------------------------------------------------------------
*/

const openAddUserModal = () => {
  clearMessages()

  editingUser.value = null

  userForm.value = {
    username: '',
    password: '',
    role: 'Cashier'
  }

  isUserModalOpen.value = true
}

const openEditUserModal = user => {
  clearMessages()

  if (isCurrentUser(user)) {
    errorMessage.value =
      'Gamitin ang Change Password para sa sariling account.'

    return
  }

  editingUser.value = user

  userForm.value = {
    username: user.username || '',
    password: '',
    role: user.role || 'Cashier'
  }

  isUserModalOpen.value = true
}

const closeUserModal = () => {
  if (isSaving.value) return

  isUserModalOpen.value = false
  editingUser.value = null

  userForm.value = {
    username: '',
    password: '',
    role: 'Cashier'
  }
}

/*
|--------------------------------------------------------------------------
| SAVE USER
|--------------------------------------------------------------------------
*/

const saveUser = async () => {
  try {
    clearMessages()

    const username =
      String(userForm.value.username || '').trim()

    const password =
      String(userForm.value.password || '')

    const role =
      userForm.value.role

    if (!username) {
      errorMessage.value =
        'Kailangan ang username.'

      return
    }

    if (!['Admin', 'Cashier'].includes(role)) {
      errorMessage.value =
        'Pumili ng valid na user role.'

      return
    }

    isSaving.value = true

    if (!editingUser.value) {
      if (!password) {
        errorMessage.value =
          'Kailangan ang password.'

        return
      }

      if (password.length < 6) {
        errorMessage.value =
          'Ang password ay dapat hindi bababa sa 6 characters.'

        return
      }

      await axios.post(
        `${API}/users`,
        {
          username,
          password,
          role
        },
        {
          headers: getAuthHeaders()
        }
      )

      successMessage.value =
        'Matagumpay na nalikha ang user.'

      closeUserModal()

      await fetchUsers()
    } else {
      await axios.put(
        `${API}/users/${editingUser.value._id}`,
        {
          username,
          role
        },
        {
          headers: getAuthHeaders()
        }
      )

      successMessage.value =
        'Matagumpay na na-update ang user.'

      closeUserModal()

      await fetchUsers()
    }
  } catch (error) {
    console.error('Save user error:', error)

    errorMessage.value =
      parseApiError(error)
  } finally {
    isSaving.value = false
  }
}

/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
*/

const openPasswordModal = user => {
  clearMessages()

  passwordUser.value = user

  passwordForm.value = {
    password: '',
    confirmPassword: ''
  }

  isPasswordModalOpen.value = true
}

const closePasswordModal = () => {
  if (isChangingPassword.value) return

  isPasswordModalOpen.value = false
  passwordUser.value = null

  passwordForm.value = {
    password: '',
    confirmPassword: ''
  }
}

const savePassword = async () => {
  try {
    clearMessages()

    const password =
      String(passwordForm.value.password || '')

    const confirmPassword =
      String(
        passwordForm.value.confirmPassword || ''
      )

    if (!password) {
      errorMessage.value =
        'Kailangan ang bagong password.'

      return
    }

    if (password.length < 6) {
      errorMessage.value =
        'Ang password ay dapat hindi bababa sa 6 characters.'

      return
    }

    if (password !== confirmPassword) {
      errorMessage.value =
        'Hindi magkapareho ang password.'

      return
    }

    if (!passwordUser.value?._id) {
      errorMessage.value =
        'Invalid user.'

      return
    }

    isChangingPassword.value = true

    await axios.put(
      `${API}/users/${passwordUser.value._id}/password`,
      {
        password
      },
      {
        headers: getAuthHeaders()
      }
    )

    successMessage.value =
      `Matagumpay na napalitan ang password ni ${passwordUser.value.username}.`

    closePasswordModal()
  } catch (error) {
    console.error(
      'Change password error:',
      error
    )

    errorMessage.value =
      parseApiError(error)
  } finally {
    isChangingPassword.value = false
  }
}

/*
|--------------------------------------------------------------------------
| DELETE USER
|--------------------------------------------------------------------------
*/

const openDeleteModal = user => {
  clearMessages()

  if (isCurrentUser(user)) {
    errorMessage.value =
      'Hindi maaaring i-delete ang kasalukuyang naka-login na account.'

    return
  }

  deletingUser.value = user
  isDeleteModalOpen.value = true
}

const closeDeleteModal = () => {
  if (isDeleting.value) return

  isDeleteModalOpen.value = false
  deletingUser.value = null
}

const confirmDeleteUser = async () => {
  try {
    clearMessages()

    if (!deletingUser.value?._id) {
      errorMessage.value =
        'Invalid user.'

      return
    }

    isDeleting.value = true

    await axios.delete(
      `${API}/users/${deletingUser.value._id}`,
      {
        headers: getAuthHeaders()
      }
    )

    successMessage.value =
      `Matagumpay na na-delete ang user na ${deletingUser.value.username}.`

    closeDeleteModal()

    await fetchUsers()
  } catch (error) {
    console.error(
      'Delete user error:',
      error
    )

    errorMessage.value =
      parseApiError(error)
  } finally {
    isDeleting.value = false
  }
}

/*
|--------------------------------------------------------------------------
| INITIAL LOAD
|--------------------------------------------------------------------------
*/

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

    <!-- HEADER -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

      <div>
        <h1 class="text-2xl md:text-3xl font-black text-gray-800">
          Manage Users
        </h1>

        <p class="text-sm text-gray-500 mt-1">
          Gumawa, mag-edit, magpalit ng password, at mag-delete ng user accounts.
        </p>
      </div>

      <button
        type="button"
        @click="openAddUserModal"
        class="w-full lg:w-auto px-5 py-3.5 rounded-xl text-white font-black shadow-sm active:scale-[0.98] transition"
        :style="{ backgroundColor: settingsStore.themeColor }"
      >
        + Add User
      </button>

    </div>

    <!-- MESSAGES -->

    <div
      v-if="successMessage"
      class="bg-green-100 border border-green-200 text-green-700 rounded-xl p-4 font-semibold"
    >
      {{ successMessage }}
    </div>

    <div
      v-if="errorMessage"
      class="bg-red-100 border border-red-200 text-red-700 rounded-xl p-4 font-semibold"
    >
      {{ errorMessage }}
    </div>

    <!-- SUMMARY -->

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

      <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <p class="text-sm font-semibold text-gray-500">
          Total Users
        </p>

        <p class="text-3xl font-black text-gray-800 mt-1">
          {{ users.length }}
        </p>
      </div>

      <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <p class="text-sm font-semibold text-gray-500">
          Admin
        </p>

        <p
          class="text-3xl font-black mt-1"
          :style="{ color: settingsStore.themeColor }"
        >
          {{ adminCount }}
        </p>
      </div>

      <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <p class="text-sm font-semibold text-gray-500">
          Cashier
        </p>

        <p class="text-3xl font-black text-gray-800 mt-1">
          {{ cashierCount }}
        </p>
      </div>

    </div>

    <!-- SEARCH -->

    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">

      <input
        v-model="search"
        type="text"
        placeholder="Search username or role..."
        class="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-gray-200"
      />

    </div>

    <!-- LOADING -->

    <div
      v-if="isLoading"
      class="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500"
    >
      Loading users...
    </div>

    <!-- EMPTY -->

    <div
      v-else-if="filteredUsers.length === 0"
      class="bg-white border border-gray-200 rounded-2xl p-12 text-center"
    >
      <div class="text-4xl mb-3">
        👤
      </div>

      <h2 class="font-black text-gray-700">
        No Users Found
      </h2>

      <p class="text-sm text-gray-400 mt-1">
        Walang user na tumutugma sa search.
      </p>
    </div>

    <!-- DESKTOP TABLE -->

    <div
      v-else
      class="hidden lg:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
    >

      <div class="overflow-x-auto">

        <table class="w-full">

          <thead class="bg-gray-50 border-b border-gray-200">

            <tr>
              <th class="text-left px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                Username
              </th>

              <th class="text-left px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                Role
              </th>

              <th class="text-left px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                Created
              </th>

              <th class="text-right px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>

          </thead>

          <tbody>

            <tr
              v-for="user in filteredUsers"
              :key="user._id"
              class="border-b border-gray-100 last:border-b-0"
            >

              <!-- USERNAME -->

              <td class="px-5 py-4">

                <div class="flex items-center gap-3">

                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                    :style="{ backgroundColor: settingsStore.themeColor }"
                  >
                    {{ String(user.username || '?').charAt(0).toUpperCase() }}
                  </div>

                  <div>

                    <p class="font-black text-gray-800">
                      {{ user.username }}
                    </p>

                    <p
                      v-if="isCurrentUser(user)"
                      class="text-xs font-bold text-gray-400 mt-0.5"
                    >
                      Current account
                    </p>

                  </div>

                </div>

              </td>

              <!-- ROLE -->

              <td class="px-5 py-4">

                <span
                  class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black"
                  :class="
                    user.role === 'Admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  "
                >
                  {{ user.role }}
                </span>

              </td>

              <!-- CREATED -->

              <td class="px-5 py-4 text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>

              <!-- ACTIONS -->

              <td class="px-5 py-4">

                <div class="flex items-center justify-end gap-2">

                  <button
                    type="button"
                    @click="openEditUserModal(user)"
                    class="px-3.5 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 active:scale-[0.98]"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    @click="openPasswordModal(user)"
                    class="px-3.5 py-2.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 active:scale-[0.98]"
                  >
                    Password
                  </button>

                  <button
                    v-if="!isCurrentUser(user)"
                    type="button"
                    @click="openDeleteModal(user)"
                    class="px-3.5 py-2.5 rounded-lg bg-red-50 text-red-700 font-bold hover:bg-red-100 active:scale-[0.98]"
                  >
                    Delete
                  </button>

                </div>

              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>

    <!-- MOBILE CARDS -->

    <div class="lg:hidden space-y-4">

      <div
        v-for="user in filteredUsers"
        :key="user._id"
        class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4"
      >

        <div class="flex items-start justify-between gap-4">

          <div class="flex items-center gap-3 min-w-0">

            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black shrink-0"
              :style="{ backgroundColor: settingsStore.themeColor }"
            >
              {{ String(user.username || '?').charAt(0).toUpperCase() }}
            </div>

            <div class="min-w-0">

              <p class="font-black text-gray-800 truncate">
                {{ user.username }}
              </p>

              <span
                class="inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-black"
                :class="
                  user.role === 'Admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                "
              >
                {{ user.role }}
              </span>

            </div>

          </div>

          <span
            v-if="isCurrentUser(user)"
            class="shrink-0 text-xs font-bold text-gray-400"
          >
            You
          </span>

        </div>

        <div class="mt-4 pt-4 border-t border-gray-100">

          <p class="text-xs text-gray-400 font-semibold">
            Created
          </p>

          <p class="text-sm font-semibold text-gray-700 mt-1">
            {{ formatDate(user.createdAt) }}
          </p>

        </div>

        <div class="grid grid-cols-2 gap-2 mt-4">

          <button
            type="button"
            @click="openEditUserModal(user)"
            class="min-h-[46px] rounded-xl bg-gray-100 text-gray-700 font-black active:scale-[0.98]"
          >
            Edit
          </button>

          <button
            type="button"
            @click="openPasswordModal(user)"
            class="min-h-[46px] rounded-xl bg-blue-50 text-blue-700 font-black active:scale-[0.98]"
          >
            Password
          </button>

          <button
            v-if="!isCurrentUser(user)"
            type="button"
            @click="openDeleteModal(user)"
            class="col-span-2 min-h-[46px] rounded-xl bg-red-50 text-red-700 font-black active:scale-[0.98]"
          >
            Delete User
          </button>

        </div>

      </div>

    </div>

    <!-- ADD / EDIT USER MODAL -->

    <div
      v-if="isUserModalOpen"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      @click.self="closeUserModal"
    >

      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">

          <div>

            <h2 class="text-xl font-black text-gray-800">
              {{ isEditMode ? 'Edit User' : 'Add User' }}
            </h2>

            <p class="text-xs text-gray-500 mt-1">
              {{ isEditMode
                ? 'I-update ang username o role.'
                : 'Gumawa ng bagong Admin o Cashier account.'
              }}
            </p>

          </div>

          <button
            type="button"
            @click="closeUserModal"
            class="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-black"
          >
            ×
          </button>

        </div>

        <form
          @submit.prevent="saveUser"
          class="p-5 space-y-4"
        >

          <!-- USERNAME -->

          <div>

            <label class="block text-sm font-bold text-gray-700 mb-2">
              Username
            </label>

            <input
              v-model="userForm.username"
              type="text"
              autocomplete="username"
              class="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Enter username"
            />

          </div>

          <!-- PASSWORD - CREATE ONLY -->

          <div v-if="!isEditMode">

            <label class="block text-sm font-bold text-gray-700 mb-2">
              Password
            </label>

            <input
              v-model="userForm.password"
              type="password"
              autocomplete="new-password"
              class="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Minimum 6 characters"
            />

          </div>

          <!-- ROLE -->

          <div>

            <label class="block text-sm font-bold text-gray-700 mb-2">
              Role
            </label>

            <select
              v-model="userForm.role"
              class="w-full border border-gray-300 rounded-xl px-4 py-3.5 bg-white outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="Admin">
                Admin
              </option>

              <option value="Cashier">
                Cashier
              </option>
            </select>

          </div>

          <!-- ACTIONS -->

          <div class="grid grid-cols-2 gap-3 pt-2">

            <button
              type="button"
              @click="closeUserModal"
              class="min-h-[50px] rounded-xl bg-gray-100 text-gray-700 font-black"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="isSaving"
              class="min-h-[50px] rounded-xl text-white font-black disabled:opacity-60"
              :style="{ backgroundColor: settingsStore.themeColor }"
            >
              {{ isSaving
                ? 'Saving...'
                : (isEditMode ? 'Save Changes' : 'Create User')
              }}
            </button>

          </div>

        </form>

      </div>

    </div>

    <!-- CHANGE PASSWORD MODAL -->

    <div
      v-if="isPasswordModalOpen"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      @click.self="closePasswordModal"
    >

      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">

          <div>

            <h2 class="text-xl font-black text-gray-800">
              Change Password
            </h2>

            <p class="text-xs text-gray-500 mt-1">
              Account: {{ passwordUser?.username }}
            </p>

          </div>

          <button
            type="button"
            @click="closePasswordModal"
            class="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-black"
          >
            ×
          </button>

        </div>

        <form
          @submit.prevent="savePassword"
          class="p-5 space-y-4"
        >

          <div>

            <label class="block text-sm font-bold text-gray-700 mb-2">
              New Password
            </label>

            <input
              v-model="passwordForm.password"
              type="password"
              autocomplete="new-password"
              class="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Minimum 6 characters"
            />

          </div>

          <div>

            <label class="block text-sm font-bold text-gray-700 mb-2">
              Confirm Password
            </label>

            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Repeat new password"
            />

          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
            Siguraduhing tama ang bagong password bago i-save.
          </div>

          <div class="grid grid-cols-2 gap-3 pt-2">

            <button
              type="button"
              @click="closePasswordModal"
              class="min-h-[50px] rounded-xl bg-gray-100 text-gray-700 font-black"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="isChangingPassword"
              class="min-h-[50px] rounded-xl text-white font-black disabled:opacity-60"
              :style="{ backgroundColor: settingsStore.themeColor }"
            >
              {{ isChangingPassword
                ? 'Saving...'
                : 'Change Password'
              }}
            </button>

          </div>

        </form>

      </div>

    </div>

    <!-- DELETE MODAL -->

    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      @click.self="closeDeleteModal"
    >

      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        <div class="p-5">

          <div class="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-4">
            !
          </div>

          <h2 class="text-xl font-black text-gray-800">
            Delete User?
          </h2>

          <p class="text-sm text-gray-500 mt-2 leading-relaxed">
            Sigurado ka bang gusto mong i-delete ang account
            <span class="font-black text-gray-800">
              {{ deletingUser?.username }}
            </span>
            ?
          </p>

          <p class="text-xs text-red-600 font-semibold mt-3">
            Hindi na ito mababawi pagkatapos ma-delete.
          </p>

          <div class="grid grid-cols-2 gap-3 mt-6">

            <button
              type="button"
              @click="closeDeleteModal"
              class="min-h-[50px] rounded-xl bg-gray-100 text-gray-700 font-black"
            >
              Cancel
            </button>

            <button
              type="button"
              @click="confirmDeleteUser"
              :disabled="isDeleting"
              class="min-h-[50px] rounded-xl bg-red-600 text-white font-black disabled:opacity-60"
            >
              {{ isDeleting
                ? 'Deleting...'
                : 'Delete User'
              }}
            </button>

          </div>

        </div>

      </div>

    </div>

  </div>
</template>