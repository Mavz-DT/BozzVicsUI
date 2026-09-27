<script setup>
import {
  ref,
  computed,
  onMounted
} from 'vue'

import axios from 'axios'

import {
  useAuthStore
} from '../stores/auth'

import {
  useSettingsStore
} from '../stores/settings'

import {
  storeToRefs
} from 'pinia'

const authStore =
  useAuthStore()

const settingsStore =
  useSettingsStore()

const {
  themeColor
} = storeToRefs(
  settingsStore
)

// =========================
// API
// =========================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(
  /\/$/,
  ''
)

const API =
  `${API_BASE_URL}/api`

// =========================
// STATE
// =========================

const transactions =
  ref([])

const selectedDate =
  ref('')

const loading =
  ref(false)

const errorMessage =
  ref('')

// =========================
// ADMIN
// =========================

const isAdmin =
  computed(() => {
    return (
      authStore.user?.role ===
      'Admin'
    )
  })

// =========================
// TODAY - PH
// =========================

const getTodayPH =
  () => {
    return new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Manila',

        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).format(
      new Date()
    )
  }

// =========================
// AUTH CONFIG
// =========================

const getAuthConfig =
  () => {
    const token =
      authStore.getToken()

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

// =========================
// FORMAT MONEY
// =========================

const formatMoney =
  amount => {
    return Number(
      amount || 0
    ).toLocaleString(
      'en-PH',
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    )
  }

// =========================
// FORMAT DATE / TIME
// =========================

const formatDateTime =
  value => {
    if (!value) {
      return '-'
    }

    return new Date(
      value
    ).toLocaleString(
      'en-PH',
      {
        timeZone:
          'Asia/Manila',

        year:
          'numeric',

        month:
          'short',

        day:
          '2-digit',

        hour:
          'numeric',

        minute:
          '2-digit',

        second:
          '2-digit'
      }
    )
  }

// =========================
// TRANSACTION LABEL
// =========================

const transactionLabel =
  transaction => {
    return (
      transaction?.transactionType ||
      'Transaction'
    )
  }

// =========================
// REFERENCE LABEL
// =========================

const referenceLabel =
  transaction => {
    if (
      transaction?.referenceType ===
      'RiderSettlement'
    ) {
      return 'Rider Settlement'
    }

    if (
      transaction?.referenceType ===
      'Payment'
    ) {
      return 'Payment'
    }

    if (
      transaction?.referenceType ===
      'Order'
    ) {
      return 'Order'
    }

    return (
      transaction?.referenceType ||
      '-'
    )
  }

// =========================
// ORDER LABEL
// =========================

const orderLabel =
  transaction => {
    const order =
      transaction?.order

    if (!order) {
      return '-'
    }

    if (
      order.orderType ===
      'Delivery'
    ) {
      return 'Delivery'
    }

    if (
      order.orderNumber
    ) {
      return `#${order.orderNumber}`
    }

    return '-'
  }

// =========================
// TOTALS
// =========================

const totalIn =
  computed(() => {
    return transactions.value.reduce(
      (
        total,
        transaction
      ) => {
        if (
          transaction.direction !==
          'IN'
        ) {
          return total
        }

        return (
          total +
          Number(
            transaction.amount || 0
          )
        )
      },
      0
    )
  })

const totalOut =
  computed(() => {
    return transactions.value.reduce(
      (
        total,
        transaction
      ) => {
        if (
          transaction.direction !==
          'OUT'
        ) {
          return total
        }

        return (
          total +
          Number(
            transaction.amount || 0
          )
        )
      },
      0
    )
  })

const netMovement =
  computed(() => {
    return (
      Number(
        totalIn.value
      ) -
      Number(
        totalOut.value
      )
    )
  })

// =========================
// FETCH CASH LEDGER
// =========================

const fetchCashLedger =
  async () => {
    loading.value =
      true

    errorMessage.value =
      ''

    try {
      const date =
        isAdmin.value
          ? selectedDate.value ||
            getTodayPH()
          : getTodayPH()

      if (
        isAdmin.value &&
        !selectedDate.value
      ) {
        selectedDate.value =
          date
      }

      const response =
        await axios.get(
          `${API}/cash-transactions`,
          {
            ...getAuthConfig(),

            params: {
              date
            }
          }
        )

      transactions.value =
        Array.isArray(
          response.data?.transactions
        )
          ? response.data.transactions
          : []

    } catch (error) {
      console.error(
        'Error fetching cash ledger:',
        error
      )

      transactions.value =
        []

      errorMessage.value =
        error.response?.data?.message ||
        'Hindi ma-load ang Cash Ledger.'
    } finally {
      loading.value =
        false
    }
  }

// =========================
// DATE CHANGE
// =========================

const handleDateChange =
  async () => {
    if (!isAdmin.value) {
      return
    }

    await fetchCashLedger()
  }

// =========================
// CLEAR DATE
// =========================

const setToday =
  async () => {
    selectedDate.value =
      getTodayPH()

    await fetchCashLedger()
  }

// =========================
// INITIAL LOAD
// =========================

onMounted(() => {
  selectedDate.value =
    getTodayPH()

  fetchCashLedger()
})
</script>

<template>
  <div
    class="h-full overflow-y-auto bg-slate-50 p-4 md:p-6"
  >

    <div
      class="max-w-7xl mx-auto"
    >

      <!-- ========================= -->
      <!-- HEADER -->
      <!-- ========================= -->

      <div
        class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6"
      >

        <div>

          <h1
            class="text-2xl md:text-3xl font-black text-gray-800"
          >
            Cash Ledger
          </h1>

          <p
            class="text-sm text-gray-500 mt-1"
          >
            Track actual cash movements in and out of the store.
          </p>

        </div>

        <!-- DATE FILTER -->

        <div
          class="flex flex-wrap items-end gap-2"
        >

          <div>

            <label
              class="block text-xs font-bold text-gray-500 mb-1"
            >
              Date
            </label>

            <input
              v-model="selectedDate"
              :disabled="!isAdmin"
              type="date"
              class="border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-400"
              :style="
                {
                  '--tw-ring-color':
                    themeColor
                }
              "
              @change="
                handleDateChange
              "
            />

          </div>

          <button
            v-if="isAdmin"
            type="button"
            @click="
              setToday
            "
            class="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>

          <button
            type="button"
            @click="
              fetchCashLedger
            "
            :disabled="loading"
            class="px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            :style="{
              backgroundColor:
                themeColor
            }"
          >
            {{
              loading
                ? 'Loading...'
                : 'Refresh'
            }}
          </button>

        </div>

      </div>

      <!-- ========================= -->
      <!-- ERROR -->
      <!-- ========================= -->

      <div
        v-if="errorMessage"
        class="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
      >
        {{ errorMessage }}
      </div>

      <!-- ========================= -->
      <!-- SUMMARY CARDS -->
      <!-- ========================= -->

      <div
        class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >

        <!-- TOTAL IN -->

        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Total Cash In
          </p>

          <p
            class="text-2xl md:text-3xl font-black text-emerald-600 mt-2"
          >
            ₱{{ formatMoney(totalIn) }}
          </p>

          <p
            class="text-xs text-gray-400 mt-1"
          >
            Money received into the cash drawer.
          </p>

        </div>

        <!-- TOTAL OUT -->

        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Total Cash Out
          </p>

          <p
            class="text-2xl md:text-3xl font-black text-red-600 mt-2"
          >
            ₱{{ formatMoney(totalOut) }}
          </p>

          <p
            class="text-xs text-gray-400 mt-1"
          >
            Money released from the cash drawer.
          </p>

        </div>

        <!-- NET MOVEMENT -->

        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Net Cash Movement
          </p>

          <p
            class="text-2xl md:text-3xl font-black mt-2"
            :class="
              netMovement >= 0
                ? 'text-gray-800'
                : 'text-red-600'
            "
          >
            ₱{{ formatMoney(netMovement) }}
          </p>

          <p
            class="text-xs text-gray-400 mt-1"
          >
            Total In minus Total Out.
          </p>

        </div>

      </div>

      <!-- ========================= -->
      <!-- LEDGER TABLE -->
      <!-- ========================= -->

      <div
        class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
      >

        <!-- TABLE HEADER -->

        <div
          class="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3"
        >

          <div>

            <h2
              class="font-black text-gray-800"
            >
              Cash Movements
            </h2>

            <p
              class="text-xs text-gray-500 mt-1"
            >
              {{
                selectedDate ||
                getTodayPH()
              }}
            </p>

          </div>

          <span
            class="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600"
          >
            {{ transactions.length }}
            transaction{{
              transactions.length === 1
                ? ''
                : 's'
            }}
          </span>

        </div>

        <!-- LOADING -->

        <div
          v-if="loading"
          class="p-10 text-center text-sm text-gray-500"
        >
          Loading cash ledger...
        </div>

        <!-- EMPTY -->

        <div
          v-else-if="
            transactions.length === 0
          "
          class="p-10 text-center"
        >

          <div
            class="text-4xl mb-3"
          >
            💰
          </div>

          <p
            class="font-bold text-gray-700"
          >
            No cash transactions
          </p>

          <p
            class="text-sm text-gray-400 mt-1"
          >
            Walang recorded cash movement sa selected date.
          </p>

        </div>

        <!-- DESKTOP TABLE -->

        <!-- TRANSACTIONS -->

        <template
          v-else
        >

          <!-- DESKTOP TABLE -->

          <div
            class="hidden md:block overflow-x-auto"
          >

            <table
              class="w-full text-sm"
            >

              <thead
                class="bg-gray-50 border-b border-gray-200"
              >

                <tr>

                  <th
                    class="text-left px-5 py-3 font-black text-gray-500"
                  >
                    Date / Time
                  </th>

                  <th
                    class="text-left px-5 py-3 font-black text-gray-500"
                  >
                    Transaction
                  </th>

                  <th
                    class="text-left px-5 py-3 font-black text-gray-500"
                  >
                    Reference
                  </th>

                  <th
                    class="text-left px-5 py-3 font-black text-gray-500"
                  >
                    Order
                  </th>

                  <th
                    class="text-left px-5 py-3 font-black text-gray-500"
                  >
                    Performed By
                  </th>

                  <th
                    class="text-right px-5 py-3 font-black text-gray-500"
                  >
                    Amount
                  </th>

                  <th
                    class="text-right px-5 py-3 font-black text-gray-500"
                  >
                    Running Balance
                  </th>

                </tr>

              </thead>

              <tbody
                class="divide-y divide-gray-100"
              >

                <tr
                  v-for="transaction in transactions"
                  :key="
                    transaction._id
                  "
                  class="hover:bg-gray-50"
                >

                  <td
                    class="px-5 py-4 whitespace-nowrap"
                  >
                    <p
                      class="font-semibold text-gray-700"
                    >
                      {{
                        formatDateTime(
                          transaction.createdAt
                        )
                      }}
                    </p>
                  </td>

                  <td
                    class="px-5 py-4"
                  >

                    <p
                      class="font-black text-gray-800"
                    >
                      {{
                        transactionLabel(
                          transaction
                        )
                      }}
                    </p>

                    <p
                      v-if="
                        transaction.reason
                      "
                      class="text-xs text-gray-400 mt-1 max-w-xs"
                    >
                      {{
                        transaction.reason
                      }}
                    </p>

                  </td>

                  <td
                    class="px-5 py-4"
                  >

                    <p
                      class="font-semibold text-gray-700"
                    >
                      {{
                        referenceLabel(
                          transaction
                        )
                      }}
                    </p>

                  </td>

                  <td
                    class="px-5 py-4"
                  >

                    <span
                      v-if="
                        orderLabel(
                          transaction
                        ) !== '-'
                      "
                      class="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700"
                    >
                      {{
                        orderLabel(
                          transaction
                        )
                      }}
                    </span>

                    <span
                      v-else
                      class="text-gray-400"
                    >
                      -
                    </span>

                  </td>

                  <td
                    class="px-5 py-4"
                  >
                    {{
                      transaction.performedBy
                        ?.username ||
                      '-'
                    }}
                  </td>

                  <td
                    class="px-5 py-4 text-right whitespace-nowrap"
                  >

                    <span
                      class="font-black"
                      :class="
                        transaction.direction ===
                        'IN'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      "
                    >
                      {{
                        transaction.direction ===
                        'IN'
                          ? '+'
                          : '-'
                      }}
                      ₱{{
                        formatMoney(
                          transaction.amount
                        )
                      }}
                    </span>

                  </td>

                  <td
                    class="px-5 py-4 text-right whitespace-nowrap"
                  >
                    <span
                      class="font-black text-gray-800"
                    >
                      ₱{{
                        formatMoney(
                          transaction.runningBalance
                        )
                      }}
                    </span>
                  </td>

                </tr>

              </tbody>

            </table>

          </div>

          <!-- MOBILE CARDS -->

          <div
            class="md:hidden divide-y divide-gray-100"
          >

            <div
              v-for="transaction in transactions"
              :key="
                transaction._id
              "
              class="p-4"
            >

              <div
                class="flex items-start justify-between gap-3"
              >

                <div
                  class="min-w-0"
                >

                  <p
                    class="font-black text-gray-800"
                  >
                    {{
                      transactionLabel(
                        transaction
                      )
                    }}
                  </p>

                  <p
                    class="text-xs text-gray-400 mt-1"
                  >
                    {{
                      formatDateTime(
                        transaction.createdAt
                      )
                    }}
                  </p>

                </div>

                <div
                  class="text-right whitespace-nowrap"
                >

                  <p
                    class="font-black"
                    :class="
                      transaction.direction ===
                      'IN'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    "
                  >
                    {{
                      transaction.direction ===
                      'IN'
                        ? '+'
                        : '-'
                    }}
                    ₱{{
                      formatMoney(
                        transaction.amount
                      )
                    }}
                  </p>

                  <p
                    class="text-xs font-bold text-gray-500 mt-1"
                  >
                    Balance:
                    ₱{{
                      formatMoney(
                        transaction.runningBalance
                      )
                    }}
                  </p>

                </div>

              </div>

              <div
                class="mt-3 space-y-1.5 text-xs"
              >

                <div
                  class="flex justify-between gap-3"
                >

                  <span
                    class="text-gray-400"
                  >
                    Reference
                  </span>

                  <span
                    class="font-semibold text-gray-700 text-right"
                  >
                    {{
                      referenceLabel(
                        transaction
                      )
                    }}
                  </span>

                </div>

                <div
                  class="flex justify-between gap-3"
                >

                  <span
                    class="text-gray-400"
                  >
                    Order
                  </span>

                  <span
                    class="font-semibold text-gray-700"
                  >
                    {{
                      orderLabel(
                        transaction
                      )
                    }}
                  </span>

                </div>

                <div
                  v-if="
                    transaction.riderName
                  "
                  class="flex justify-between gap-3"
                >

                  <span
                    class="text-gray-400"
                  >
                    Rider
                  </span>

                  <span
                    class="font-semibold text-gray-700 text-right"
                  >
                    {{
                      transaction.riderName
                    }}
                  </span>

                </div>

                <div
                  class="flex justify-between gap-3"
                >

                  <span
                    class="text-gray-400"
                  >
                    Performed By
                  </span>

                  <span
                    class="font-semibold text-gray-700"
                  >
                    {{
                      transaction.performedBy
                        ?.username ||
                      '-'
                    }}
                  </span>

                </div>

                <div
                  v-if="
                    transaction.reason
                  "
                  class="pt-1"
                >
                  <p
                    class="text-gray-400"
                  >
                    {{
                      transaction.reason
                    }}
                  </p>
                </div>

              </div>

            </div>

          </div>

        </template>

        <!-- MOBILE CARDS -->

        <div
          class="md:hidden divide-y divide-gray-100"
        >

          <div
            v-for="transaction in transactions"
            :key="
              transaction._id
            "
            class="p-4"
          >

            <div
              class="flex items-start justify-between gap-3"
            >

              <div
                class="min-w-0"
              >

                <p
                  class="font-black text-gray-800"
                >
                  {{
                    transactionLabel(
                      transaction
                    )
                  }}
                </p>

                <p
                  class="text-xs text-gray-400 mt-1"
                >
                  {{
                    formatDateTime(
                      transaction.createdAt
                    )
                  }}
                </p>

              </div>

              <div
                class="text-right whitespace-nowrap"
              >

                <p
                  class="font-black"
                  :class="
                    transaction.direction ===
                    'IN'
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  "
                >
                  {{
                    transaction.direction ===
                    'IN'
                      ? '+'
                      : '-'
                  }}
                  ₱{{
                    formatMoney(
                      transaction.amount
                    )
                  }}
                </p>

                <p
                  class="text-xs font-bold text-gray-500 mt-1"
                >
                  Balance:
                  ₱{{
                    formatMoney(
                      transaction.runningBalance
                    )
                  }}
                </p>

              </div>

            </div>

            <div
              class="mt-3 space-y-1.5 text-xs"
            >

              <div
                class="flex justify-between gap-3"
              >

                <span
                  class="text-gray-400"
                >
                  Reference
                </span>

                <span
                  class="font-semibold text-gray-700 text-right"
                >
                  {{
                    referenceLabel(
                      transaction
                    )
                  }}
                </span>

              </div>

              <div
                class="flex justify-between gap-3"
              >

                <span
                  class="text-gray-400"
                >
                  Order
                </span>

                <span
                  class="font-semibold text-gray-700"
                >
                  {{
                    orderLabel(
                      transaction
                    )
                  }}
                </span>

              </div>

              <div
                v-if="
                  transaction.riderName
                "
                class="flex justify-between gap-3"
              >

                <span
                  class="text-gray-400"
                >
                  Rider
                </span>

                <span
                  class="font-semibold text-gray-700 text-right"
                >
                  {{
                    transaction.riderName
                  }}
                </span>

              </div>

              <div
                class="flex justify-between gap-3"
              >

                <span
                  class="text-gray-400"
                >
                  Performed By
                </span>

                <span
                  class="font-semibold text-gray-700"
                >
                  {{
                    transaction.performedBy
                      ?.username ||
                    '-'
                  }}
                </span>

              </div>

              <div
                v-if="
                  transaction.reason
                "
                class="pt-1"
              >

                <p
                  class="text-gray-400"
                >
                  {{
                    transaction.reason
                  }}
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      <!-- ========================= -->
      <!-- ACCOUNTING NOTE -->
      <!-- ========================= -->

      <div
        class="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4"
      >

        <p
          class="text-sm font-black text-blue-800"
        >
          Cash Ledger Note
        </p>

        <p
          class="text-xs text-blue-700 mt-1 leading-relaxed"
        >
          Net Cash Movement is the total cash received minus cash released for the selected date. Hindi pa kasama dito ang opening cash o actual physical cash count ng drawer.
        </p>

      </div>

    </div>

  </div>
</template>