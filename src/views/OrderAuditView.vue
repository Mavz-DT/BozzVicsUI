<script setup>
import {
  ref,
  computed,
  onMounted
} from 'vue'

import axios from 'axios'

import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

const auth = useAuthStore()
const settingsStore = useSettingsStore()

/*
|--------------------------------------------------------------------------
| State
|--------------------------------------------------------------------------
*/

const salesAudit = ref({
  date: '',
  voided: [],
  edited: []
})

const selectedDate = ref('')
const isLoading = ref(false)
const error = ref('')

const selectedRecord = ref(null)
const selectedRecordType = ref('')

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatAmount = amount => {
  return `₱${Number(amount || 0).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )}`
}

const formatDateTime = value => {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString(
    'en-PH',
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila'
    }
  )
}

const formatDateOnly = value => {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString(
    'en-PH',
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: 'Asia/Manila'
    }
  )
}

const getTodayPhilippineDate = () => {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  ).format(new Date())
}

const getAuthHeaders = () => {
  const token =
    typeof auth.getToken === 'function'
      ? auth.getToken()
      : ''

  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {}
}

/*
|--------------------------------------------------------------------------
| Computed
|--------------------------------------------------------------------------
*/

const isAdmin = computed(() => {
  return auth.user?.role === 'Admin'
})

const voidedOrders = computed(() => {
  return salesAudit.value.voided || []
})

const editedOrders = computed(() => {
  return salesAudit.value.edited || []
})

const totalVoidedAmount = computed(() => {
  return voidedOrders.value.reduce(
    (total, order) =>
      total + Number(order.amount || 0),
    0
  )
})

const totalEditedAdjustments = computed(() => {
  return editedOrders.value.reduce(
    (total, edit) => {
      const amount =
        Number(edit.adjustmentAmount || 0)

      return (
        total +
        (
          edit.editType === 'Refund'
            ? -amount
            : amount
        )
      )
    },
    0
  )
})

/*
|--------------------------------------------------------------------------
| Fetch
|--------------------------------------------------------------------------
*/

const fetchAuditRecords = async () => {
  if (!selectedDate.value) {
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const response = await axios.get(
      '/api/orders/audit-records',
      {
        params: {
          date: selectedDate.value
        },
        headers: getAuthHeaders()
      }
    )

    salesAudit.value = {
      date:
        response.data?.date ||
        selectedDate.value,

      voided:
        response.data?.voided || [],

      edited:
        response.data?.edited || []
    }
  } catch (err) {
    console.error(
      'fetchAuditRecords error:',
      err
    )

    salesAudit.value = {
      date: selectedDate.value,
      voided: [],
      edited: []
    }

    error.value =
      err?.response?.data?.message ||
      'Failed to load order audit records.'
  } finally {
    isLoading.value = false
  }
}

const handleDateChange = () => {
  fetchAuditRecords()
}

/*
|--------------------------------------------------------------------------
| View Details
|--------------------------------------------------------------------------
*/

const openVoidDetails = order => {
  selectedRecord.value = order
  selectedRecordType.value = 'Void'
}

const openEditDetails = edit => {
  selectedRecord.value = edit
  selectedRecordType.value = 'Edit'
}

const closeDetails = () => {
  selectedRecord.value = null
  selectedRecordType.value = ''
}

/*
|--------------------------------------------------------------------------
| Item helpers
|--------------------------------------------------------------------------
*/

const itemAddOnTotal = item => {
  return (item?.addOns || []).reduce(
    (total, addOn) =>
      total + Number(addOn.price || 0),
    0
  )
}

const itemUnitTotal = item => {
  return (
    Number(item?.price || 0) +
    itemAddOnTotal(item)
  )
}

onMounted(() => {
  selectedDate.value =
    getTodayPhilippineDate()

  fetchAuditRecords()
})
</script>

