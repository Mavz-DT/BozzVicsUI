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
const recordingAttendance = ref([])
const historyAttendance = ref([])

const loading = ref(false)
const recordingLoading = ref(false)
const savingId = ref(null)
const savingAll = ref(false)

const error = ref('')
const success = ref('')

const selectedRecordingDate = ref(
  getTodayPH()
)

const fromDate = ref(
  getTodayPH()
)

const toDate = ref(
  getTodayPH()
)

const selectedEmployee = ref('')

const isAdmin = computed(() => {
  return auth.user?.role === 'Admin'
})

const isCashier = computed(() => {
  return auth.user?.role === 'Cashier'
})

const getToken = () => {
  return (
    auth.getToken?.() ||
    localStorage.getItem('token') ||
    ''
  )
}

const getAuthHeaders = () => {
  const token = getToken()

  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {}
}

function getTodayPH() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

const statusOptions = [
  'Present',
  'Absent',
  'OT',
  'Vacation Leave',
  'Sick Leave'
]

const statusClass = status => {
  switch (status) {
    case 'Present':
      return 'bg-green-100 text-green-700 border-green-200'

    case 'Absent':
      return 'bg-red-100 text-red-700 border-red-200'

    case 'OT':
      return 'bg-blue-100 text-blue-700 border-blue-200'

    case 'Vacation Leave':
      return 'bg-purple-100 text-purple-700 border-purple-200'

    case 'Sick Leave':
      return 'bg-orange-100 text-orange-700 border-orange-200'

    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

const formatDate = date => {
  if (!date) return '-'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  ).format(parsed)
}

const formatDateLong = date => {
  if (!date) return '-'

  const parsed = new Date(
    `${date}T00:00:00+08:00`
  )

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  ).format(parsed)
}

const getDateInputValue = date => {
  if (!date) return ''

  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  ).format(new Date(date))
}

const clearMessages = () => {
  error.value = ''
  success.value = ''
}

// =====================================================
// API
// =====================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API = `${API_BASE_URL}/api`

// =====================================================
// RESPONSE HELPERS
// =====================================================

const extractArray = data => {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.employees)) {
    return data.employees
  }

  if (Array.isArray(data?.attendance)) {
    return data.attendance
  }

  if (Array.isArray(data?.records)) {
    return data.records
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  return []
}

const parseResponse = async res => {
  const text = await res.text()

  if (!text) {
    if (!res.ok) {
      throw new Error(
        `Request failed with status ${res.status}.`
      )
    }

    return null
  }

  let result = null

  try {
    result = JSON.parse(text)
  } catch {
    throw new Error(
      'Hindi valid JSON ang response ng server. I-check ang API URL at backend.'
    )
  }

  if (!res.ok) {
    throw new Error(
      result?.message ||
      `Request failed with status ${res.status}.`
    )
  }

  return result
}

const fetchJson = async (
  url,
  options = {}
) => {
  const res = await fetch(
    url,
    options
  )

  return parseResponse(res)
}

/*
|--------------------------------------------------------------------------
| Employees
|--------------------------------------------------------------------------
*/

const fetchEmployees = async () => {
  try {
    const result = await fetchJson(
      `${API}/attendance/employees`,
      {
        headers: {
          ...getAuthHeaders()
        }
      }
    )

    employees.value = extractArray(result)
  } catch (err) {
    console.error(
      'fetchEmployees error:',
      err
    )

    employees.value = []

    error.value =
      err.message ||
      'Failed to fetch employees.'
  }
}

/*
|--------------------------------------------------------------------------
| Recording Attendance
|--------------------------------------------------------------------------
*/

