<script setup>
import {
  ref,
  computed,
  onMounted
} from 'vue'

import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

const auth = useAuthStore()
const settingsStore = useSettingsStore()

const employees = ref([])

const loading = ref(false)
const saving = ref(false)

const error = ref('')
const success = ref('')

const editingId = ref(null)

const form = ref({
  name: '',
  employeeCode: ''
})

const isAdmin = computed(() => {
  return auth.user?.role === 'Admin'
})

// =====================================================
// API
// =====================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API = `${API_BASE_URL}/api`

// =====================================================
// AUTH
// =====================================================

const getToken = () => {
  let token = ''

  try {
    if (
      typeof auth.getToken === 'function'
    ) {
      token =
        auth.getToken() || ''
    }
  } catch (err) {
    console.warn(
      'Unable to get token from auth store:',
      err
    )
  }

  if (!token) {
    token =
      localStorage.getItem(
        'token'
      ) || ''
  }

  return token
}

const getAuthHeaders = () => {
  const token =
    getToken()

  return token
    ? {
        Authorization:
          `Bearer ${token}`
      }
    : {}
}

// =====================================================
// COMPUTED
// =====================================================

const activeEmployees = computed(() => {
  const list =
    Array.isArray(
      employees.value
    )
      ? employees.value
      : []

  return list.filter(
    employee =>
      employee?.isActive
  )
})

const inactiveEmployees = computed(() => {
  const list =
    Array.isArray(
      employees.value
    )
      ? employees.value
      : []

  return list.filter(
    employee =>
      !employee?.isActive
  )
})

// =====================================================
// HELPERS
// =====================================================

const clearMessages = () => {
  error.value = ''
  success.value = ''
}