<template>
  <div
    class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
  >

    <!-- ====================================================== -->
    <!-- HEADER -->
    <!-- ====================================================== -->

    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
    >

      <div>

        <h1
          class="text-2xl md:text-3xl font-black text-gray-800"
        >
          Order Audit Records
        </h1>

        <p
          class="text-sm text-gray-500 mt-1"
        >
          Review voided and edited orders.
          Admin access only.
        </p>

      </div>

      <div
        class="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
      >

        <label
          class="block text-xs font-bold text-gray-500 mb-1"
        >
          Review Date
        </label>

        <input
          v-model="selectedDate"
          @change="handleDateChange"
          type="date"
          class="border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-200"
        />

      </div>

    </div>

    <!-- ====================================================== -->
    <!-- ADMIN NOTICE -->
    <!-- ====================================================== -->

    <div
      v-if="!isAdmin"
      class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 font-bold"
    >
      Admin access is required to view these records.
    </div>

    <!-- ====================================================== -->
    <!-- ERROR -->
    <!-- ====================================================== -->

    <div
      v-if="error"
      class="bg-red-100 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium"
    >
      {{ error }}
    </div>

    <template v-if="isAdmin">

      <!-- ================================================== -->
      <!-- SUMMARY CARDS -->
      <!-- ================================================== -->

      <div
        class="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >

        <!-- VOIDED COUNT -->

        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <p
            class="text-xs font-bold text-gray-500 uppercase tracking-wide"
          >
            Voided Orders
          </p>

          <p
            class="text-3xl font-black text-red-600 mt-2"
          >
            {{ voidedOrders.length }}
          </p>

          <p
            class="text-sm text-gray-500 mt-1"
          >
            {{ formatAmount(totalVoidedAmount) }}
          </p>

        </div>

        <!-- EDITED COUNT -->

        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <p
            class="text-xs font-bold text-gray-500 uppercase tracking-wide"
          >
            Edited Records
          </p>

          <p
            class="text-3xl font-black text-blue-600 mt-2"
          >
            {{ editedOrders.length }}
          </p>

          <p
            class="text-sm text-gray-500 mt-1"
          >
            Adjustments / refunds recorded
          </p>

        </div>

        <!-- NET EDIT EFFECT -->

        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <p
            class="text-xs font-bold text-gray-500 uppercase tracking-wide"
          >
            Edit Effect
          </p>

          <p
            class="text-3xl font-black mt-2"
            :class="
              totalEditedAdjustments >= 0
                ? 'text-green-600'
                : 'text-red-600'
            "
          >
            {{
              totalEditedAdjustments >= 0
                ? '+'
                : ''
            }}{{
              formatAmount(
                totalEditedAdjustments
              )
            }}
          </p>

          <p
            class="text-sm text-gray-500 mt-1"
          >
            Positive = added amount,
            negative = refund
          </p>

        </div>

      </div>

      <!-- ================================================== -->
      <!-- LOADING -->
      <!-- ================================================== -->

      <div
        v-if="isLoading"
        class="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500"
      >
        Loading audit records...
      </div>

      <template v-else>

        <!-- ================================================ -->
        <!-- VOIDED ORDERS -->
        <!-- ================================================ -->

        <section class="space-y-4">

          <div
            class="flex items-center justify-between gap-3"
          >

            <div>

              <h2
                class="text-xl font-black text-gray-800"
              >
                Voided Orders
              </h2>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Orders that were voided on
                {{ selectedDate }}.
              </p>

            </div>

            <span
              class="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black"
            >
              {{ voidedOrders.length }}
            </span>

          </div>

          <div
            v-if="voidedOrders.length === 0"
            class="bg-white border border-gray-200 rounded-2xl p-12 text-center"
          >

            <div
              class="text-4xl mb-3"
            >
              ✓
            </div>

            <h3
              class="font-black text-gray-700"
            >
              No Voided Orders
            </h3>

            <p
              class="text-sm text-gray-400 mt-1"
            >
              Walang voided orders sa napiling araw.
            </p>

          </div>

          <div
            v-else
            class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
          >

            <div class="overflow-x-auto">

              <table
                class="w-full text-sm text-left"
              >

                <thead
                  class="bg-red-50 border-b border-red-100"
                >

                  <tr>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Voided Time
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Order
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Customer
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Cashier
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Voided By
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Reason
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700 text-right"
                    >
                      Amount
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700 text-center"
                    >
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody
                  class="divide-y divide-gray-100"
                >

                  <tr
                    v-for="order in voidedOrders"
                    :key="order._id"
                    class="hover:bg-red-50"
                  >

                    <td
                      class="px-4 py-4 text-gray-500 whitespace-nowrap"
                    >
                      {{ formatDateTime(order.voidedAt) }}
                    </td>

                    <td
                      class="px-4 py-4 font-black text-gray-800"
                    >
                      {{
                        order.orderNumber
                          ? `#${order.orderNumber}`
                          : '—'
                      }}
                    </td>

                    <td
                      class="px-4 py-4"
                    >
                      <p
                        class="font-bold text-gray-800"
                      >
                        {{
                          order.customer?.name ||
                          'Walk-in'
                        }}
                      </p>

                      <p
                        class="text-xs text-gray-500 mt-0.5"
                      >
                        {{
                          order.orderType ||
                          '—'
                        }}
                      </p>
                    </td>

                    <td
                      class="px-4 py-4 text-gray-600"
                    >
                      {{
                        order.cashier?.username ||
                        '—'
                      }}
                    </td>

                    <td
                      class="px-4 py-4 text-gray-600"
                    >
                      {{
                        order.voidedBy?.username ||
                        '—'
                      }}
                    </td>

                    <td
                      class="px-4 py-4 text-gray-600 max-w-xs"
                    >
                      <p class="truncate">
                        {{
                          order.voidReason ||
                          'No reason provided'
                        }}
                      </p>
                    </td>

                    <td
                      class="px-4 py-4 text-right font-black text-red-600 whitespace-nowrap"
                    >
                      {{
                        formatAmount(
                          order.amount
                        )
                      }}
                    </td>

                    <td
                      class="px-4 py-4 text-center"
                    >

                      <button
                        type="button"
                        @click="
                          openVoidDetails(
                            order
                          )
                        "
                        class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        title="View void details"
                      >

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                          stroke="currentColor"
                          class="w-5 h-5"
                        >

                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6S2.25 12 2.25 12Z"
                          />

                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          />

                        </svg>

                      </button>

                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </div>

        </section>

        <!-- ================================================ -->
        <!-- EDITED ORDERS -->
        <!-- ================================================ -->

        <section
          class="space-y-4 pt-4"
        >

          <div
            class="flex items-center justify-between gap-3"
          >

            <div>

              <h2
                class="text-xl font-black text-gray-800"
              >
                Edited Orders
              </h2>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Order edits and refunds recorded on
                {{ selectedDate }}.
              </p>

            </div>

            <span
              class="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black"
            >
              {{ editedOrders.length }}
            </span>

          </div>

          <div
            v-if="editedOrders.length === 0"
            class="bg-white border border-gray-200 rounded-2xl p-12 text-center"
          >

            <div
              class="text-4xl mb-3"
            >
              ✓
            </div>

            <h3
              class="font-black text-gray-700"
            >
              No Edited Orders
            </h3>

            <p
              class="text-sm text-gray-400 mt-1"
            >
              Walang adjustment o refund sa napiling araw.
            </p>

          </div>

          <div
            v-else
            class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
          >

            <div class="overflow-x-auto">

              <table
                class="w-full text-sm text-left"
              >

                <thead
                  class="bg-blue-50 border-b border-blue-100"
                >

                  <tr>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Edited Time
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Order
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Customer
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Type
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700"
                    >
                      Edited By
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700 text-right"
                    >
                      Before
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700 text-right"
                    >
                      Change
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700 text-right"
                    >
                      After
                    </th>

                    <th
                      class="px-4 py-3 font-bold text-gray-700 text-center"
                    >
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody
                  class="divide-y divide-gray-100"
                >

                  <tr
                    v-for="edit in editedOrders"
                    :key="edit._id"
                    class="hover:bg-blue-50"
                  >

                    <td
                      class="px-4 py-4 text-gray-500 whitespace-nowrap"
                    >
                      {{
                        formatDateTime(
                          edit.editedAt
                        )
                      }}
                    </td>

                    <td
                      class="px-4 py-4 font-black text-gray-800"
                    >
                      {{
                        edit.orderNumber
                          ? `#${edit.orderNumber}`
                          : '—'
                      }}
                    </td>

                    <td
                      class="px-4 py-4"
                    >
                      <p
                        class="font-bold text-gray-800"
                      >
                        {{
                          edit.customer?.name ||
                          'Walk-in'
                        }}
                      </p>

                      <p
                        class="text-xs text-gray-500 mt-0.5"
                      >
                        {{
                          edit.orderType ||
                          '—'
                        }}
                      </p>
                    </td>

                    <td
                      class="px-4 py-4"
                    >

                      <span
                        v-if="
                          edit.editType ===
                          'Refund'
                        "
                        class="inline-flex px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold"
                      >
                        Refund
                      </span>

                      <span
                        v-else
                        class="inline-flex px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"
                      >
                        Adjustment
                      </span>

                    </td>

                    <td
                      class="px-4 py-4 text-gray-600"
                    >
                      {{
                        edit.editedBy?.username ||
                        '—'
                      }}
                    </td>

                    <td
                      class="px-4 py-4 text-right font-bold text-gray-700 whitespace-nowrap"
                    >
                      {{
                        formatAmount(
                          edit.beforeAmount
                        )
                      }}
                    </td>

                    <td
                      class="px-4 py-4 text-right font-black whitespace-nowrap"
                      :class="
                        edit.editType ===
                        'Refund'
                          ? 'text-red-600'
                          : 'text-green-600'
                      "
                    >
                      {{
                        edit.editType ===
                        'Refund'
                          ? '-'
                          : '+'
                      }}{{
                        formatAmount(
                          edit.adjustmentAmount
                        )
                      }}
                    </td>

                    <td
                      class="px-4 py-4 text-right font-black text-gray-800 whitespace-nowrap"
                    >
                      {{
                        formatAmount(
                          edit.afterAmount
                        )
                      }}
                    </td>

                    <td
                      class="px-4 py-4 text-center"
                    >

                      <button
                        type="button"
                        @click="
                          openEditDetails(
                            edit
                          )
                        "
                        class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        title="View edit details"
                      >

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                          stroke="currentColor"
                          class="w-5 h-5"
                        >

                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6S2.25 12 2.25 12Z"
                          />

                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          />

                        </svg>

                      </button>

                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </div>

        </section>

      </template>

    </template>

    <!-- ====================================================== -->
    <!-- DETAILS MODAL -->
    <!-- ====================================================== -->

    <div
      v-if="selectedRecord"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      @click.self="closeDetails"
    >

      <div
        class="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl overflow-y-auto"
      >

        <!-- MODAL HEADER -->

        <div
          class="p-5 text-white flex justify-between items-center sticky top-0 z-10"
          :style="{
            backgroundColor:
              settingsStore.themeColor
          }"
        >

          <div>

            <h2
              class="text-xl font-black"
            >
              {{
                selectedRecordType ===
                'Void'
                  ? 'Voided Order Details'
                  : 'Edited Order Details'
              }}
            </h2>

            <p
              class="text-xs text-white/70 mt-1"
            >
              Admin review
            </p>

          </div>

          <button
            type="button"
            @click="closeDetails"
            class="text-white/80 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>

        </div>

        <div class="p-6 space-y-5">

          <!-- ============================================ -->
          <!-- VOID DETAILS -->
          <!-- ============================================ -->

          <template
            v-if="
              selectedRecordType ===
              'Void'
            "
          >

            <div
              class="bg-red-50 border border-red-200 rounded-xl p-4"
            >

              <div
                class="flex items-center justify-between gap-3"
              >

                <span
                  class="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black"
                >
                  VOIDED
                </span>

                <span
                  class="font-black text-red-600"
                >
                  {{
                    formatAmount(
                      selectedRecord.amount
                    )
                  }}
                </span>

              </div>

            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >

              <div>
                <p class="text-xs text-gray-500">
                  Order
                </p>

                <p class="font-black text-gray-800 mt-1">
                  {{
                    selectedRecord.orderNumber
                      ? `#${selectedRecord.orderNumber}`
                      : '—'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Order Type
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    selectedRecord.orderType ||
                    '—'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Customer
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    selectedRecord.customer?.name ||
                    'Walk-in'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Cashier
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    selectedRecord.cashier?.username ||
                    '—'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Voided By
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    selectedRecord.voidedBy?.username ||
                    '—'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Voided At
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    formatDateTime(
                      selectedRecord.voidedAt
                    )
                  }}
                </p>
              </div>

            </div>

            <div
              class="bg-gray-50 border border-gray-200 rounded-xl p-4"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Void Reason
              </p>

              <p
                class="text-gray-800 font-semibold mt-2 whitespace-pre-wrap"
              >
                {{
                  selectedRecord.voidReason ||
                  'No reason provided.'
                }}
              </p>

            </div>

            <!-- VOID ITEMS -->

            <div
              v-if="
                selectedRecord.items?.length
              "
              class="border border-gray-200 rounded-xl overflow-hidden"
            >

              <div
                class="px-4 py-3 bg-gray-50 border-b border-gray-200"
              >
                <p
                  class="font-black text-gray-700"
                >
                  Order Items
                </p>
              </div>

              <div
                class="divide-y divide-gray-100"
              >

                <div
                  v-for="item in selectedRecord.items"
                  :key="
                    `${selectedRecord._id}-${item.menuId || item.name}`
                  "
                  class="p-4"
                >

                  <div
                    class="flex justify-between gap-3"
                  >

                    <div>

                      <p
                        class="font-bold text-gray-800"
                      >
                        {{ item.quantity }}x
                        {{ item.name }}
                      </p>

                      <p
                        class="text-xs text-gray-500 mt-1"
                      >
                        {{
                          formatAmount(
                            itemUnitTotal(
                              item
                            )
                          )
                        }}
                        each
                      </p>

                    </div>

                    <p
                      class="font-black text-gray-800 whitespace-nowrap"
                    >
                      {{
                        formatAmount(
                          item.subtotal
                        )
                      }}
                    </p>

                  </div>

                  <div
                    v-if="item.addOns?.length"
                    class="mt-2 text-xs text-gray-500"
                  >
                    Add-ons:
                    {{
                      item.addOns
                        .map(
                          addOn =>
                            `${addOn.name} (${formatAmount(addOn.price)})`
                        )
                        .join(', ')
                    }}
                  </div>

                  <div
                    v-if="item.specialInstructions"
                    class="mt-2 text-xs text-orange-600"
                  >
                    Note:
                    {{
                      item.specialInstructions
                    }}
                  </div>

                </div>

              </div>

            </div>

            <!-- VOID TOTALS -->

            <div
              class="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2"
            >

              <div
                class="flex justify-between"
              >

                <span class="text-gray-600">
                  Gross
                </span>

                <span class="font-bold">
                  {{
                    formatAmount(
                      selectedRecord.grossAmount
                    )
                  }}
                </span>

              </div>

              <div
                v-if="
                  Number(
                    selectedRecord.discountAmount ||
                    0
                  ) > 0
                "
                class="flex justify-between"
              >

                <span class="text-gray-600">
                  Discount
                </span>

                <span class="font-bold text-red-600">
                  -{{
                    formatAmount(
                      selectedRecord.discountAmount
                    )
                  }}
                </span>

              </div>

              <div
                v-if="
                  Number(
                    selectedRecord.deliveryFee ||
                    0
                  ) > 0
                "
                class="flex justify-between"
              >

                <span class="text-gray-600">
                  Delivery Fee
                </span>

                <span class="font-bold text-blue-600">
                  +{{
                    formatAmount(
                      selectedRecord.deliveryFee
                    )
                  }}
                </span>

              </div>

              <div
                class="pt-2 border-t border-gray-200 flex justify-between"
              >

                <span
                  class="font-black text-gray-800"
                >
                  Net Amount
                </span>

                <span
                  class="font-black text-red-600"
                >
                  {{
                    formatAmount(
                      selectedRecord.netAmount
                    )
                  }}
                </span>

              </div>

            </div>

          </template>

          <!-- ============================================ -->
          <!-- EDIT DETAILS -->
          <!-- ============================================ -->

          <template
            v-else
          >

            <div
              class="bg-blue-50 border border-blue-200 rounded-xl p-4"
            >

              <div
                class="flex justify-between items-center gap-3"
              >

                <div>

                  <span
                    v-if="
                      selectedRecord.editType ===
                      'Refund'
                    "
                    class="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black"
                  >
                    REFUND
                  </span>

                  <span
                    v-else
                    class="inline-flex px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black"
                  >
                    ADJUSTMENT
                  </span>

                </div>

                <span
                  class="font-black"
                  :class="
                    selectedRecord.editType ===
                    'Refund'
                      ? 'text-red-600'
                      : 'text-green-600'
                  "
                >
                  {{
                    selectedRecord.editType ===
                    'Refund'
                      ? '-'
                      : '+'
                  }}{{
                    formatAmount(
                      selectedRecord.adjustmentAmount
                    )
                  }}
                </span>

              </div>

            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >

              <div>
                <p class="text-xs text-gray-500">
                  Order
                </p>

                <p class="font-black text-gray-800 mt-1">
                  {{
                    selectedRecord.orderNumber
                      ? `#${selectedRecord.orderNumber}`
                      : '—'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Order Type
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    selectedRecord.orderType ||
                    '—'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Customer
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    selectedRecord.customer?.name ||
                    'Walk-in'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Edited By
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    selectedRecord.editedBy?.username ||
                    '—'
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Edited At
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    formatDateTime(
                      selectedRecord.editedAt
                    )
                  }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500">
                  Payment Method
                </p>

                <p class="font-bold text-gray-800 mt-1">
                  {{
                    selectedRecord.paymentMethod ||
                    '—'
                  }}
                </p>
              </div>

            </div>

            <!-- BEFORE / CHANGE / AFTER -->

            <div
              class="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >

              <div
                class="bg-gray-50 border border-gray-200 rounded-xl p-4"
              >

                <p
                  class="text-xs text-gray-500"
                >
                  Before
                </p>

                <p
                  class="text-xl font-black text-gray-800 mt-1"
                >
                  {{
                    formatAmount(
                      selectedRecord.beforeAmount
                    )
                  }}
                </p>

              </div>

              <div
                class="rounded-xl p-4 border"
                :class="
                  selectedRecord.editType ===
                  'Refund'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                "
              >

                <p
                  class="text-xs"
                  :class="
                    selectedRecord.editType ===
                    'Refund'
                      ? 'text-red-600'
                      : 'text-green-600'
                  "
                >
                  Change
                </p>

                <p
                  class="text-xl font-black mt-1"
                  :class="
                    selectedRecord.editType ===
                    'Refund'
                      ? 'text-red-600'
                      : 'text-green-600'
                  "
                >
                  {{
                    selectedRecord.editType ===
                    'Refund'
                      ? '-'
                      : '+'
                  }}{{
                    formatAmount(
                      selectedRecord.adjustmentAmount
                    )
                  }}
                </p>

              </div>

              <div
                class="bg-gray-50 border border-gray-200 rounded-xl p-4"
              >

                <p
                  class="text-xs text-gray-500"
                >
                  After
                </p>

                <p
                  class="text-xl font-black text-gray-800 mt-1"
                >
                  {{
                    formatAmount(
                      selectedRecord.afterAmount
                    )
                  }}
                </p>

              </div>

            </div>

            <div
              v-if="
                selectedRecord.referenceNumber
              "
              class="bg-gray-50 border border-gray-200 rounded-xl p-4"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Reference Number
              </p>

              <p
                class="font-bold text-gray-800 mt-1 break-all"
              >
                {{
                  selectedRecord.referenceNumber
                }}
              </p>

            </div>

          </template>

        </div>

        <!-- MODAL FOOTER -->

        <div
          class="p-4 bg-gray-50 border-t border-gray-100"
        >

          <button
            type="button"
            @click="closeDetails"
            class="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
          >
            Close
          </button>

        </div>

      </div>

    </div>

  </div>
</template>