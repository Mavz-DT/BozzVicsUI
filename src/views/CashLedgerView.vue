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

// =========================
// STORES
// =========================

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
// INFO CARD TOOLTIPS
// =========================
//
// Desktop: lumalabas kapag hinover (group-hover).
// Touchscreen: walang hover, kaya i-tap ang i button
// para i-toggle. Isa lang ang bukas sa isang pagkakataon.
//
const activeTip = ref('')

const toggleTip = key => {
  activeTip.value =
    activeTip.value === key ? '' : key
}

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

const savingOpeningCash =
  ref(false)

const errorMessage =
  ref('')

const openingCash =
  ref(0)

const openingCashInput =
  ref('')

const openingCashRemarks =
  ref('')

const openingCashRecord =
  ref(null)

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
    if (
      transaction?.isExpense
    ) {
      return 'Store-paid Expense'
    }

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

    if (
      transaction?.referenceType ===
      'Expense'
    ) {
      return 'Expense'
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
// SUMMARY VALUES
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
// BACKEND SUMMARY VALUES
// =========================

const cashSales =
  ref(0)

const otherCashIn =
  ref(0)

const storeExpenses =
  ref(0)

const otherCashOut =
  ref(0)

const totalCashOut =
  ref(0)

const expectedCash =
  ref(0)

const gcashReceived =
  ref(0)

// =========================
// OPENING CASH ACCESS
// =========================

const canEditOpeningCash =
  computed(() => {
    return true
  })

// =========================
// SET OPENING CASH INPUT
// =========================

const prepareOpeningCashInput =
  () => {
    openingCashInput.value =
      Number(
        openingCash.value || 0
      ).toFixed(2)

    openingCashRemarks.value =
      openingCashRecord.value
        ?.remarks ||
      ''
  }

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

      const data =
        response.data || {}

      transactions.value =
        Array.isArray(
          data.transactions
        )
          ? data.transactions
          : []

      openingCash.value =
        Number(
          data.openingCash || 0
        )

      openingCashRecord.value =
        data.openingCashRecord ||
        null

      cashSales.value =
        Number(
          data.cashSales || 0
        )

      otherCashIn.value =
        Number(
          data.otherCashIn || 0
        )

      storeExpenses.value =
        Number(
          data.storeExpenses || 0
        )

      otherCashOut.value =
        Number(
          data.otherCashOut || 0
        )

      totalCashOut.value =
        Number(
          data.totalCashOut || 0
        )

      expectedCash.value =
        Number(
          data.expectedCash || 0
        )

      gcashReceived.value =
        Number(
          data.gcashReceived || 0
        )

      prepareOpeningCashInput()

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
// SAVE OPENING CASH
// =========================

const saveOpeningCash =
  async () => {
    errorMessage.value =
      ''

    const amount =
      Number(
        openingCashInput.value
      )

    if (
      !Number.isFinite(amount)
    ) {
      errorMessage.value =
        'Invalid ang Opening Cash amount.'
      return
    }

    if (
      amount < 0
    ) {
      errorMessage.value =
        'Hindi puwedeng negative ang Opening Cash.'
      return
    }

    savingOpeningCash.value =
      true

    try {
      const date =
        isAdmin.value
          ? selectedDate.value ||
            getTodayPH()
          : getTodayPH()

      const response =
        await axios.put(
          `${API}/cash-transactions/opening-cash`,
          {
            date,

            openingCash:
              Number(
                amount.toFixed(2)
              ),

            remarks:
              openingCashRemarks.value
                .trim()
          },
          getAuthConfig()
        )

      openingCash.value =
        Number(
          response.data?.openingCash || 0
        )

      openingCashRecord.value = {
        ...(openingCashRecord.value || {}),

        date:
          response.data?.date ||
          date,

        openingCash:
          Number(
            response.data?.openingCash || 0
          ),

        remarks:
          response.data?.remarks ||
          '',

        setBy:
          response.data?.setBy ||
          null,

        updatedAt:
          new Date().toISOString()
      }

      prepareOpeningCashInput()

      await fetchCashLedger()

    } catch (error) {
      console.error(
        'Error saving opening cash:',
        error
      )

      errorMessage.value =
        error.response?.data?.message ||
        'Hindi ma-save ang Opening Cash.'
    } finally {
      savingOpeningCash.value =
        false
    }
  }

// =========================
// EMPLOYEE CASH / GCASH EXCHANGE
// =========================
//
// Cashout: Cash OUT (drawer -) + GCash IN (gcash +)
// Cashin : Cash IN  (drawer +) + GCash OUT (gcash -)
//
// =========================

const showExchangeModal =
  ref(false)

const exchangeDirection =
  ref('Cashout')

const exchangeAmount =
  ref('')

const exchangeEmployee =
  ref('')

const exchangeRemarks =
  ref('')

const savingExchange =
  ref(false)

const exchangeError =
  ref('')

// Kapag may laman = edit mode (groupId ng exchange na ine-edit).
const editingExchangeGroupId =
  ref(null)

const openExchangeModal =
  () => {
    editingExchangeGroupId.value = null
    exchangeDirection.value = 'Cashout'
    exchangeAmount.value = ''
    exchangeEmployee.value = ''
    exchangeRemarks.value = ''
    exchangeError.value = ''
    showExchangeModal.value = true
  }

// I-edit ang isang existing exchange (mula sa movement row).
const openEditExchange =
  row => {
    if (!isAdmin.value || !row?.exchangeGroupId) {
      return
    }

    editingExchangeGroupId.value =
      row.exchangeGroupId

    exchangeDirection.value =
      row.transactionType === 'Employee Cashin'
        ? 'Cashin'
        : 'Cashout'

    exchangeAmount.value =
      row.amount

    exchangeEmployee.value =
      row.employeeName || ''

    exchangeRemarks.value =
      row.remarks || ''

    exchangeError.value = ''
    showExchangeModal.value = true
  }

// I-reverse (offsetting entry) — Admin only.
const reverseExchange =
  async row => {
    if (!isAdmin.value || !row?.exchangeGroupId) {
      return
    }

    if (
      !window.confirm(
        'I-reverse ang exchange na ito? Gagawa ng kabaligtarang entry (mananatili ang original).'
      )
    ) {
      return
    }

    try {
      await axios.post(
        `${API}/cash-transactions/employee-exchange/${row.exchangeGroupId}/reverse`,
        {},
        getAuthConfig()
      )
      await fetchCashLedger()
    } catch (error) {
      console.error('Error reversing exchange:', error)
      errorMessage.value =
        error.response?.data?.message ||
        'Hindi ma-reverse ang exchange.'
    }
  }

// I-delete ang parehong leg — Admin only.
const deleteExchange =
  async row => {
    if (!isAdmin.value || !row?.exchangeGroupId) {
      return
    }

    if (
      !window.confirm(
        'Burahin ang exchange na ito? Matatanggal ang parehong Cash at GCash leg. Hindi na maibabalik.'
      )
    ) {
      return
    }

    try {
      await axios.delete(
        `${API}/cash-transactions/employee-exchange/${row.exchangeGroupId}`,
        getAuthConfig()
      )
      await fetchCashLedger()
    } catch (error) {
      console.error('Error deleting exchange:', error)
      errorMessage.value =
        error.response?.data?.message ||
        'Hindi ma-delete ang exchange.'
    }
  }

const closeExchangeModal =
  () => {
    showExchangeModal.value = false
  }

const submitEmployeeExchange =
  async () => {
    exchangeError.value = ''

    const amount =
      Number(exchangeAmount.value)

    if (
      !Number.isFinite(amount) ||
      amount < 0.01
    ) {
      exchangeError.value =
        'Maglagay ng tamang halaga (mas malaki sa zero).'
      return
    }

    if (
      !exchangeEmployee.value.trim()
    ) {
      exchangeError.value =
        'Pangalan ng empleyado ay required.'
      return
    }

    savingExchange.value = true

    try {
      const payload = {
        amount:
          Number(amount.toFixed(2)),
        direction:
          exchangeDirection.value,
        employeeName:
          exchangeEmployee.value.trim(),
        remarks:
          exchangeRemarks.value.trim()
      }

      if (
        editingExchangeGroupId.value
      ) {
        // EDIT (Admin only)
        await axios.put(
          `${API}/cash-transactions/employee-exchange/${editingExchangeGroupId.value}`,
          payload,
          getAuthConfig()
        )
      } else {
        // BAGONG exchange
        await axios.post(
          `${API}/cash-transactions/employee-exchange`,
          payload,
          getAuthConfig()
        )
      }

      showExchangeModal.value = false
      editingExchangeGroupId.value = null

      await fetchCashLedger()
    } catch (error) {
      console.error(
        'Error recording employee exchange:',
        error
      )

      exchangeError.value =
        error.response?.data?.message ||
        'Hindi ma-record ang exchange.'
    } finally {
      savingExchange.value = false
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
            Daily cash audit and GCash monitoring.
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
              :style="{
                '--tw-ring-color':
                  themeColor
              }"
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
      <!-- OPENING CASH -->
      <!-- ========================= -->

      <div
        class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6"
      >

        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >

          <div>

            <p
              class="text-xs font-bold uppercase tracking-wide text-gray-400"
            >
              Opening Cash
            </p>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Initial cash na nasa drawer bago magsimula ang day's transactions.
            </p>

            <p
              v-if="
                openingCashRecord?.setBy?.username
              "
              class="text-xs text-gray-400 mt-2"
            >
              Last updated by:
              <span
                class="font-bold text-gray-600"
              >
                {{
                  openingCashRecord.setBy.username
                }}
              </span>
            </p>

          </div>

          <div
            v-if="canEditOpeningCash"
            class="flex flex-col sm:flex-row sm:items-end gap-3 w-full lg:w-auto"
          >

            <div
              class="w-full sm:w-44"
            >

              <label
                class="block text-xs font-bold text-gray-500 mb-1"
              >
                Opening Cash Amount
              </label>

              <div
                class="relative"
              >

                <span
                  class="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400"
                >
                  ₱
                </span>

                <input
                  v-model="openingCashInput"
                  type="number"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  class="w-full border border-gray-300 rounded-xl pl-8 pr-3 py-3 text-lg font-black text-gray-800 outline-none focus:ring-2"
                  :style="{
                    '--tw-ring-color':
                      themeColor
                  }"
                />

              </div>

            </div>

            <button
              type="button"
              @click="
                saveOpeningCash
              "
              :disabled="
                savingOpeningCash ||
                loading
              "
              class="px-5 py-3 rounded-xl text-white text-sm font-black shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              :style="{
                backgroundColor:
                  themeColor
              }"
            >
              {{
                savingOpeningCash
                  ? 'Saving...'
                  : 'Save Opening Cash'
              }}
            </button>

          </div>

        </div>

        <div
          class="mt-4"
        >

          <label
            class="block text-xs font-bold text-gray-500 mb-1"
          >
            Remarks
          </label>

          <input
            v-model="openingCashRemarks"
            type="text"
            maxlength="250"
            placeholder="Optional remarks"
            class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2"
            :style="{
              '--tw-ring-color':
                themeColor
            }"
          />

        </div>

      </div>

      <!-- ========================= -->
      <!-- EMPLOYEE CASH / GCASH EXCHANGE -->
      <!-- ========================= -->

      <div
        class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Employee Cash / GCash
          </p>
          <p
            class="text-sm text-gray-500 mt-1"
          >
            Cashout: cash palabas sa kaha, GCash papasok. &nbsp;·&nbsp;
            Cash-in: cash papasok sa kaha, GCash palabas. Sa pamamagitan
            ng empleyado.
          </p>
        </div>

        <button
          type="button"
          @click="openExchangeModal"
          :disabled="loading"
          class="shrink-0 px-5 py-3 rounded-xl text-white text-sm font-black shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          :style="{
            backgroundColor:
              themeColor
          }"
        >
          + Employee Cashout / Cash-in
        </button>
      </div>

      <!-- ========================= -->
      <!-- AUDIT SUMMARY -->
      <!-- ========================= -->

      <div
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4"
      >

        <!-- OPENING CASH -->

        <div
          class="relative group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('opening-cash')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'opening-cash' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-64 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Opening Cash</p>
            <p>Ang cash na nasa drawer bago magsimula ang mga transaksyon ngayong araw.</p>
            <p class="mt-1 text-gray-300">Formula: manu-manong itinatakda ng admin/cashier para sa petsa.</p>
          </div>

          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Opening Cash
          </p>

          <p
            class="text-2xl md:text-3xl font-black text-gray-800 mt-2"
          >
            ₱{{ formatMoney(openingCash) }}
          </p>

          <p
            class="text-xs text-gray-400 mt-1"
          >
            Initial drawer cash.
          </p>

        </div>

        <!-- CASH SALES -->

        <div
          class="relative group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('cash-sales')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'cash-sales' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-64 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Cash Sales</p>
            <p>CASH lang na natanggap sa benta ngayong araw. HINDI kasama ang GCash (nasa "GCash Received" iyon) — kaya mas maliit ito kaysa Total Sales sa Sales Record.</p>
            <p class="mt-1 text-gray-300">Formula: kabuuan ng mga bayad na Cash (method = Cash) sa mga order ngayong araw.</p>
            <p class="mt-1 text-emerald-300">Total Sales = Cash Sales + GCash Received.</p>
          </div>

          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Cash Sales
          </p>

          <p
            class="text-2xl md:text-3xl font-black text-emerald-600 mt-2"
          >
            ₱{{ formatMoney(cashSales) }}
          </p>

          <p
            class="text-xs text-gray-400 mt-1"
          >
            Actual cash received from sales.
          </p>

        </div>

        <!-- STORE EXPENSES -->

        <div
          class="relative group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('store-expenses')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'store-expenses' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-64 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Store-paid Expenses</p>
            <p>Mga gastos na binayaran gamit ang pera sa kaha (source = Store). Hindi kasama ang Owner-paid o Due.</p>
            <p class="mt-1 text-gray-300">Formula: kabuuan ng Expense records (Paid, source = Store) para sa araw.</p>
          </div>

          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Store-paid Expenses
          </p>

          <p
            class="text-2xl md:text-3xl font-black text-red-600 mt-2"
          >
            ₱{{ formatMoney(storeExpenses) }}
          </p>

          <p
            class="text-xs text-gray-400 mt-1"
          >
            Expenses deducted from the drawer.
          </p>

        </div>

        <!-- OTHER CASH OUT -->

        <div
          class="relative group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('other-cash-out')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'other-cash-out' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-64 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Other Cash Out</p>
            <p>Iba pang CASH na lumabas sa kaha maliban sa Store Expenses: refunds, rider payout, employee cashout, manual cash-out.</p>
            <p class="mt-1 text-gray-300">Formula: kabuuan ng Cash OUT na transactions (hindi kasama ang Store Expenses).</p>
          </div>

          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Other Cash Out
          </p>

          <p
            class="text-2xl md:text-3xl font-black text-red-600 mt-2"
          >
            ₱{{ formatMoney(otherCashOut) }}
          </p>

          <p
            class="text-xs text-gray-400 mt-1"
          >
            Other physical cash released.
          </p>

        </div>

      </div>

      <!-- ========================= -->
      <!-- EXPECTED + GCASH -->
      <!-- ========================= -->

      <div
        class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"
      >

        <!-- EXPECTED CASH -->

        <div
          class="relative group rounded-2xl p-6 shadow-sm border-2"
          :style="{
            borderColor:
              themeColor
          }"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('expected-drawer')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'expected-drawer' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-72 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Expected Cash in Drawer</p>
            <p>Ito ang dapat na laman ng kaha ngayon kung tama lahat ng record. Ihambing sa aktwal na bilang ng pera.</p>
            <p class="mt-1 text-gray-300">Formula: Opening Cash + Cash Sales + Other Cash In − Store Expenses − Other Cash Out.</p>
          </div>

          <p
            class="text-xs font-black uppercase tracking-wide text-gray-500"
          >
            Expected Cash in Drawer
          </p>

          <p
            class="text-3xl md:text-4xl font-black text-gray-900 mt-2"
          >
            ₱{{ formatMoney(expectedCash) }}
          </p>

          <div
            class="mt-4 text-sm space-y-1"
          >

            <div
              class="flex justify-between"
            >
              <span
                class="text-gray-500"
              >
                Opening Cash
              </span>

              <span
                class="font-bold text-gray-800"
              >
                ₱{{ formatMoney(openingCash) }}
              </span>
            </div>

            <div
              class="flex justify-between"
            >
              <span
                class="text-gray-500"
              >
                + Cash Sales
              </span>

              <span
                class="font-bold text-emerald-600"
              >
                ₱{{ formatMoney(cashSales) }}
              </span>
            </div>

            <div
              v-if="otherCashIn > 0"
              class="flex justify-between"
            >
              <span
                class="text-gray-500"
              >
                + Other Cash In
              </span>

              <span
                class="font-bold text-emerald-600"
              >
                ₱{{ formatMoney(otherCashIn) }}
              </span>
            </div>

            <div
              class="flex justify-between"
            >
              <span
                class="text-gray-500"
              >
                - Store-paid Expenses
              </span>

              <span
                class="font-bold text-red-600"
              >
                ₱{{ formatMoney(storeExpenses) }}
              </span>
            </div>

            <div
              class="flex justify-between"
            >
              <span
                class="text-gray-500"
              >
                - Other Cash Out
              </span>

              <span
                class="font-bold text-red-600"
              >
                ₱{{ formatMoney(otherCashOut) }}
              </span>
            </div>

          </div>

        </div>

        <!-- GCASH -->

        <div
          class="relative group bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('gcash-received')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'gcash-received' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-72 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Total GCash Received</p>
            <p>GCash na natanggap ngayong araw. HIWALAY ito sa pisikal na cash drawer.</p>
            <p class="mt-1 text-gray-300">Formula: Σ GCash payments (sales) + GCash-in (employee exchange) − GCash refunds/out.</p>
            <p class="mt-1 text-emerald-300">Total Sales = Cash Sales + GCash Received.</p>
          </div>

          <p
            class="text-xs font-black uppercase tracking-wide text-gray-400"
          >
            Total GCash Received
          </p>

          <p
            class="text-3xl md:text-4xl font-black mt-2"
            :style="{
              color:
                themeColor
            }"
          >
            ₱{{ formatMoney(gcashReceived) }}
          </p>

          <p
            class="text-sm text-gray-500 mt-3"
          >
            GCash payments are tracked separately and do not increase the physical cash drawer.
          </p>

          <div
            class="mt-5 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3"
          >

            <div
              class="flex justify-between text-sm"
            >

              <span
                class="text-gray-500"
              >
                Cash in Drawer
              </span>

              <span
                class="font-black text-gray-800"
              >
                ₱{{
                  formatMoney(
                    expectedCash
                  )
                }}
              </span>

            </div>

            <div
              class="flex justify-between text-sm mt-2"
            >

              <span
                class="text-gray-500"
              >
                GCash
              </span>

              <span
                class="font-black"
                :style="{
                  color:
                    themeColor
                }"
              >
                ₱{{
                  formatMoney(
                    gcashReceived
                  )
                }}
              </span>

            </div>

          </div>

        </div>

      </div>

      <!-- ========================= -->
      <!-- MOVEMENT SUMMARY -->
      <!-- ========================= -->

      <div
        class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >

        <!-- TOTAL CASH IN -->

        <div
          class="relative group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('cash-in')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'cash-in' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-64 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Total Cash In</p>
            <p>Lahat ng CASH na pumasok sa kaha ngayong araw (hindi kasama ang GCash).</p>
            <p class="mt-1 text-gray-300">Formula: Cash Sales + Other Cash In.</p>
          </div>

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
            Cash movements received.
          </p>

        </div>

        <!-- TOTAL CASH OUT -->

        <div
          class="relative group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('cash-out')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'cash-out' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-64 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Total Cash Out</p>
            <p>Lahat ng CASH na lumabas sa kaha ngayong araw.</p>
            <p class="mt-1 text-gray-300">Formula: Store-paid Expenses + Other Cash Out.</p>
          </div>

          <p
            class="text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Total Cash Out
          </p>

          <p
            class="text-2xl md:text-3xl font-black text-red-600 mt-2"
          >
            ₱{{ formatMoney(totalCashOut) }}
          </p>

          <p
            class="text-xs text-gray-400 mt-1"
          >
            Store-paid expenses + other cash out.
          </p>

        </div>

        <!-- NET MOVEMENT -->

        <div
          class="relative group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >

          <button
            type="button"
            aria-label="Paliwanag"
            @click.stop="toggleTip('net-movement')"
            class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
          >
            i
          </button>

          <div
            :class="{ 'opacity-100 pointer-events-auto': activeTip === 'net-movement' }"
            class="pointer-events-none absolute z-30 right-3 top-11 w-64 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <p class="font-bold mb-1">Net Cash Movement</p>
            <p>Netong galaw ng cash ngayong araw — kung gaano tumaas o bumaba ang pera sa kaha.</p>
            <p class="mt-1 text-gray-300">Formula: Total Cash In − Total Cash Out.</p>
          </div>

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
            Cash In minus Cash Out.
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

                  <th
                    v-if="isAdmin"
                    class="text-center px-5 py-3 font-black text-gray-500"
                  >
                    Actions
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

                  <td
                    v-if="isAdmin"
                    class="px-5 py-4 whitespace-nowrap text-center"
                  >
                    <div
                      v-if="
                        transaction.exchangeGroupId
                      "
                      class="flex items-center justify-center gap-1"
                    >
                      <button
                        type="button"
                        @click="openEditExchange(transaction)"
                        class="px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-bold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        @click="reverseExchange(transaction)"
                        class="px-2 py-1 rounded-lg text-amber-600 hover:bg-amber-50 text-xs font-bold"
                      >
                        Reverse
                      </button>
                      <button
                        type="button"
                        @click="deleteExchange(transaction)"
                        class="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 text-xs font-bold"
                      >
                        Delete
                      </button>
                    </div>
                    <span
                      v-else
                      class="text-gray-300"
                    >
                      -
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

                <div
                  v-if="
                    isAdmin &&
                    transaction.exchangeGroupId
                  "
                  class="flex gap-2 pt-2"
                >
                  <button
                    type="button"
                    @click="openEditExchange(transaction)"
                    class="flex-1 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    @click="reverseExchange(transaction)"
                    class="flex-1 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold"
                  >
                    Reverse
                  </button>
                  <button
                    type="button"
                    @click="deleteExchange(transaction)"
                    class="flex-1 px-2 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold"
                  >
                    Delete
                  </button>
                </div>

              </div>

            </div>

          </div>

        </template>

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
          Cash Audit Note
        </p>

        <p
          class="text-xs text-blue-700 mt-1 leading-relaxed"
        >
          Expected Cash in Drawer =
          Opening Cash + Cash Sales + Other Cash In
          - Store-paid Expenses - Other Cash Out.
          Ang GCash ay hiwalay at hindi kasama sa physical cash drawer.
        </p>

      </div>

    </div>

    <!-- ========================= -->
    <!-- EMPLOYEE EXCHANGE MODAL -->
    <!-- ========================= -->

    <div
      v-if="showExchangeModal"
      class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 px-4"
      @click.self="closeExchangeModal"
    >
      <div
        class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div
          class="px-5 py-4 text-white font-black"
          :style="{ backgroundColor: themeColor }"
        >
          {{
            editingExchangeGroupId
              ? 'I-edit ang Exchange'
              : 'Employee Cashout / Cash-in'
          }}
        </div>

        <div class="p-5 space-y-4">

          <!-- DIRECTION -->
          <div>
            <label
              class="block text-xs font-bold text-gray-500 mb-1"
            >
              Direksyon
            </label>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="exchangeDirection = 'Cashout'"
                :class="[
                  'px-3 py-2 rounded-xl text-sm font-bold border',
                  exchangeDirection === 'Cashout'
                    ? 'text-white'
                    : 'bg-white text-gray-600 border-gray-300'
                ]"
                :style="
                  exchangeDirection === 'Cashout'
                    ? { backgroundColor: themeColor, borderColor: themeColor }
                    : {}
                "
              >
                Cashout
              </button>

              <button
                type="button"
                @click="exchangeDirection = 'Cashin'"
                :class="[
                  'px-3 py-2 rounded-xl text-sm font-bold border',
                  exchangeDirection === 'Cashin'
                    ? 'text-white'
                    : 'bg-white text-gray-600 border-gray-300'
                ]"
                :style="
                  exchangeDirection === 'Cashin'
                    ? { backgroundColor: themeColor, borderColor: themeColor }
                    : {}
                "
              >
                Cash-in
              </button>
            </div>

            <p class="text-xs text-gray-400 mt-2">
              {{
                exchangeDirection === 'Cashout'
                  ? 'Cash palabas sa kaha, GCash papasok sa store.'
                  : 'Cash papasok sa kaha, GCash palabas sa store.'
              }}
            </p>
          </div>

          <!-- AMOUNT -->
          <div>
            <label
              class="block text-xs font-bold text-gray-500 mb-1"
            >
              Halaga
            </label>
            <div class="relative">
              <span
                class="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400"
              >
                ₱
              </span>
              <input
                v-model="exchangeAmount"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                class="w-full border border-gray-300 rounded-xl pl-8 pr-3 py-3 text-lg font-black text-gray-800 outline-none focus:ring-2"
                :style="{ '--tw-ring-color': themeColor }"
              />
            </div>
          </div>

          <!-- EMPLOYEE -->
          <div>
            <label
              class="block text-xs font-bold text-gray-500 mb-1"
            >
              Empleyado
            </label>
            <input
              v-model="exchangeEmployee"
              type="text"
              maxlength="100"
              placeholder="Pangalan ng empleyado"
              class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2"
              :style="{ '--tw-ring-color': themeColor }"
            />
          </div>

          <!-- REMARKS -->
          <div>
            <label
              class="block text-xs font-bold text-gray-500 mb-1"
            >
              Remarks
            </label>
            <input
              v-model="exchangeRemarks"
              type="text"
              maxlength="250"
              placeholder="Optional"
              class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2"
              :style="{ '--tw-ring-color': themeColor }"
            />
          </div>

          <p
            v-if="exchangeError"
            class="text-sm text-red-600"
          >
            {{ exchangeError }}
          </p>

        </div>

        <div
          class="px-5 py-4 bg-gray-50 flex justify-end gap-2"
        >
          <button
            type="button"
            @click="closeExchangeModal"
            class="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100"
          >
            Kanselahin
          </button>
          <button
            type="button"
            @click="submitEmployeeExchange"
            :disabled="savingExchange"
            class="px-5 py-2.5 rounded-xl text-white text-sm font-black shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            :style="{ backgroundColor: themeColor }"
          >
            {{ savingExchange ? 'Saving...' : 'I-record' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>