const fetchRecordingAttendance = async () => {
  recordingLoading.value = true

  try {
    const params = new URLSearchParams()

    params.set(
      'from',
      selectedRecordingDate.value
    )

    params.set(
      'to',
      selectedRecordingDate.value
    )

    const result = await fetchJson(
      `${API}/attendance?${params.toString()}`,
      {
        headers: {
          ...getAuthHeaders()
        }
      }
    )

    recordingAttendance.value =
      extractArray(result)
  } catch (err) {
    console.error(
      'fetchRecordingAttendance error:',
      err
    )

    recordingAttendance.value = []

    error.value =
      err.message ||
      'Failed to fetch attendance.'
  } finally {
    recordingLoading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| Attendance Rows for Recording
|--------------------------------------------------------------------------
*/

const recordingRows = computed(() => {
  const employeeList =
    Array.isArray(employees.value)
      ? employees.value
      : []

  const attendanceList =
    Array.isArray(recordingAttendance.value)
      ? recordingAttendance.value
      : []

  return employeeList.map(employee => {
    const record =
      attendanceList.find(
        item =>
          item.employee?._id ===
          employee._id
      )

    return {
      employee,
      status: record?.status || '',
      remarks: record?.remarks || '',
      saved: Boolean(record?._id)
    }
  })
})

/*
|--------------------------------------------------------------------------
| Update local row
|--------------------------------------------------------------------------
*/

const updateRecordingStatus = (
  employeeId,
  status
) => {
  const row = recordingRows.value.find(
    item =>
      item.employee._id === employeeId
  )

  if (!row) return

  row.status = status
}

const updateRecordingRemarks = (
  employeeId,
  remarks
) => {
  const row = recordingRows.value.find(
    item =>
      item.employee._id === employeeId
  )

  if (!row) return

  row.remarks = remarks
}

/*
|--------------------------------------------------------------------------
| Save One Attendance
|--------------------------------------------------------------------------
*/

const saveAttendance = async row => {
  clearMessages()

  if (!row.status) {
    error.value =
      `Pumili muna ng status para kay ${row.employee.name}.`

    return
  }

  savingId.value = row.employee._id

  try {
    const result = await fetchJson(
      `${API}/attendance`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          ...getAuthHeaders()
        },

        body: JSON.stringify({
          employeeId:
            row.employee._id,

          date:
            selectedRecordingDate.value,

          status:
            row.status,

          remarks:
            row.remarks || ''
        })
      }
    )

    console.log(
      'Attendance saved:',
      result
    )

    success.value =
      `Attendance ni ${row.employee.name} ay na-save.`

    await fetchRecordingAttendance()
  } catch (err) {
    console.error(
      'saveAttendance error:',
      err
    )

    error.value =
      err.message ||
      'Failed to save attendance.'
  } finally {
    savingId.value = null
  }
}

/*
|--------------------------------------------------------------------------
| Mark All Present
|--------------------------------------------------------------------------
*/

const markAllPresent = () => {
  recordingRows.value.forEach(row => {
    row.status = 'Present'
  })

  clearMessages()

  success.value =
    'Lahat ng employees ay na-mark na Present.'
}

/*
|--------------------------------------------------------------------------
| Save All Attendance
|--------------------------------------------------------------------------
*/

const saveAllAttendance = async () => {
  clearMessages()

  const rows =
    Array.isArray(recordingRows.value)
      ? recordingRows.value
      : []

  if (rows.length === 0) {
    error.value =
      'Walang employees na ise-save.'

    return
  }

  const incomplete =
    rows.find(
      row => !row.status
    )

  if (incomplete) {
    error.value =
      `Pumili muna ng attendance status para kay ${incomplete.employee.name}.`

    return
  }

  savingAll.value = true

  try {
    const responses =
      await Promise.all(
        rows.map(row => {
          return fetch(
            `${API}/attendance`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                ...getAuthHeaders()
              },

              body: JSON.stringify({
                employeeId:
                  row.employee._id,

                date:
                  selectedRecordingDate.value,

                status:
                  row.status,

                remarks:
                  row.remarks || ''
              })
            }
          )
        })
      )

    const failed =
      responses.find(
        response => !response.ok
      )

    if (failed) {
      const text =
        await failed.text()

      let result = null

      try {
        result = text
          ? JSON.parse(text)
          : null
      } catch {
        result = null
      }

      throw new Error(
        result?.message ||
        'May attendance record na hindi na-save.'
      )
    }

    success.value =
      'Lahat ng attendance ay successfully na-save.'

    await fetchRecordingAttendance()
  } catch (err) {
    console.error(
      'saveAllAttendance error:',
      err
    )

    error.value =
      err.message ||
      'Failed to save all attendance.'
  } finally {
    savingAll.value = false
  }
}