const extractEmployeesArray = data => {
  if (Array.isArray(data)) {
    return data
  }

  if (
    Array.isArray(
      data?.employees
    )
  ) {
    return data.employees
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

  if (
    Array.isArray(
      data?.records
    )
  ) {
    return data.records
  }

  return []
}

const parseJsonResponse = async response => {
  const text =
    await response.text()

  if (!text) {
    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}.`
      )
    }

    return null
  }

  let result = null

  try {
    result =
      JSON.parse(text)
  } catch {
    throw new Error(
      'Hindi valid JSON ang response ng server. I-check ang API URL at backend.'
    )
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
      `Request failed with status ${response.status}.`
    )
  }

  return result
}

const fetchJson = async (
  url,
  options = {}
) => {
  const response =
    await fetch(
      url,
      options
    )

  return parseJsonResponse(
    response
  )
}

// =====================================================
// FETCH EMPLOYEES
// =====================================================

const fetchEmployees = async () => {
  clearMessages()
  loading.value = true

  try {
    const token =
      getToken()

    if (!token) {
      throw new Error(
        'Walang authentication token. Mag-login ulit sa POS.'
      )
    }

    const result =
      await fetchJson(
        `${API}/employees`,
        {
          headers:
            getAuthHeaders()
        }
      )

    console.log(
      'Employees API response:',
      result
    )

    employees.value =
      extractEmployeesArray(
        result
      )

  } catch (err) {
    console.error(
      'fetchEmployees error:',
      err
    )

    error.value =
      err.message ||
      'Failed to fetch employees.'

    employees.value = []
  } finally {
    loading.value = false
  }
}

// =====================================================
// FORM
// =====================================================

const resetForm = () => {
  editingId.value = null

  form.value = {
    name: '',
    employeeCode: ''
  }
}

const startEdit = employee => {
  if (!employee) {
    return
  }

  clearMessages()

  editingId.value =
    employee._id

  form.value = {
    name:
      employee.name || '',

    employeeCode:
      employee.employeeCode || ''
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

const cancelEdit = () => {
  resetForm()
}

// =====================================================
// SAVE EMPLOYEE
// =====================================================

const saveEmployee = async () => {
  clearMessages()

  const name =
    form.value.name.trim()

  const employeeCode =
    form.value.employeeCode.trim()

  if (!name) {
    error.value =
      'Employee name is required.'

    return
  }

  saving.value = true

  try {
    const isEditing =
      Boolean(
        editingId.value
      )

    const url = isEditing
      ? `${API}/employees/${editingId.value}`
      : `${API}/employees`

    const method =
      isEditing
        ? 'PUT'
        : 'POST'

    const result =
      await fetchJson(
        url,
        {
          method,

          headers: {
            'Content-Type':
              'application/json',

            ...getAuthHeaders()
          },

          body:
            JSON.stringify({
              name,
              employeeCode
            })
        }
      )

    console.log(
      'Employee save response:',
      result
    )

    success.value =
      isEditing
        ? 'Employee updated successfully.'
        : 'Employee added successfully.'

    resetForm()

    await fetchEmployees()
  } catch (err) {
    console.error(
      'saveEmployee error:',
      err
    )

    error.value =
      err.message ||
      'Failed to save employee.'
  } finally {
    saving.value = false
  }
}

// =====================================================
// TOGGLE EMPLOYEE STATUS
// =====================================================

const toggleEmployeeStatus =
  async employee => {
    if (!employee?._id) {
      return
    }

    clearMessages()

    const action =
      employee.isActive
        ? 'deactivate'
        : 'activate'

    const confirmed =
      window.confirm(
        employee.isActive
          ? `Deactivate ${employee.name}?`
          : `Activate ${employee.name}?`
      )

    if (!confirmed) {
      return
    }

    saving.value = true

    try {
      const result =
        await fetchJson(
          `${API}/employees/${employee._id}/status`,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',

              ...getAuthHeaders()
            },

            body:
              JSON.stringify({
                isActive:
                  !employee.isActive
              })
          }
        )

      console.log(
        'Employee status response:',
        result
      )

      success.value =
        employee.isActive
          ? `${employee.name} has been deactivated.`
          : `${employee.name} has been activated.`

      await fetchEmployees()
    } catch (err) {
      console.error(
        'toggleEmployeeStatus error:',
        err
      )

      error.value =
        err.message ||
        `Failed to ${action} employee.`
    } finally {
      saving.value = false
    }
  }

// =====================================================
// INITIAL LOAD
// =====================================================

onMounted(() => {
  fetchEmployees()
})
</script>

<template>
  <div
    class="p-4 md:p-6 space-y-6"
  >

    <!-- Header -->

    <div
      class="flex flex-col md:flex-row
        md:items-center
        md:justify-between gap-3"
    >

      <div>

        <h1
          class="text-2xl md:text-3xl
            font-black text-gray-800"
        >
          Employee Management
        </h1>

        <p
          class="text-sm text-gray-500 mt-1"
        >
          Magdagdag, mag-edit, at mag-activate
          o deactivate ng employees.
        </p>

      </div>

      <div
        class="flex items-center gap-2
          text-sm font-bold"
      >

        <span
          class="px-3 py-2 rounded-xl
            bg-green-50 text-green-700
            border border-green-200"
        >
          Active:
          {{ activeEmployees.length }}
        </span>

        <span
          class="px-3 py-2 rounded-xl
            bg-gray-50 text-gray-600
            border border-gray-200"
        >
          Inactive:
          {{ inactiveEmployees.length }}
        </span>

      </div>

    </div>

    <!-- Access Check -->

    <div
      v-if="!isAdmin"
      class="bg-white rounded-2xl
        border border-gray-200
        shadow-sm p-8 text-center"
    >

      <div
        class="text-4xl mb-3"
      >
        🔒
      </div>

      <p
        class="font-black text-gray-800"
      >
        Admin access only.
      </p>

    </div>

    <template v-else>

      <!-- Messages -->

      <div
        v-if="success"
        class="rounded-xl
          border border-green-200
          bg-green-50
          text-green-700
          px-4 py-3
          font-semibold"
      >
        {{ success }}
      </div>

      <div
        v-if="error"
        class="rounded-xl
          border border-red-200
          bg-red-50
          text-red-700
          px-4 py-3
          font-semibold"
      >
        {{ error }}
      </div>

      <!-- Add / Edit -->

      <div
        class="bg-white rounded-2xl
          shadow-sm
          border border-gray-200
          p-4 md:p-6"
      >

        <div
          class="flex items-center
            justify-between gap-3 mb-5"
        >

          <div>

            <h2
              class="text-lg font-black
                text-gray-800"
            >
              {{
                editingId
                  ? 'Edit Employee'
                  : 'Add Employee'
              }}
            </h2>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              {{
                editingId
                  ? 'I-update ang employee information.'
                  : 'Magdagdag ng bagong employee.'
              }}
            </p>

          </div>

          <button
            v-if="editingId"
            type="button"
            class="px-4 py-2
              rounded-xl
              border border-gray-200
              text-gray-600
              font-bold
              hover:bg-gray-50"
            @click="cancelEdit"
          >
            Cancel
          </button>

        </div>

        <form
          class="grid grid-cols-1
            md:grid-cols-3 gap-4"
          @submit.prevent="
            saveEmployee
          "
        >

          <!-- Name -->

          <div
            class="md:col-span-2"
          >

            <label
              class="block text-xs
                uppercase
                tracking-wide
                font-black
                text-gray-500 mb-2"
            >
              Employee Name
            </label>

            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              autocomplete="off"
              class="w-full
                px-4 py-3
                rounded-xl
                border border-gray-200
                focus:outline-none
                focus:ring-2"
              :disabled="saving"
            />

          </div>

          <!-- Employee Code -->

          <div>

            <label
              class="block text-xs
                uppercase
                tracking-wide
                font-black
                text-gray-500 mb-2"
            >
              Employee Code
            </label>

            <input
              v-model="form.employeeCode"
              type="text"
              placeholder="Optional"
              autocomplete="off"
              class="w-full
                px-4 py-3
                rounded-xl
                border border-gray-200
                focus:outline-none
                focus:ring-2"
              :disabled="saving"
            />

          </div>

          <!-- Save -->

          <div
            class="md:col-span-3
              flex justify-end"
          >

            <button
              type="submit"
              class="min-h-[48px]
                px-6
                rounded-xl
                text-white
                font-black
                shadow-sm
                disabled:opacity-50
                disabled:cursor-not-allowed"
              :style="{
                backgroundColor:
                  settingsStore.themeColor
              }"
              :disabled="
                saving ||
                !form.name.trim()
              "
            >
              {{
                saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Employee'
                    : 'Add Employee'
              }}
            </button>

          </div>

        </form>

      </div>

      <!-- Employee List -->

      <div
        class="bg-white rounded-2xl
          shadow-sm
          border border-gray-200
          overflow-hidden"
      >

        <div
          class="px-4 md:px-6 py-4
            border-b border-gray-100
            flex items-center
            justify-between gap-3"
        >

          <div>

            <h2
              class="font-black
                text-lg text-gray-800"
            >
              Employees
            </h2>

            <p
              class="text-sm text-gray-500"
            >
              Active at inactive employees.
            </p>

          </div>

          <button
            type="button"
            class="w-10 h-10
              rounded-xl
              border border-gray-200
              text-gray-600
              hover:bg-gray-50
              flex items-center
              justify-center"
            title="Refresh"
            @click="fetchEmployees"
          >
            ↻
          </button>

        </div>

        <!-- Loading -->

        <div
          v-if="loading"
          class="py-12 flex justify-center"
        >

          <div
            class="w-10 h-10 rounded-full
              border-4 border-gray-200
              animate-spin"
            :style="{
              borderTopColor:
                settingsStore.themeColor
            }"
          ></div>

        </div>

        <!-- Empty -->

        <div
          v-else-if="
            employees.length === 0
          "
          class="py-12 text-center px-6"
        >

          <div
            class="text-4xl mb-3"
          >
            👤
          </div>

          <p
            class="font-black
              text-gray-700"
          >
            Wala pang employees.
          </p>

          <p
            class="text-sm
              text-gray-500 mt-1"
          >
            Gamitin ang form sa itaas para magdagdag.
          </p>

        </div>

        <!-- Desktop Table -->

        <div
          v-else
          class="hidden md:block
            overflow-x-auto"
        >

          <table
            class="w-full text-sm"
          >

            <thead
              class="bg-gray-50
                border-b
                border-gray-200"
            >

              <tr>

                <th
                  class="text-left
                    px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Employee
                </th>

                <th
                  class="text-left
                    px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Code
                </th>

                <th
                  class="text-center
                    px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Status
                </th>

                <th
                  class="text-right
                    px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Actions
                </th>

              </tr>

            </thead>

            <tbody
              class="divide-y
                divide-gray-100"
            >

              <tr
                v-for="employee in employees"
                :key="employee._id"
                class="hover:bg-gray-50"
              >

                <td
                  class="px-6 py-4"
                >

                  <div
                    class="font-black
                      text-gray-800"
                  >
                    {{ employee.name }}
                  </div>

                </td>

                <td
                  class="px-6 py-4
                    text-gray-500"
                >
                  {{
                    employee.employeeCode ||
                    '—'
                  }}
                </td>

                <td
                  class="px-6 py-4
                    text-center"
                >

                  <span
                    class="inline-flex
                      px-3 py-1
                      rounded-full
                      text-xs
                      font-black
                      border"
                    :class="
                      employee.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    "
                  >
                    {{
                      employee.isActive
                        ? 'Active'
                        : 'Inactive'
                    }}
                  </span>

                </td>

                <td
                  class="px-6 py-4"
                >

                  <div
                    class="flex
                      justify-end
                      gap-2"
                  >

                    <button
                      type="button"
                      class="px-3 py-2
                        rounded-lg
                        border
                        border-blue-200
                        text-blue-600
                        hover:bg-blue-50
                        font-bold"
                      @click="
                        startEdit(employee)
                      "
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      class="px-3 py-2
                        rounded-lg
                        border
                        font-bold"
                      :class="
                        employee.isActive
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      "
                      :disabled="saving"
                      @click="
                        toggleEmployeeStatus(
                          employee
                        )
                      "
                    >
                      {{
                        employee.isActive
                          ? 'Deactivate'
                          : 'Activate'
                      }}
                    </button>

                  </div>

                </td>

              </tr>

            </tbody>

          </table>

        </div>

        <!-- Mobile Cards -->

        <div
          v-if="
            employees.length > 0
          "
          class="md:hidden
            divide-y divide-gray-100"
        >

          <div
            v-for="employee in employees"
            :key="
              `mobile-${employee._id}`
            "
            class="p-4"
          >

            <div
              class="flex items-start
                justify-between gap-3"
            >

              <div
                class="min-w-0"
              >

                <div
                  class="font-black
                    text-gray-800"
                >
                  {{ employee.name }}
                </div>

                <div
                  class="text-xs
                    text-gray-500 mt-1"
                >
                  Code:
                  {{
                    employee.employeeCode ||
                    '—'
                  }}
                </div>

              </div>

              <span
                class="shrink-0
                  inline-flex
                  px-2.5 py-1
                  rounded-full
                  text-xs
                  font-black
                  border"
                :class="
                  employee.isActive
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                "
              >
                {{
                  employee.isActive
                    ? 'Active'
                    : 'Inactive'
                }}
              </span>

            </div>

            <div
              class="grid grid-cols-2
                gap-2 mt-4"
            >

              <button
                type="button"
                class="min-h-[44px]
                  rounded-xl
                  border
                  border-blue-200
                  text-blue-600
                  hover:bg-blue-50
                  font-bold"
                @click="
                  startEdit(employee)
                "
              >
                Edit
              </button>

              <button
                type="button"
                class="min-h-[44px]
                  rounded-xl
                  border
                  font-bold"
                :class="
                  employee.isActive
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-600 hover:bg-green-50'
                "
                :disabled="saving"
                @click="
                  toggleEmployeeStatus(
                    employee
                  )
                "
              >
                {{
                  employee.isActive
                    ? 'Deactivate'
                    : 'Activate'
                }}
              </button>

            </div>

          </div>

        </div>

      </div>

    </template>

  </div>
</template>