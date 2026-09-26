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

const selectedDate = ref('')
const activePeriod = ref('Daily')

const reports = ref({
  daily: null,
  mtd: null,
  ytd: null
})

const isLoading = ref(false)
const error = ref('')

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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

const formatAmount = amount => {
  return `₱${Number(amount || 0).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )}`
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

/*
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
|
| Backend end date is exclusive.
| So for display only, subtract 1 millisecond.
|
*/

const formatReportEndDate = value => {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  date.setTime(
    date.getTime() - 1
  )

  return formatDateOnly(date)
}

const getAuthHeaders = () => {
  const token =
    typeof auth.getToken === 'function'
      ? auth.getToken()
      : localStorage.getItem('token') || ''

  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {}
}

/*
|--------------------------------------------------------------------------
| Admin Check
|--------------------------------------------------------------------------
*/

const isAdmin = computed(() => {
  return auth.user?.role === 'Admin'
})

/*
|--------------------------------------------------------------------------
| Active Report
|--------------------------------------------------------------------------
*/

const activeReport = computed(() => {
  if (activePeriod.value === 'Daily') {
    return reports.value.daily
  }

  if (activePeriod.value === 'MTD') {
    return reports.value.mtd
  }

  return reports.value.ytd
})

/*
|--------------------------------------------------------------------------
| Sales
|--------------------------------------------------------------------------
*/

const sales = computed(() => {
  return activeReport.value?.sales || {}
})

const totalSales = computed(() => {
  return Number(
    sales.value.netSales || 0
  )
})

const grossSales = computed(() => {
  return Number(
    sales.value.grossSales || 0
  )
})

const discounts = computed(() => {
  return Number(
    sales.value.discounts || 0
  )
})

const deliveryFees = computed(() => {
  return Number(
    sales.value.deliveryFees || 0
  )
})

const orderCount = computed(() => {
  return Number(
    sales.value.orderCount || 0
  )
})

const cashSales = computed(() => {
  return Number(
    sales.value.cash || 0
  )
})

const gcashSales = computed(() => {
  return Number(
    sales.value.gcash || 0
  )
})

const dineInSales = computed(() => {
  return Number(
    sales.value.dineIn || 0
  )
})

const takeOutSales = computed(() => {
  return Number(
    sales.value.takeOut || 0
  )
})

const deliverySales = computed(() => {
  return Number(
    sales.value.delivery || 0
  )
})

const refunds = computed(() => {
  return Number(
    sales.value.refunds || 0
  )
})

const adjustments = computed(() => {
  return Number(
    sales.value.adjustments || 0
  )
})

/*
|--------------------------------------------------------------------------
| Expenses
|--------------------------------------------------------------------------
*/

const expenses = computed(() => {
  return activeReport.value?.expenses || {}
})

const ingredientsExpense = computed(() => {
  return Number(
    expenses.value.ingredients || 0
  )
})

const materialsExpense = computed(() => {
  return Number(
    expenses.value.materials || 0
  )
})

const maintenanceExpense = computed(() => {
  return Number(
    expenses.value.maintenance || 0
  )
})

const billsExpense = computed(() => {
  return Number(
    expenses.value.bills || 0
  )
})

const miscellaneousExpense = computed(() => {
  return Number(
    expenses.value.miscellaneous || 0
  )
})

const laborExpense = computed(() => {
  return Number(
    expenses.value.labor || 0
  )
})

const totalExpenses = computed(() => {
  return Number(
    expenses.value.total || 0
  )
})

/*
|--------------------------------------------------------------------------
| Bill Breakdown
|--------------------------------------------------------------------------
*/

const billBreakdown = computed(() => {
  return (
    expenses.value?.billBreakdown ||
    {}
  )
})

const directBillExpense = computed(() => {
  return Number(
    billBreakdown.value.direct || 0
  )
})

const recurringBillExpense = computed(() => {
  return Number(
    billBreakdown.value.recurring || 0
  )
})

const dailyBillAllocation = computed(() => {
  return (
    billBreakdown.value.daily ||
    {}
  )
})

const selectedDateBillAllocation = computed(() => {
  return Number(
    dailyBillAllocation.value[
      selectedDate.value
    ] || 0
  )
})

/*
|--------------------------------------------------------------------------
| Labor Breakdown
|--------------------------------------------------------------------------
*/

const laborBreakdown = computed(() => {
  return (
    expenses.value?.laborBreakdown ||
    {}
  )
})

const regularLaborExpense = computed(() => {
  return Number(
    laborBreakdown.value.regular || 0
  )
})

const thirteenthMonthExpense = computed(() => {
  return Number(
    laborBreakdown.value.thirteenthMonth ||
      0
  )
})

const laborBenefitsExpense = computed(() => {
  return Number(
    laborBreakdown.value.laborBenefits ||
      0
  )
})

const estimatedDailyRegularLabor = computed(() => {
  return Number(
    laborBreakdown.value
      .regularEstimatedDaily || 0
  )
})

const regularEstimateSource = computed(() => {
  return (
    laborBreakdown.value
      .regularEstimateSource ||
    '—'
  )
})

const dailyRegularLabor = computed(() => {
  return (
    laborBreakdown.value.dailyRegular ||
    {}
  )
})

const daily13thMonthLabor = computed(() => {
  return (
    laborBreakdown.value.daily13thMonth ||
    {}
  )
})

const dailyLaborBenefits = computed(() => {
  return (
    laborBreakdown.value
      .dailyLaborBenefits ||
    {}
  )
})

const selectedDateRegularLabor = computed(() => {
  return Number(
    dailyRegularLabor.value[
      selectedDate.value
    ] || 0
  )
})

const selectedDate13thMonth = computed(() => {
  return Number(
    daily13thMonthLabor.value[
      selectedDate.value
    ] || 0
  )
})

const selectedDateLaborBenefits = computed(() => {
  return Number(
    dailyLaborBenefits.value[
      selectedDate.value
    ] || 0
  )
})

/*
|--------------------------------------------------------------------------
| Profit
|--------------------------------------------------------------------------
*/

const estimatedProfit = computed(() => {
  return Number(
    activeReport.value?.profit?.estimated || 0
  )
})

/*
|--------------------------------------------------------------------------
| Averages
|--------------------------------------------------------------------------
*/

const averageSales = computed(() => {
  return Number(
    activeReport.value?.averages?.dailySales || 0
  )
})

const averageExpenses = computed(() => {
  return Number(
    activeReport.value?.averages?.dailyExpenses || 0
  )
})

const averageProfit = computed(() => {
  return Number(
    activeReport.value?.averages?.dailyProfit || 0
  )
})

/*
|--------------------------------------------------------------------------
| Fetch Reports
|--------------------------------------------------------------------------
*/

const fetchReports = async () => {
  if (!selectedDate.value) {
    return
  }

  if (!isAdmin.value) {
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const response = await axios.get(
      '/api/reports',
      {
        params: {
          date: selectedDate.value
        },
        headers: getAuthHeaders()
      }
    )

    reports.value = {
      daily:
        response.data?.daily || null,

      mtd:
        response.data?.mtd || null,

      ytd:
        response.data?.ytd || null
    }
  } catch (err) {
    console.error(
      'fetchReports error:',
      err
    )

    reports.value = {
      daily: null,
      mtd: null,
      ytd: null
    }

    error.value =
      err?.response?.data?.message ||
      'Failed to load reports.'
  } finally {
    isLoading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| Date
|--------------------------------------------------------------------------
*/

const handleDateChange = () => {
  fetchReports()
}

/*
|--------------------------------------------------------------------------
| Period
|--------------------------------------------------------------------------
*/

const selectPeriod = period => {
  activePeriod.value = period
}

/*
|--------------------------------------------------------------------------
| Expense Percentage
|--------------------------------------------------------------------------
*/

const expensePercentage = amount => {
  if (totalExpenses.value <= 0) {
    return 0
  }

  return Math.min(
    100,
    (
      Number(amount || 0) /
      totalExpenses.value
    ) * 100
  )
}

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

onMounted(() => {
  selectedDate.value =
    getTodayPhilippineDate()

  fetchReports()
})
</script>

<template>
  <div
    class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
  >

    <!-- ====================================================== -->
    <!-- ADMIN CHECK -->
    <!-- ====================================================== -->

    <div
      v-if="!isAdmin"
      class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 font-bold"
    >
      Admin access is required to view reports.
    </div>

    <template v-else>

      <!-- ================================================== -->
      <!-- HEADER -->
      <!-- ================================================== -->

      <div
        class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >

        <div>

          <h1
            class="text-2xl md:text-3xl font-black text-gray-800"
          >
            Reports
          </h1>

          <p
            class="text-sm text-gray-500 mt-1"
          >
            Sales, expenses, and estimated profit.
          </p>

        </div>

        <div
          class="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
        >

          <label
            class="block text-xs font-bold text-gray-500 mb-1"
          >
            Report Date
          </label>

          <input
            v-model="selectedDate"
            @change="handleDateChange"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-200"
          />

        </div>

      </div>

      <!-- ================================================== -->
      <!-- ERROR -->
      <!-- ================================================== -->

      <div
        v-if="error"
        class="bg-red-100 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium"
      >
        {{ error }}
      </div>

      <!-- ================================================== -->
      <!-- PERIOD SELECTOR -->
      <!-- ================================================== -->

      <div
        class="bg-white border border-gray-200 rounded-2xl p-2 shadow-sm"
      >

        <div
          class="grid grid-cols-3 gap-2"
        >

          <button
            type="button"
            @click="selectPeriod('Daily')"
            :class="[
              'py-3 rounded-xl font-black transition-all',
              activePeriod === 'Daily'
                ? 'text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            ]"
            :style="
              activePeriod === 'Daily'
                ? {
                    backgroundColor:
                      settingsStore.themeColor
                  }
                : {}
            "
          >
            Daily
          </button>

          <button
            type="button"
            @click="selectPeriod('MTD')"
            :class="[
              'py-3 rounded-xl font-black transition-all',
              activePeriod === 'MTD'
                ? 'text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            ]"
            :style="
              activePeriod === 'MTD'
                ? {
                    backgroundColor:
                      settingsStore.themeColor
                  }
                : {}
            "
          >
            MTD
          </button>

          <button
            type="button"
            @click="selectPeriod('YTD')"
            :class="[
              'py-3 rounded-xl font-black transition-all',
              activePeriod === 'YTD'
                ? 'text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            ]"
            :style="
              activePeriod === 'YTD'
                ? {
                    backgroundColor:
                      settingsStore.themeColor
                  }
                : {}
            "
          >
            YTD
          </button>

        </div>

      </div>

      <!-- ================================================== -->
      <!-- LOADING -->
      <!-- ================================================== -->

      <div
        v-if="isLoading"
        class="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500"
      >

        <div
          class="text-3xl mb-3"
        >
          ⏳
        </div>

        <p
          class="font-semibold"
        >
          Generating report...
        </p>

      </div>

      <template
        v-else-if="activeReport"
      >

        <!-- ================================================= -->
        <!-- PERIOD INFO -->
        <!-- ================================================= -->

        <div
          class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
        >

          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >

            <div>

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Reporting Period
              </p>

              <p
                class="text-lg font-black text-gray-800 mt-1"
              >
                {{ activePeriod }}
              </p>

            </div>

            <div
              class="text-sm text-gray-500 sm:text-right"
            >

              <p>
                {{ formatDateOnly(activeReport.start) }}
                —
                {{ formatReportEndDate(activeReport.end) }}
              </p>

            </div>

          </div>

        </div>

        <!-- ================================================= -->
        <!-- TOP SUMMARY -->
        <!-- ================================================= -->

        <div
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >

          <!-- NET SALES -->

          <div
            class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
          >

            <p
              class="text-xs font-bold text-gray-500 uppercase tracking-wide"
            >
              Net Sales
            </p>

            <p
              class="text-3xl font-black text-green-600 mt-2"
            >
              {{ formatAmount(totalSales) }}
            </p>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              {{ orderCount }} completed orders
            </p>

          </div>

          <!-- EXPENSES -->

          <div
            class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
          >

            <p
              class="text-xs font-bold text-gray-500 uppercase tracking-wide"
            >
              Total Expenses
            </p>

            <p
              class="text-3xl font-black text-red-600 mt-2"
            >
              {{ formatAmount(totalExpenses) }}
            </p>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Recorded operating costs
            </p>

          </div>

          <!-- PROFIT -->

          <div
            class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
          >

            <p
              class="text-xs font-bold text-gray-500 uppercase tracking-wide"
            >
              Estimated Profit
            </p>

            <p
              class="text-3xl font-black mt-2"
              :class="
                estimatedProfit >= 0
                  ? 'text-blue-600'
                  : 'text-red-600'
              "
            >
              {{ formatAmount(estimatedProfit) }}
            </p>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Net sales less expenses
            </p>

          </div>

          <!-- ORDERS -->

          <div
            class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
          >

            <p
              class="text-xs font-bold text-gray-500 uppercase tracking-wide"
            >
              Order Count
            </p>

            <p
              class="text-3xl font-black text-gray-800 mt-2"
            >
              {{ orderCount }}
            </p>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Settled and paid orders
            </p>

          </div>

        </div>

        <!-- ================================================= -->
        <!-- SALES SUMMARY -->
        <!-- ================================================= -->

        <section class="space-y-4">

          <div>

            <h2
              class="text-xl font-black text-gray-800"
            >
              Sales Summary
            </h2>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Breakdown of sales for the selected period.
            </p>

          </div>

          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >

            <!-- GENERAL SALES -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
            >

              <h3
                class="font-black text-gray-800"
              >
                Sales Breakdown
              </h3>

              <div
                class="flex justify-between items-center"
              >

                <span
                  class="text-gray-600"
                >
                  Gross Sales
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  {{ formatAmount(grossSales) }}
                </span>

              </div>

              <div
                class="flex justify-between items-center"
              >

                <span
                  class="text-gray-600"
                >
                  Discounts
                </span>

                <span
                  class="font-black text-red-600"
                >
                  -{{ formatAmount(discounts) }}
                </span>

              </div>

              <div
                class="flex justify-between items-center"
              >

                <span
                  class="text-gray-600"
                >
                  Delivery Fees
                </span>

                <span
                  class="font-black text-blue-600"
                >
                  +{{ formatAmount(deliveryFees) }}
                </span>

              </div>

              <div
                class="pt-3 border-t border-gray-200 flex justify-between items-center"
              >

                <span
                  class="font-black text-gray-800"
                >
                  Net Sales
                </span>

                <span
                  class="font-black text-green-600"
                >
                  {{ formatAmount(totalSales) }}
                </span>

              </div>

            </div>

            <!-- PAYMENT -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
            >

              <h3
                class="font-black text-gray-800"
              >
                Payment Breakdown
              </h3>

              <div
                class="flex justify-between items-center"
              >

                <span
                  class="text-gray-600"
                >
                  Cash
                </span>

                <span
                  class="font-black text-green-600"
                >
                  {{ formatAmount(cashSales) }}
                </span>

              </div>

              <div
                class="flex justify-between items-center"
              >

                <span
                  class="text-gray-600"
                >
                  GCash
                </span>

                <span
                  class="font-black text-blue-600"
                >
                  {{ formatAmount(gcashSales) }}
                </span>

              </div>

              <div
                class="flex justify-between items-center"
              >

                <span
                  class="text-gray-600"
                >
                  Refunds
                </span>

                <span
                  class="font-black text-red-600"
                >
                  -{{ formatAmount(refunds) }}
                </span>

              </div>

              <div
                class="flex justify-between items-center"
              >

                <span
                  class="text-gray-600"
                >
                  Adjustments
                </span>

                <span
                  class="font-black text-blue-600"
                >
                  {{ formatAmount(adjustments) }}
                </span>

              </div>

            </div>

          </div>

        </section>

        <!-- ================================================= -->
        <!-- ORDER TYPE SALES -->
        <!-- ================================================= -->

        <section class="space-y-4">

          <div>

            <h2
              class="text-xl font-black text-gray-800"
            >
              Sales by Order Type
            </h2>

          </div>

          <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >

            <!-- DINE IN -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <div
                class="flex items-center justify-between"
              >

                <p
                  class="font-black text-gray-800"
                >
                  Dine-In
                </p>

                <span
                  class="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-black"
                >
                  {{ sales.dineInCount || 0 }}
                </span>

              </div>

              <p
                class="text-2xl font-black text-purple-600 mt-3"
              >
                {{ formatAmount(dineInSales) }}
              </p>

            </div>

            <!-- TAKE OUT -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <div
                class="flex items-center justify-between"
              >

                <p
                  class="font-black text-gray-800"
                >
                  Take-Out
                </p>

                <span
                  class="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-black"
                >
                  {{ sales.takeOutCount || 0 }}
                </span>

              </div>

              <p
                class="text-2xl font-black text-orange-600 mt-3"
              >
                {{ formatAmount(takeOutSales) }}
              </p>

            </div>

            <!-- DELIVERY -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <div
                class="flex items-center justify-between"
              >

                <p
                  class="font-black text-gray-800"
                >
                  Delivery
                </p>

                <span
                  class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black"
                >
                  {{ sales.deliveryCount || 0 }}
                </span>

              </div>

              <p
                class="text-2xl font-black text-blue-600 mt-3"
              >
                {{ formatAmount(deliverySales) }}
              </p>

            </div>

          </div>

        </section>

        <!-- ================================================= -->
        <!-- EXPENSE BREAKDOWN -->
        <!-- ================================================= -->

        <section class="space-y-4">

          <div>

            <h2
              class="text-xl font-black text-gray-800"
            >
              Expense Breakdown
            </h2>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Recorded expenses by category.
            </p>

          </div>

          <div
            class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5"
          >

            <!-- INGREDIENTS -->

            <div>

              <div
                class="flex justify-between items-center gap-3 mb-2"
              >

                <span
                  class="font-semibold text-gray-700"
                >
                  Ingredients
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  {{ formatAmount(ingredientsExpense) }}
                </span>

              </div>

              <div
                class="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
              >
                <div
                  class="h-full bg-green-500 rounded-full"
                  :style="{
                    width:
                      `${expensePercentage(ingredientsExpense)}%`
                  }"
                ></div>
              </div>

            </div>

            <!-- MATERIALS -->

            <div>

              <div
                class="flex justify-between items-center gap-3 mb-2"
              >

                <span
                  class="font-semibold text-gray-700"
                >
                  Materials
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  {{ formatAmount(materialsExpense) }}
                </span>

              </div>

              <div
                class="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
              >
                <div
                  class="h-full bg-yellow-500 rounded-full"
                  :style="{
                    width:
                      `${expensePercentage(materialsExpense)}%`
                  }"
                ></div>
              </div>

            </div>

            <!-- MAINTENANCE -->

            <div>

              <div
                class="flex justify-between items-center gap-3 mb-2"
              >

                <span
                  class="font-semibold text-gray-700"
                >
                  Maintenance
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  {{ formatAmount(maintenanceExpense) }}
                </span>

              </div>

              <div
                class="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
              >
                <div
                  class="h-full bg-orange-500 rounded-full"
                  :style="{
                    width:
                      `${expensePercentage(maintenanceExpense)}%`
                  }"
                ></div>
              </div>

            </div>

            <!-- BILLS -->

            <div>

              <div
                class="flex justify-between items-center gap-3 mb-2"
              >

                <span
                  class="font-semibold text-gray-700"
                >
                  Bills
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  {{ formatAmount(billsExpense) }}
                </span>

              </div>

              <div
                class="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
              >
                <div
                  class="h-full bg-red-500 rounded-full"
                  :style="{
                    width:
                      `${expensePercentage(billsExpense)}%`
                  }"
                ></div>
              </div>

            </div>

            <!-- MISCELLANEOUS -->

            <div>

              <div
                class="flex justify-between items-center gap-3 mb-2"
              >

                <span
                  class="font-semibold text-gray-700"
                >
                  Miscellaneous
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  {{ formatAmount(miscellaneousExpense) }}
                </span>

              </div>

              <div
                class="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
              >
                <div
                  class="h-full bg-gray-500 rounded-full"
                  :style="{
                    width:
                      `${expensePercentage(miscellaneousExpense)}%`
                  }"
                ></div>
              </div>

            </div>

            <!-- LABOR -->

            <div>

              <div
                class="flex justify-between items-center gap-3 mb-2"
              >

                <span
                  class="font-semibold text-gray-700"
                >
                  Labor
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  {{ formatAmount(laborExpense) }}
                </span>

              </div>

              <div
                class="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
              >
                <div
                  class="h-full bg-purple-500 rounded-full"
                  :style="{
                    width:
                      `${expensePercentage(laborExpense)}%`
                  }"
                ></div>
              </div>

            </div>

            <!-- TOTAL -->

            <div
              class="pt-4 border-t border-gray-200 flex justify-between items-center"
            >

              <span
                class="font-black text-gray-800"
              >
                Total Expenses
              </span>

              <span
                class="text-xl font-black text-red-600"
              >
                {{ formatAmount(totalExpenses) }}
              </span>

            </div>

          </div>

        </section>

        <!-- ================================================= -->
        <!-- BILL BREAKDOWN -->
        <!-- ================================================= -->

        <section class="space-y-4">

          <div>

            <h2
              class="text-xl font-black text-gray-800"
            >
              Bill Breakdown
            </h2>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Shows how Bills were included in the selected period.
            </p>

          </div>

          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >

            <!-- DIRECT -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Direct Bills
              </p>

              <p
                class="text-2xl font-black text-gray-800 mt-2"
              >
                {{ formatAmount(directBillExpense) }}
              </p>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                One-time or non-recurring bill records.
              </p>

            </div>

            <!-- RECURRING -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Recurring Bills
              </p>

              <p
                class="text-2xl font-black text-blue-600 mt-2"
              >
                {{ formatAmount(recurringBillExpense) }}
              </p>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Daily allocation from Daily / Weekly / Monthly bills.
              </p>

            </div>

            <!-- SELECTED DATE -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Selected Date Allocation
              </p>

              <p
                class="text-2xl font-black text-red-600 mt-2"
              >
                {{ formatAmount(selectedDateBillAllocation) }}
              </p>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Recurring bill allocation for {{ selectedDate }}.
              </p>

            </div>

          </div>

        </section>

        <!-- ================================================= -->
        <!-- LABOR BREAKDOWN -->
        <!-- ================================================= -->

        <section class="space-y-4">

          <div>

            <h2
              class="text-xl font-black text-gray-800"
            >
              Labor Breakdown
            </h2>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Regular labor, 13th Month, and Labor Benefits.
            </p>

          </div>

          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >

            <!-- REGULAR -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Regular Labor
              </p>

              <p
                class="text-2xl font-black text-purple-600 mt-2"
              >
                {{ formatAmount(regularLaborExpense) }}
              </p>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Payroll-period allocation.
              </p>

            </div>

            <!-- 13TH MONTH -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                13th Month
              </p>

              <p
                class="text-2xl font-black text-blue-600 mt-2"
              >
                {{ formatAmount(thirteenthMonthExpense) }}
              </p>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Full-month daily allocation.
              </p>

            </div>

            <!-- LABOR BENEFITS -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Labor Benefits
              </p>

              <p
                class="text-2xl font-black text-green-600 mt-2"
              >
                {{ formatAmount(laborBenefitsExpense) }}
              </p>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Dynamic Daily / Weekly / Monthly items.
              </p>

            </div>

            <!-- ESTIMATE -->

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Estimated Daily Regular
              </p>

              <p
                class="text-2xl font-black text-gray-800 mt-2"
              >
                {{ formatAmount(estimatedDailyRegularLabor) }}
              </p>

              <p
                class="text-xs text-gray-500 mt-1"
              >
                Source: {{ regularEstimateSource }}
              </p>

            </div>

          </div>

        </section>

        <!-- ================================================= -->
        <!-- SELECTED DATE LABOR ALLOCATION -->
        <!-- ================================================= -->

        <section class="space-y-4">

          <div>

            <h2
              class="text-xl font-black text-gray-800"
            >
              Selected Date Labor Allocation
            </h2>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Daily labor values used for {{ selectedDate }}.
            </p>

          </div>

          <div
            class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
          >

            <div
              class="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >

              <!-- REGULAR -->

              <div
                class="rounded-xl bg-purple-50 border border-purple-100 p-4"
              >

                <p
                  class="text-xs font-bold text-purple-600 uppercase tracking-wide"
                >
                  Regular Labor
                </p>

                <p
                  class="text-xl font-black text-purple-700 mt-2"
                >
                  {{ formatAmount(selectedDateRegularLabor) }}
                </p>

              </div>

              <!-- 13TH MONTH -->

              <div
                class="rounded-xl bg-blue-50 border border-blue-100 p-4"
              >

                <p
                  class="text-xs font-bold text-blue-600 uppercase tracking-wide"
                >
                  13th Month
                </p>

                <p
                  class="text-xl font-black text-blue-700 mt-2"
                >
                  {{ formatAmount(selectedDate13thMonth) }}
                </p>

              </div>

              <!-- BENEFITS -->

              <div
                class="rounded-xl bg-green-50 border border-green-100 p-4"
              >

                <p
                  class="text-xs font-bold text-green-600 uppercase tracking-wide"
                >
                  Labor Benefits
                </p>

                <p
                  class="text-xl font-black text-green-700 mt-2"
                >
                  {{ formatAmount(selectedDateLaborBenefits) }}
                </p>

              </div>

            </div>

            <div
              class="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center"
            >

              <span
                class="font-black text-gray-800"
              >
                Selected Date Total Labor
              </span>

              <span
                class="text-xl font-black text-purple-700"
              >
                {{
                  formatAmount(
                    selectedDateRegularLabor +
                    selectedDate13thMonth +
                    selectedDateLaborBenefits
                  )
                }}
              </span>

            </div>

          </div>

        </section>

        <!-- ================================================= -->
        <!-- AVERAGES -->
        <!-- ================================================= -->

        <section class="space-y-4">

          <div>

            <h2
              class="text-xl font-black text-gray-800"
            >
              Daily Averages
            </h2>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Useful for MTD and YTD monitoring.
            </p>

          </div>

          <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Average Sales
              </p>

              <p
                class="text-2xl font-black text-green-600 mt-2"
              >
                {{ formatAmount(averageSales) }}
              </p>

            </div>

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Average Expenses
              </p>

              <p
                class="text-2xl font-black text-red-600 mt-2"
              >
                {{ formatAmount(averageExpenses) }}
              </p>

            </div>

            <div
              class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >

              <p
                class="text-xs font-bold text-gray-500 uppercase tracking-wide"
              >
                Average Profit
              </p>

              <p
                class="text-2xl font-black mt-2"
                :class="
                  averageProfit >= 0
                    ? 'text-blue-600'
                    : 'text-red-600'
                "
              >
                {{ formatAmount(averageProfit) }}
              </p>

            </div>

          </div>

        </section>

        <!-- ================================================= -->
        <!-- PROFIT SUMMARY -->
        <!-- ================================================= -->

        <section>

          <div
            class="rounded-2xl p-6 border"
            :class="
              estimatedProfit >= 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200'
            "
          >

            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >

              <div>

                <p
                  class="text-xs font-bold uppercase tracking-wide"
                  :class="
                    estimatedProfit >= 0
                      ? 'text-blue-600'
                      : 'text-red-600'
                  "
                >
                  Estimated Profit
                </p>

                <p
                  class="text-3xl font-black mt-1"
                  :class="
                    estimatedProfit >= 0
                      ? 'text-blue-700'
                      : 'text-red-700'
                  "
                >
                  {{ formatAmount(estimatedProfit) }}
                </p>

                <p
                  class="text-sm mt-1"
                  :class="
                    estimatedProfit >= 0
                      ? 'text-blue-600'
                      : 'text-red-600'
                  "
                >
                  Net sales less recorded operating expenses.
                </p>

              </div>

              <div
                class="text-right"
              >

                <p
                  class="text-xs text-gray-500"
                >
                  Selected Period
                </p>

                <p
                  class="font-black text-gray-800"
                >
                  {{ activePeriod }}
                </p>

                <p
                  class="text-sm text-gray-500"
                >
                  {{ selectedDate }}
                </p>

              </div>

            </div>

          </div>

        </section>

      </template>

      <!-- ================================================== -->
      <!-- NO REPORT -->
      <!-- ================================================== -->

      <div
        v-else-if="!isLoading"
        class="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500"
      >

        <div
          class="text-4xl mb-3"
        >
          📊
        </div>

        <h3
          class="font-black text-gray-700"
        >
          No Report Data
        </h3>

        <p
          class="text-sm text-gray-400 mt-1"
        >
          Walang report data para sa napiling petsa.
        </p>

      </div>

    </template>

  </div>
</template>