/*
|--------------------------------------------------------------------------
| Admin Recording Date
|--------------------------------------------------------------------------
*/

const changeRecordingDate = async () => {
  clearMessages()

  if (
    isAdmin.value &&
    selectedRecordingDate.value
  ) {
    await fetchRecordingAttendance()
  }
}

/*
|--------------------------------------------------------------------------
| Admin History
|--------------------------------------------------------------------------
*/

const fetchHistoryAttendance = async () => {
  loading.value = true

  try {
    const params = new URLSearchParams()

    params.set(
      'from',
      fromDate.value
    )

    params.set(
      'to',
      toDate.value
    )

    if (selectedEmployee.value) {
      params.set(
        'employeeId',
        selectedEmployee.value
      )
    }

    const result = await fetchJson(
      `${API}/attendance?${params.toString()}`,
      {
        headers: {
          ...getAuthHeaders()
        }
      }
    )

    historyAttendance.value =
      extractArray(result)
  } catch (err) {
    console.error(
      'fetchHistoryAttendance error:',
      err
    )

    historyAttendance.value = []

    error.value =
      err.message ||
      'Failed to fetch attendance history.'
  } finally {
    loading.value = false
  }
}

const handleAdminFilter = async () => {
  clearMessages()

  if (
    fromDate.value >
    toDate.value
  ) {
    error.value =
      'From date cannot be later than To date.'

    return
  }

  await fetchHistoryAttendance()
}

const clearAdminFilter = async () => {
  selectedEmployee.value = ''
  fromDate.value = getTodayPH()
  toDate.value = getTodayPH()

  await fetchHistoryAttendance()
}

/*
|--------------------------------------------------------------------------
| History Summary
|--------------------------------------------------------------------------
*/

const historySummary = computed(() => {
  const counts = {
    Present: 0,
    Absent: 0,
    OT: 0,
    'Vacation Leave': 0,
    'Sick Leave': 0
  }

  const records =
    Array.isArray(historyAttendance.value)
      ? historyAttendance.value
      : []

  records.forEach(
    record => {
      if (
        counts[record.status] !==
        undefined
      ) {
        counts[record.status]++
      }
    }
  )

  return counts
})

const getEmployeeName = record => {
  return (
    record.employee?.name ||
    'Unknown Employee'
  )
}

const getRecordedBy = record => {
  return (
    record.recordedBy?.username ||
    '-'
  )
}

/*
|--------------------------------------------------------------------------
| Initial Load
|--------------------------------------------------------------------------
*/

onMounted(async () => {
  await fetchEmployees()

  if (isCashier.value) {
    selectedRecordingDate.value =
      getTodayPH()
  }

  await fetchRecordingAttendance()

  if (isAdmin.value) {
    await fetchHistoryAttendance()
  }
})
</script>

<template>
  <div
    class="p-4 md:p-6 space-y-6"
  >

    <!-- Header -->
    <div
      class="flex flex-col
        xl:flex-row
        xl:items-center
        xl:justify-between
        gap-4"
    >

      <div>
        <h1
          class="text-2xl md:text-3xl
            font-black text-gray-800"
        >
          Attendance
        </h1>

        <p
          class="text-sm
            text-gray-500 mt-1"
        >
          Record at tingnan ang employee attendance.
        </p>
      </div>

      <!-- Admin Recording Date -->

      <div
        v-if="isAdmin"
        class="bg-white
          border border-gray-200
          rounded-2xl
          shadow-sm
          p-4"
      >

        <label
          class="block text-xs
            uppercase
            tracking-wide
            font-black
            text-gray-500 mb-2"
        >
          Record Attendance For
        </label>

        <input
          v-model="selectedRecordingDate"
          type="date"
          class="w-full min-w-[220px]
            px-4 py-3
            rounded-xl
            border border-gray-200
            focus:outline-none
            focus:ring-2"
          @change="changeRecordingDate"
        />

        <p
          class="text-xs
            text-gray-500 mt-2"
        >
          Admin can record attendance for any date.
        </p>

      </div>

      <!-- Cashier Date -->

      <div
        v-else
        class="bg-white
          border border-gray-200
          rounded-2xl
          shadow-sm
          px-4 py-3"
      >

        <div
          class="text-xs
            uppercase
            tracking-wide
            text-gray-400
            font-bold"
        >
          Attendance Date
        </div>

        <div
          class="font-black
            text-gray-800 mt-1"
        >
          {{
            formatDateLong(
              selectedRecordingDate
            )
          }}
        </div>

      </div>

    </div>

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

    <!-- RECORD ATTENDANCE -->

    <div
      class="bg-white
        rounded-2xl
        shadow-sm
        border border-gray-200
        overflow-hidden"
    >

      <!-- Header -->

      <div
        class="px-4 md:px-6 py-4
          border-b border-gray-100
          flex flex-col
          xl:flex-row
          xl:items-center
          xl:justify-between
          gap-4"
      >

        <div>
          <h2
            class="font-black
              text-lg text-gray-800"
          >
            Record Attendance
          </h2>

          <p
            class="text-sm
              text-gray-500 mt-1"
          >
            {{
              formatDateLong(
                selectedRecordingDate
              )
            }}
          </p>
        </div>

        <!-- Actions -->

        <div
          class="flex flex-col
            sm:flex-row
            gap-2"
        >

          <button
            type="button"
            class="min-h-[50px]
              px-5
              rounded-xl
              bg-green-50
              text-green-700
              border border-green-200
              font-black
              hover:bg-green-100
              active:scale-[0.98]
              transition-all
              disabled:opacity-50"
            :disabled="
              savingAll ||
              recordingLoading ||
              employees.length === 0
            "
            @click="markAllPresent"
          >
            ✓ Mark All Present
          </button>

          <button
            type="button"
            class="min-h-[50px]
              px-6
              rounded-xl
              text-white
              font-black
              shadow-sm
              active:scale-[0.98]
              transition-all
              disabled:opacity-50"
            :style="{
              backgroundColor:
                settingsStore.themeColor
            }"
            :disabled="
              savingAll ||
              recordingLoading ||
              employees.length === 0
            "
            @click="saveAllAttendance"
          >
            {{
              savingAll
                ? 'Saving All...'
                : 'Save All Attendance'
            }}
          </button>

        </div>

      </div>

      <!-- Loading -->

      <div
        v-if="recordingLoading"
        class="py-12 flex
          justify-center"
      >

        <div
          class="w-10 h-10
            rounded-full
            border-4
            border-gray-200
            animate-spin"
          :style="{
            borderTopColor:
              settingsStore.themeColor
          }"
        ></div>

      </div>

      <!-- No employees -->

      <div
        v-else-if="employees.length === 0"
        class="py-12 px-6
          text-center"
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
          Walang active employees.
        </p>

        <p
          class="text-sm
            text-gray-500 mt-1"
        >
          Magdagdag muna ng employee.
        </p>

      </div>

      <!-- Employee Rows -->

      <div
        v-else
        class="divide-y
          divide-gray-100"
      >

        <div
          v-for="row in recordingRows"
          :key="row.employee._id"
          class="p-4 md:p-6"
        >

          <!-- Employee -->

          <div
            class="flex flex-col
              md:flex-row
              md:items-center
              md:justify-between
              gap-3 mb-4"
          >

            <div>

              <div
                class="font-black
                  text-lg text-gray-800"
              >
                {{ row.employee.name }}
              </div>

              <div
                v-if="
                  row.employee.employeeCode
                "
                class="text-xs
                  text-gray-500 mt-1"
              >
                Employee Code:
                {{ row.employee.employeeCode }}
              </div>

            </div>

            <div
              v-if="row.saved"
              class="inline-flex
                items-center
                px-3 py-1.5
                rounded-full
                bg-green-50
                text-green-700
                border border-green-200
                text-xs
                font-black
                self-start
                md:self-auto"
            >
              ✓ Saved
            </div>

          </div>

          <!-- Status Buttons -->

          <div
            class="grid
              grid-cols-2
              sm:grid-cols-3
              lg:grid-cols-5
              gap-2"
          >

            <button
              v-for="status in statusOptions"
              :key="status"
              type="button"
              class="min-h-[54px]
                rounded-xl
                border
                px-3 py-2
                text-sm
                font-black
                transition-all
                active:scale-[0.98]"
              :class="
                row.status === status
                  ? statusClass(status)
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              "
              @click="
                updateRecordingStatus(
                  row.employee._id,
                  status
                )
              "
            >
              {{ status }}
            </button>

          </div>

          <!-- Remarks + Save -->

          <div
            class="flex flex-col
              lg:flex-row
              gap-3 mt-4"
          >

            <input
              :value="row.remarks"
              type="text"
              placeholder="Remarks (optional)"
              class="flex-1
                px-4 py-3
                rounded-xl
                border border-gray-200
                focus:outline-none
                focus:ring-2"
              @input="
                updateRecordingRemarks(
                  row.employee._id,
                  $event.target.value
                )
              "
            />

            <button
              type="button"
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
                savingId === row.employee._id ||
                !row.status
              "
              @click="
                saveAttendance(row)
              "
            >
              {{
                savingId === row.employee._id
                  ? 'Saving...'
                  : row.saved
                    ? 'Update Attendance'
                    : 'Save Attendance'
              }}
            </button>

          </div>

        </div>

      </div>

    </div>

    <!-- ADMIN HISTORY -->

    <template v-if="isAdmin">

      <!-- History Filters -->

      <div
        class="bg-white
          rounded-2xl
          shadow-sm
          border border-gray-200
          p-4 md:p-6"
      >

        <div class="mb-4">

          <h2
            class="font-black
              text-lg text-gray-800"
          >
            Attendance History
          </h2>

          <p
            class="text-sm
              text-gray-500 mt-1"
          >
            Pumili ng date range at employee.
          </p>

        </div>

        <div
          class="grid grid-cols-1
            md:grid-cols-2
            xl:grid-cols-4
            gap-4"
        >

          <!-- From -->

          <div>

            <label
              class="block text-xs
                uppercase
                tracking-wide
                font-black
                text-gray-500 mb-2"
            >
              From
            </label>

            <input
              v-model="fromDate"
              type="date"
              class="w-full
                px-4 py-3
                rounded-xl
                border border-gray-200
                focus:outline-none
                focus:ring-2"
            />

          </div>

          <!-- To -->

          <div>

            <label
              class="block text-xs
                uppercase
                tracking-wide
                font-black
                text-gray-500 mb-2"
            >
              To
            </label>

            <input
              v-model="toDate"
              type="date"
              class="w-full
                px-4 py-3
                rounded-xl
                border border-gray-200
                focus:outline-none
                focus:ring-2"
            />

          </div>

          <!-- Employee -->

          <div>

            <label
              class="block text-xs
                uppercase
                tracking-wide
                font-black
                text-gray-500 mb-2"
            >
              Employee
            </label>

            <select
              v-model="selectedEmployee"
              class="w-full
                px-4 py-3
                rounded-xl
                border border-gray-200
                bg-white
                focus:outline-none
                focus:ring-2"
            >

              <option value="">
                All Employees
              </option>

              <option
                v-for="employee in employees"
                :key="employee._id"
                :value="employee._id"
              >
                {{ employee.name }}
              </option>

            </select>

          </div>

          <!-- Filter Buttons -->

          <div
            class="flex items-end gap-2"
          >

            <button
              type="button"
              class="flex-1
                min-h-[48px]
                rounded-xl
                text-white
                font-black"
              :style="{
                backgroundColor:
                  settingsStore.themeColor
              }"
              @click="handleAdminFilter"
            >
              Filter
            </button>

            <button
              type="button"
              class="px-4
                min-h-[48px]
                rounded-xl
                border
                border-gray-200
                text-gray-600
                font-bold
                hover:bg-gray-50"
              @click="clearAdminFilter"
            >
              Clear
            </button>

          </div>

        </div>

      </div>

      <!-- Summary -->

      <div
        class="grid
          grid-cols-2
          md:grid-cols-3
          xl:grid-cols-5
          gap-3"
      >

        <div
          v-for="status in statusOptions"
          :key="status"
          class="bg-white
            rounded-2xl
            border border-gray-200
            shadow-sm
            p-4"
        >

          <div
            class="text-xs
              uppercase
              tracking-wide
              font-black
              text-gray-400"
          >
            {{ status }}
          </div>

          <div
            class="text-2xl
              font-black
              text-gray-800 mt-1"
          >
            {{ historySummary[status] }}
          </div>

        </div>

      </div>

      <!-- History Table -->

      <div
        class="bg-white
          rounded-2xl
          shadow-sm
          border border-gray-200
          overflow-hidden"
      >

        <div
          class="px-4 md:px-6 py-4
            border-b border-gray-100
            flex flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-2"
        >

          <div>

            <h2
              class="font-black
                text-gray-800"
            >
              Attendance Records
            </h2>

            <p
              class="text-sm
                text-gray-500"
            >
              {{ formatDate(fromDate) }}
              <span class="mx-1">–</span>
              {{ formatDate(toDate) }}
            </p>

          </div>

          <div
            class="text-sm
              font-bold
              text-gray-500"
          >
            {{ historyAttendance.length }}
            record(s)
          </div>

        </div>

        <!-- Loading -->

        <div
          v-if="loading"
          class="py-12
            flex justify-center"
        >

          <div
            class="w-10 h-10
              rounded-full
              border-4
              border-gray-200
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
            historyAttendance.length === 0
          "
          class="py-12
            text-center
            text-gray-500
            px-6"
        >

          <div
            class="text-4xl mb-3"
          >
            📋
          </div>

          <p
            class="font-bold
              text-gray-700"
          >
            Walang attendance records.
          </p>

          <p
            class="text-sm mt-1"
          >
            Walang record para sa napiling date range at employee.
          </p>

        </div>

        <!-- Table -->

        <div
          v-else
          class="overflow-x-auto"
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
                    px-4 md:px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Date
                </th>

                <th
                  class="text-left
                    px-4 md:px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Employee
                </th>

                <th
                  class="text-left
                    px-4 md:px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Status
                </th>

                <th
                  class="text-left
                    px-4 md:px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Remarks
                </th>

                <th
                  class="text-left
                    px-4 md:px-6 py-3
                    font-black
                    text-gray-600"
                >
                  Recorded By
                </th>

              </tr>

            </thead>

            <tbody
              class="divide-y
                divide-gray-100"
            >

              <tr
                v-for="record in historyAttendance"
                :key="record._id"
                class="hover:bg-gray-50"
              >

                <td
                  class="px-4 md:px-6 py-4
                    whitespace-nowrap
                    font-semibold
                    text-gray-700"
                >
                  {{ formatDate(record.date) }}
                </td>

                <td
                  class="px-4 md:px-6 py-4"
                >

                  <div
                    class="font-black
                      text-gray-800"
                  >
                    {{ getEmployeeName(record) }}
                  </div>

                  <div
                    v-if="
                      record.employee?.employeeCode
                    "
                    class="text-xs
                      text-gray-400 mt-1"
                  >
                    {{
                      record.employee.employeeCode
                    }}
                  </div>

                </td>

                <td
                  class="px-4 md:px-6 py-4"
                >

                  <span
                    class="inline-flex
                      items-center
                      px-3 py-1.5
                      rounded-full
                      border
                      text-xs
                      font-black"
                    :class="
                      statusClass(
                        record.status
                      )
                    "
                  >
                    {{ record.status }}
                  </span>

                </td>

                <td
                  class="px-4 md:px-6 py-4
                    text-gray-600"
                >
                  {{
                    record.remarks ||
                    '—'
                  }}
                </td>

                <td
                  class="px-4 md:px-6 py-4
                    text-gray-600"
                >
                  {{ getRecordedBy(record) }}
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </template>

  </div>
</template>