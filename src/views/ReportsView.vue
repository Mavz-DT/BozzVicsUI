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
| MTD Daily Breakdown (records table)
|--------------------------------------------------------------------------
*/

const dailyBreakdown = ref({
  month: '',
  rows: [],
  totals: null,
  menuSales: [],
  menuSalesByDate: {},
  expenseItems: []
})

// YTD — per-buwan na breakdown (Jan hanggang current month).
const yearBreakdown = ref({
  year: '',
  rows: [],
  totals: null,
  menuSales: [],
  menuSalesByMonth: {},
  expenseItems: []
})

const breakdownLoading = ref(false)
const breakdownError = ref('')
const yearBreakdownLoading = ref(false)
const yearBreakdownError = ref('')

// Sort order ng Top/Bottom menu tables: 'sales' (default) o 'qty'.
const topSort = ref('sales')
const bottomSort = ref('sales')

// Daily (per-araw) menu table sort.
const dailyTopSort = ref('sales')
const dailyBottomSort = ref('sales')

// YTD overall sales sort + expenses sort.
const yearOverallSort = ref('sales')
const yearExpSort = ref('cost')

// Fullscreen view ng MTD records table (pseudo-fullscreen overlay).
const isTableFullscreen = ref(false)

const toggleTableFullscreen = () => {
  isTableFullscreen.value =
    !isTableFullscreen.value
}

// Generic fullscreen para sa lahat ng tables (bawat table may key).
const fullscreenTable = ref('')

const toggleFullscreen = key => {
  fullscreenTable.value =
    fullscreenTable.value === key ? '' : key
}

const isFs = key => {
  return fullscreenTable.value === key
}

// Hide (default) / Show toggle para sa bawat table — naka-collapse muna
// para hindi agad nakalatag ang buong table (iwas scroll).
const expandedTables = ref(new Set())

const toggleCollapse = key => {
  const s = new Set(expandedTables.value)
  if (s.has(key)) {
    s.delete(key)
    // kapag itinago, alisin din ang fullscreen kung ito ang naka-fullscreen
    if (fullscreenTable.value === key) fullscreenTable.value = ''
  } else {
    s.add(key)
  }
  expandedTables.value = s
}

const isCollapsed = key => {
  return !expandedTables.value.has(key)
}

/*
|--------------------------------------------------------------------------
| Cash Audit Snapshot
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This is always for the selected date only.
| It is NOT cumulative MTD or YTD cash.
|
*/

const cashAudit = ref({
  date: '',
  openingCash: 0,
  cashSales: 0,
  otherCashIn: 0,
  storeExpenses: 0,
  otherCashOut: 0,
  expectedCash: 0,
  gcashReceived: 0
})

const cashAuditLoading = ref(false)
const cashAuditError = ref('')

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API = `${API_BASE_URL}/api`

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
  return `₱${Number(
    amount || 0
  ).toLocaleString(
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

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—'
  }

  return date.toLocaleDateString(
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
| Backend end date is exclusive.
|--------------------------------------------------------------------------
*/

const formatReportEndDate = value => {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—'
  }

  date.setTime(
    date.getTime() - 1
  )

  return formatDateOnly(date)
}

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

/*
|--------------------------------------------------------------------------
| Normalize Report Response
|--------------------------------------------------------------------------
*/

const normalizeReportResponse = data => {
  const source =
    data?.reports ||
    data?.data ||
    data ||
    {}

  return {
    daily:
      source?.daily ||
      null,

    mtd:
      source?.mtd ||
      null,

    ytd:
      source?.ytd ||
      null
  }
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
  if (
    activePeriod.value ===
    'Daily'
  ) {
    return reports.value.daily
  }

  if (
    activePeriod.value ===
    'MTD'
  ) {
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
  return (
    activeReport.value?.sales ||
    {}
  )
})

const totalSales = computed(() => {
  return Number(
    sales.value.netSales ||
    0
  )
})

const grossSales = computed(() => {
  return Number(
    sales.value.grossSales ||
    0
  )
})

const discounts = computed(() => {
  return Number(
    sales.value.discounts ||
    0
  )
})

const deliveryFees = computed(() => {
  return Number(
    sales.value.deliveryFees ||
    0
  )
})

const orderCount = computed(() => {
  return Number(
    sales.value.orderCount ||
    0
  )
})

const cashSales = computed(() => {
  return Number(
    sales.value.cash ||
    0
  )
})

const gcashSales = computed(() => {
  return Number(
    sales.value.gcash ||
    0
  )
})

const dineInSales = computed(() => {
  return Number(
    sales.value.dineIn ||
    0
  )
})

const takeOutSales = computed(() => {
  return Number(
    sales.value.takeOut ||
    0
  )
})

const deliverySales = computed(() => {
  return Number(
    sales.value.delivery ||
    0
  )
})

const refunds = computed(() => {
  return Number(
    sales.value.refunds ||
    0
  )
})

const adjustments = computed(() => {
  return Number(
    sales.value.adjustments ||
    0
  )
})

/*
|--------------------------------------------------------------------------
| Expenses
|--------------------------------------------------------------------------
*/

const expenses = computed(() => {
  return (
    activeReport.value?.expenses ||
    {}
  )
})

const ingredientsExpense = computed(() => {
  return Number(
    expenses.value.ingredients ||
    0
  )
})

const materialsExpense = computed(() => {
  return Number(
    expenses.value.materials ||
    0
  )
})

const maintenanceExpense = computed(() => {
  return Number(
    expenses.value.maintenance ||
    0
  )
})

const billsExpense = computed(() => {
  return Number(
    expenses.value.bills ||
    0
  )
})

const miscellaneousExpense = computed(() => {
  return Number(
    expenses.value.miscellaneous ||
    0
  )
})

const laborExpense = computed(() => {
  return Number(
    expenses.value.labor ||
    0
  )
})

const totalExpenses = computed(() => {
  return Number(
    expenses.value.total ||
    0
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
    billBreakdown.value.direct ||
    0
  )
})

const recurringBillExpense = computed(() => {
  return Number(
    billBreakdown.value.recurring ||
    0
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
    laborBreakdown.value.regular ||
    0
  )
})

const thirteenthMonthExpense =
  computed(() => {
    return Number(
      laborBreakdown.value
        .thirteenthMonth ||
        0
    )
  })

const laborBenefitsExpense =
  computed(() => {
    return Number(
      laborBreakdown.value
        .laborBenefits ||
        0
    )
  })

const estimatedDailyRegularLabor =
  computed(() => {
    return Number(
      laborBreakdown.value
        .regularEstimatedDaily ||
        0
    )
  })

const regularEstimateSource =
  computed(() => {
    return (
      laborBreakdown.value
        .regularEstimateSource ||
      '—'
    )
  })

const dailyRegularLabor =
  computed(() => {
    return (
      laborBreakdown.value
        .dailyRegular ||
      {}
    )
  })

const daily13thMonthLabor =
  computed(() => {
    return (
      laborBreakdown.value
        .daily13thMonth ||
      {}
    )
  })

const dailyLaborBenefits =
  computed(() => {
    return (
      laborBreakdown.value
        .dailyLaborBenefits ||
      {}
    )
  })

const selectedDateRegularLabor =
  computed(() => {
    return Number(
      dailyRegularLabor.value[
        selectedDate.value
      ] || 0
    )
  })

const selectedDate13thMonth =
  computed(() => {
    return Number(
      daily13thMonthLabor.value[
        selectedDate.value
      ] || 0
    )
  })

const selectedDateLaborBenefits =
  computed(() => {
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

const estimatedProfit =
  computed(() => {
    return Number(
      activeReport.value?.profit
        ?.estimated ||
      0
    )
  })

/*
|--------------------------------------------------------------------------
| Averages
|--------------------------------------------------------------------------
*/

const averageSales = computed(() => {
  return Number(
    activeReport.value
      ?.averages?.dailySales ||
    0
  )
})

const averageExpenses =
  computed(() => {
    return Number(
      activeReport.value
        ?.averages?.dailyExpenses ||
      0
    )
  })

const averageProfit =
  computed(() => {
    return Number(
      activeReport.value
        ?.averages?.dailyProfit ||
      0
    )
  })

/*
|--------------------------------------------------------------------------
| Fetch Cash Audit Snapshot
|--------------------------------------------------------------------------
*/

const fetchCashAudit = async () => {
  if (!selectedDate.value) {
    return
  }

  cashAuditLoading.value =
    true

  cashAuditError.value =
    ''

  try {
    const token =
      getToken()

    if (!token) {
      throw new Error(
        'Walang authentication token.'
      )
    }

    const response =
      await axios.get(
        `${API}/cash-transactions`,
        {
          params: {
            date:
              selectedDate.value
          },

          headers:
            getAuthHeaders()
        }
      )

    const data =
      response.data || {}

    cashAudit.value = {
      date:
        data.date ||
        selectedDate.value,

      openingCash:
        Number(
          data.openingCash || 0
        ),

      cashSales:
        Number(
          data.cashSales || 0
        ),

      otherCashIn:
        Number(
          data.otherCashIn || 0
        ),

      storeExpenses:
        Number(
          data.storeExpenses || 0
        ),

      otherCashOut:
        Number(
          data.otherCashOut || 0
        ),

      expectedCash:
        Number(
          data.expectedCash || 0
        ),

      gcashReceived:
        Number(
          data.gcashReceived || 0
        )
    }
  } catch (err) {
    console.error(
      'fetchCashAudit error:',
      err
    )

    cashAudit.value = {
      date:
        selectedDate.value,

      openingCash: 0,
      cashSales: 0,
      otherCashIn: 0,
      storeExpenses: 0,
      otherCashOut: 0,
      expectedCash: 0,
      gcashReceived: 0
    }

    if (
      err?.response?.status ===
      401
    ) {
      cashAuditError.value =
        'Session expired o invalid ang login token.'
    } else if (
      err?.response?.data?.message
    ) {
      cashAuditError.value =
        err.response.data.message
    } else {
      cashAuditError.value =
        err?.message ||
        'Hindi ma-load ang Cash Audit Snapshot.'
    }
  } finally {
    cashAuditLoading.value =
      false
  }
}

/*
|--------------------------------------------------------------------------
| Import Historical (Excel upload)
|--------------------------------------------------------------------------
*/

const isImportModalOpen = ref(false)
const importFile = ref(null)
const importFileName = ref('')
const importing = ref(false)
const importResult = ref(null)
const importError = ref('')

const openImportModal = () => {
  isImportModalOpen.value = true
  importFile.value = null
  importFileName.value = ''
  importResult.value = null
  importError.value = ''
}

const closeImportModal = () => {
  isImportModalOpen.value = false
}

const onImportFileChange = e => {
  const f = e.target.files && e.target.files[0]
  importFile.value = f || null
  importFileName.value = f ? f.name : ''
  importResult.value = null
  importError.value = ''
}

const submitImport = async () => {
  if (!importFile.value) {
    importError.value = 'Pumili muna ng Excel file.'
    return
  }

  importing.value = true
  importError.value = ''
  importResult.value = null

  try {
    const form = new FormData()
    form.append('file', importFile.value)

    const res = await axios.post(
      `${API}/reports/import-historical`,
      form,
      { headers: getAuthHeaders() }
    )

    importResult.value = res.data
    importFile.value = null
    importFileName.value = ''

    // I-refresh ang reports para lumabas agad ang na-import.
    await fetchReports()
  } catch (err) {
    importError.value =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to import.'
  } finally {
    importing.value = false
  }
}

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
    const token =
      getToken()

    if (!token) {
      throw new Error(
        'Walang authentication token. Mag-login ulit sa POS.'
      )
    }

    const response =
      await axios.get(
        `${API}/reports`,
        {
          params: {
            date:
              selectedDate.value
          },

          headers:
            getAuthHeaders()
        }
      )

    console.log(
      'Reports API response:',
      response.data
    )

    const normalized =
      normalizeReportResponse(
        response.data
      )

    reports.value =
      normalized

    const hasAnyReport =
      Boolean(
        normalized.daily ||
        normalized.mtd ||
        normalized.ytd
      )

    if (!hasAnyReport) {
      console.warn(
        'No daily/MTD/YTD report objects found in API response.',
        response.data
      )
    }

    /*
    |----------------------------------------------------------------------
    | Cash Audit Snapshot
    |----------------------------------------------------------------------
    */

    await fetchCashAudit()

    await fetchDailyBreakdown()

    await fetchYearBreakdown()

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

    if (
      err?.response?.status ===
      401
    ) {
      error.value =
        'Session expired o invalid ang login token. Mag-login ulit sa POS.'
    } else if (
      err?.response?.data?.message
    ) {
      error.value =
        err.response.data.message
    } else {
      error.value =
        err?.message ||
        'Failed to load reports.'
    }
  } finally {
    isLoading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| Date
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Fetch MTD Daily Breakdown
|--------------------------------------------------------------------------
*/

const fetchDailyBreakdown = async () => {
  if (!selectedDate.value || !isAdmin.value) {
    return
  }

  breakdownLoading.value = true
  breakdownError.value = ''

  try {
    const month =
      selectedDate.value.slice(0, 7)

    const response =
      await axios.get(
        `${API}/reports/daily-breakdown`,
        {
          params: { month },
          headers: getAuthHeaders()
        }
      )

    dailyBreakdown.value = {
      month:
        response.data?.month || month,
      rows:
        Array.isArray(response.data?.rows)
          ? response.data.rows
          : [],
      totals:
        response.data?.totals || null,
      menuSales:
        Array.isArray(response.data?.menuSales)
          ? response.data.menuSales
          : [],
      menuSalesByDate:
        response.data?.menuSalesByDate &&
        typeof response.data.menuSalesByDate === 'object'
          ? response.data.menuSalesByDate
          : {},
      expenseItems:
        Array.isArray(response.data?.expenseItems)
          ? response.data.expenseItems
          : []
    }
  } catch (err) {
    console.error(
      'fetchDailyBreakdown error:',
      err
    )

    dailyBreakdown.value = {
      month: '',
      rows: [],
      totals: null,
      menuSales: [],
      menuSalesByDate: {},
      expenseItems: []
    }

    breakdownError.value =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to load daily breakdown.'
  } finally {
    breakdownLoading.value = false
  }
}

const fetchYearBreakdown = async () => {
  if (!selectedDate.value || !isAdmin.value) {
    return
  }

  yearBreakdownLoading.value = true
  yearBreakdownError.value = ''

  try {
    const year =
      selectedDate.value.slice(0, 4)

    const response =
      await axios.get(
        `${API}/reports/year-breakdown`,
        {
          params: { year },
          headers: getAuthHeaders()
        }
      )

    yearBreakdown.value = {
      year:
        response.data?.year || year,
      rows:
        Array.isArray(response.data?.rows)
          ? response.data.rows
          : [],
      totals:
        response.data?.totals || null,
      menuSales:
        Array.isArray(response.data?.menuSales)
          ? response.data.menuSales
          : [],
      menuSalesByMonth:
        response.data?.menuSalesByMonth &&
        typeof response.data.menuSalesByMonth === 'object'
          ? response.data.menuSalesByMonth
          : {},
      expenseItems:
        Array.isArray(response.data?.expenseItems)
          ? response.data.expenseItems
          : []
    }
  } catch (err) {
    console.error(
      'fetchYearBreakdown error:',
      err
    )

    yearBreakdown.value = {
      year: '',
      rows: [],
      totals: null,
      menuSales: [],
      menuSalesByMonth: {},
      expenseItems: []
    }

    yearBreakdownError.value =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to load year breakdown.'
  } finally {
    yearBreakdownLoading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| Table helpers (per-day records)
|--------------------------------------------------------------------------
*/

const dayName = dateStr => {
  if (!dateStr) return ''

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short'
  }).format(
    new Date(`${dateStr}T00:00:00+08:00`)
  )
}

const shortDate = dateStr => {
  if (!dateStr) return ''

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric'
  }).format(
    new Date(`${dateStr}T00:00:00+08:00`)
  )
}

// 'YYYY-MM' → 'Jan 2026' (para sa YTD per-buwan na rows).
const monthLabel = monthStr => {
  if (!monthStr) return ''

  const [y, m] = String(monthStr).split('-')

  if (!y || !m) return monthStr

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    year: 'numeric'
  }).format(
    new Date(`${y}-${m}-01T00:00:00+08:00`)
  )
}

// 'YYYY-MM' → 'Jan' (maikling buwan para sa chart axis).
const monthShort = monthStr => {
  if (!monthStr) return ''

  const [y, m] = String(monthStr).split('-')

  if (!y || !m) return monthStr

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short'
  }).format(
    new Date(`${y}-${m}-01T00:00:00+08:00`)
  )
}

// 'YYYY-MM' → 'January' (pangalan lang ng buwan).
const monthName = monthStr => {
  if (!monthStr) return ''

  const [y, m] = String(monthStr).split('-')

  if (!y || !m) return monthStr

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long'
  }).format(
    new Date(`${y}-${m}-01T00:00:00+08:00`)
  )
}

/*
|--------------------------------------------------------------------------
| Daily Average (hindi kasama ang closed days)
|--------------------------------------------------------------------------
|
| Kapag 0 ang Sales sa isang araw = closed. HINDI ito isinasama sa
| pag-compute ng daily average. Denominator = bilang ng mga araw na
| may benta (open days).
|
*/

const openDays = computed(() => {
  return dailyBreakdown.value.rows.filter(
    row => Number(row.sales || 0) > 0
  )
})

// Row ng napiling araw mula sa breakdown — ginagamit sa Daily report
// para tumugma sa fields ng MTD summary.
const dailyRow = computed(() => {
  return (
    dailyBreakdown.value.rows.find(
      row => row.date === selectedDate.value
    ) || null
  )
})

/*
|--------------------------------------------------------------------------
| Top / Bottom menu sales (buong buwan)
|--------------------------------------------------------------------------
*/

const sortMenus = (list, key, dir) => {
  return [...list].sort((a, b) =>
    dir === 'desc'
      ? Number(b[key] || 0) - Number(a[key] || 0)
      : Number(a[key] || 0) - Number(b[key] || 0)
  )
}

const topMenus = computed(() => {
  // Lahat ng may benta (walang 20 limit).
  return sortMenus(
    (dailyBreakdown.value.menuSales || []).filter(
      m => Number(m.qty || 0) > 0 || Number(m.sales || 0) > 0
    ),
    topSort.value,
    'desc'
  )
})

const bottomMenus = computed(() => {
  return sortMenus(
    dailyBreakdown.value.menuSales || [],
    bottomSort.value,
    'asc'
  ).slice(0, 20)
})

// Per-araw na menu list para sa Daily report (kasama ang hindi nabenta).
const dailyMenuList = computed(() => {
  const dayEntries =
    dailyBreakdown.value.menuSalesByDate?.[selectedDate.value] || []

  const dayMap = new Map()

  dayEntries.forEach(e => {
    const k =
      e.menuId || `name:${e.name}`
    dayMap.set(k, e)
  })

  // Gamitin ang buong menu list (month) para kasama ang 0-sales.
  return (dailyBreakdown.value.menuSales || []).map(m => {
    const k =
      m.menuId || `name:${m.name}`
    const d = dayMap.get(k)

    return {
      menuId: m.menuId,
      name: m.name,
      qty: d ? Number(d.qty || 0) : 0,
      sales: d ? Number(d.sales || 0) : 0
    }
  })
})

const dailyTopMenus = computed(() => {
  // Lahat ng may benta sa araw na ito (walang 20 limit).
  return sortMenus(
    dailyMenuList.value.filter(
      m => Number(m.qty || 0) > 0 || Number(m.sales || 0) > 0
    ),
    dailyTopSort.value,
    'desc'
  )
})

const dailyBottomMenus = computed(() => {
  return sortMenus(
    dailyMenuList.value,
    dailyBottomSort.value,
    'asc'
  ).slice(0, 20)
})

/*
|--------------------------------------------------------------------------
| Expenses breakdown by category (Daily + MTD)
|--------------------------------------------------------------------------
*/

const EXPENSE_CATEGORY_LABELS = {
  Ingredient: 'Ingredients',
  Material: 'Material',
  Maintenance: 'Maintenance',
  Miscellaneous: 'Miscellaneous',
  Labor: 'Labor Cost',
  Bill: 'Bills'
}

const EXPENSE_CATEGORY_ORDER = [
  'Ingredient',
  'Material',
  'Maintenance',
  'Miscellaneous',
  'Labor',
  'Bill'
]

const groupExpenses = (items, sortKey = 'cost') => {
  const byCat = {}

  // Group by category, tapos pagsama-samahin ang parehong item name
  // (case-insensitive) — i-total ang qty at cost.
  items.forEach(it => {
    if (!byCat[it.category]) {
      byCat[it.category] = {}
    }
    const nm = (it.name || '(walang pangalan)').trim()
    const key = nm.toLowerCase()
    if (!byCat[it.category][key]) {
      byCat[it.category][key] = { name: nm, qty: 0, amount: 0 }
    }
    byCat[it.category][key].qty += Number(it.qty || 1)
    byCat[it.category][key].amount += Number(it.amount || 0)
  })

  return EXPENSE_CATEGORY_ORDER
    .filter(c => byCat[c] && Object.keys(byCat[c]).length)
    .map(c => {
      const grouped = Object.values(byCat[c])
        .map(x => ({
          name: x.name,
          qty: x.qty,
          amount: Math.round(x.amount * 100) / 100
        }))
        .sort((a, b) =>
          sortKey === 'qty'
            ? b.qty - a.qty || b.amount - a.amount
            : b.amount - a.amount || b.qty - a.qty
        )
      return {
        category: c,
        label: EXPENSE_CATEGORY_LABELS[c] || c,
        items: grouped,
        qtyTotal: grouped.reduce((s, i) => s + i.qty, 0),
        subtotal:
          Math.round(
            grouped.reduce((s, i) => s + i.amount, 0) * 100
          ) / 100
      }
    })
}

// Sort ng mga item sa loob ng bawat category: 'cost' (default) o 'qty'.
const mtdExpSort = ref('cost')
const dailyExpSort = ref('cost')

// Expand/collapse ng bawat category sa expenses breakdown (naka-sarado muna —
// categories lang ang nakikita, may dropdown arrow para buksan ang detalye).
const expandedExpCats = ref(new Set())

const toggleExpCat = (table, cat) => {
  const k = `${table}:${cat}`
  const s = new Set(expandedExpCats.value)
  if (s.has(k)) s.delete(k)
  else s.add(k)
  expandedExpCats.value = s
}

const isExpCatOpen = (table, cat) => {
  return expandedExpCats.value.has(`${table}:${cat}`)
}

// Expand/collapse ng per-item history (per date na binili).
const expandedExpItems = ref(new Set())

const expItemKey = (table, cat, name) =>
  `${table}:${cat}:${(name || '').trim().toLowerCase()}`

const toggleExpItem = (table, cat, name) => {
  const k = expItemKey(table, cat, name)
  const s = new Set(expandedExpItems.value)
  if (s.has(k)) s.delete(k)
  else s.add(k)
  expandedExpItems.value = s
}

const isExpItemOpen = (table, cat, name) => {
  return expandedExpItems.value.has(expItemKey(table, cat, name))
}

// History ng isang expense item: lahat ng record (per date) na tumutugma
// sa category + name, naka-sort by date (pinakaluma muna).
const expenseItemHistory = (category, name) => {
  const nm = (name || '').trim().toLowerCase()
  return (dailyBreakdown.value.expenseItems || [])
    .filter(
      it =>
        it.category === category &&
        (it.name || '').trim().toLowerCase() === nm
    )
    .slice()
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    )
}

const mtdExpenseGroups = computed(() => {
  return groupExpenses(
    dailyBreakdown.value.expenseItems || [],
    mtdExpSort.value
  )
})

const dailyExpenseGroups = computed(() => {
  return groupExpenses(
    (dailyBreakdown.value.expenseItems || []).filter(
      it => it.date === selectedDate.value
    ),
    dailyExpSort.value
  )
})

const mtdExpenseGrand = computed(() => {
  return Math.round(
    mtdExpenseGroups.value.reduce(
      (s, g) => s + g.subtotal,
      0
    ) * 100
  ) / 100
})

const dailyExpenseGrand = computed(() => {
  return Math.round(
    dailyExpenseGroups.value.reduce(
      (s, g) => s + g.subtotal,
      0
    ) * 100
  ) / 100
})

const mtdExpenseGrandQty = computed(() => {
  return mtdExpenseGroups.value.reduce(
    (s, g) => s + g.qtyTotal,
    0
  )
})

const dailyExpenseGrandQty = computed(() => {
  return dailyExpenseGroups.value.reduce(
    (s, g) => s + g.qtyTotal,
    0
  )
})

const dailyAverage = computed(() => {
  const days = openDays.value
  const n = days.length

  const avg = key =>
    n
      ? days.reduce(
          (sum, row) =>
            sum + Number(row[key] || 0),
          0
        ) / n
      : 0

  return {
    openDayCount: n,
    sales: avg('sales'),
    totalExpenses: avg('totalExpenses'),
    balance: avg('balance'),
    profit: avg('profit'),
    ingredients: avg('ingredients'),
    materials: avg('materials'),
    maintenance: avg('maintenance'),
    miscellaneous: avg('miscellaneous'),
    labor: avg('labor'),
    bills: avg('bills'),
    orderQty: avg('orderQty'),
    dineInCount: avg('dineInCount'),
    takeOutCount: avg('takeOutCount'),
    deliveryCount: avg('deliveryCount'),
    dineInSales: avg('dineInSales'),
    takeOutSales: avg('takeOutSales'),
    deliverySales: avg('deliverySales'),
    refundDiscount: avg('refundDiscount')
  }
})

// =====================================================
// YTD — per-buwan na computeds (mirror ng MTD)
// =====================================================

const openMonths = computed(() => {
  return yearBreakdown.value.rows.filter(
    row => Number(row.sales || 0) > 0
  )
})

const monthlyAverage = computed(() => {
  const months = openMonths.value
  const n = months.length

  const avg = key =>
    n
      ? months.reduce(
          (sum, row) => sum + Number(row[key] || 0),
          0
        ) / n
      : 0

  return {
    openMonthCount: n,
    sales: avg('sales'),
    totalExpenses: avg('totalExpenses'),
    balance: avg('balance'),
    profit: avg('profit'),
    ingredients: avg('ingredients'),
    materials: avg('materials'),
    maintenance: avg('maintenance'),
    miscellaneous: avg('miscellaneous'),
    labor: avg('labor'),
    bills: avg('bills'),
    orderQty: avg('orderQty'),
    dineInCount: avg('dineInCount'),
    takeOutCount: avg('takeOutCount'),
    deliveryCount: avg('deliveryCount'),
    dineInSales: avg('dineInSales'),
    takeOutSales: avg('takeOutSales'),
    deliverySales: avg('deliverySales'),
    refundDiscount: avg('refundDiscount')
  }
})

// Overall sales record — LAHAT ng items (kasama ang 0 sales), sortable.
const overallMenus = computed(() => {
  return sortMenus(
    yearBreakdown.value.menuSales || [],
    yearOverallSort.value,
    'desc'
  )
})

// Expand/collapse per item para sa per-month sales performance.
const expandedYearMenus = ref(new Set())

const yearMenuKey = m =>
  m.menuId || `name:${m.name}`

const toggleYearMenu = m => {
  const k = yearMenuKey(m)
  const s = new Set(expandedYearMenus.value)
  if (s.has(k)) s.delete(k)
  else s.add(k)
  expandedYearMenus.value = s
}

const isYearMenuOpen = m =>
  expandedYearMenus.value.has(yearMenuKey(m))

// Per-month na qty + sales ng isang item (Jan..current month ng taon).
const itemMonthlySeries = m => {
  const key = yearMenuKey(m)

  return (yearBreakdown.value.rows || []).map(r => {
    const mk = r.date
    const arr =
      yearBreakdown.value.menuSalesByMonth?.[mk] || []
    const found = arr.find(
      e => (e.menuId || `name:${e.name}`) === key
    )

    return {
      month: mk,
      qty: found ? Number(found.qty || 0) : 0,
      sales: found ? Number(found.sales || 0) : 0
    }
  })
}

// Pinakamataas na halaga sa series para sa isang metric key (scaling).
const seriesMax = (series, key) => {
  return series.reduce(
    (mx, p) => Math.max(mx, Number(p[key] || 0)),
    0
  )
}

// Length % ng bar (minimum 2% kapag may halaga para kitang-kita).
const barPct = (value, max) => {
  const v = Number(value || 0)
  if (!max || v <= 0) return 0
  return Math.max(2, Math.round((v / max) * 100))
}

// Pinakamababang halaga na > 0 (para sa color scaling).
const seriesMinPos = (series, key) => {
  const vals = series
    .map(p => Number(p[key] || 0))
    .filter(v => v > 0)
  return vals.length ? Math.min(...vals) : 0
}

// Kulay ng bar: GREEN ang pinakamataas, RED ang pinakamababa, at
// gradient (red -> dilaw -> green) ang mga nasa gitna.
const barColor = (value, series, key) => {
  const v = Number(value || 0)
  if (v <= 0) return 'transparent'

  const max = seriesMax(series, key)
  const min = seriesMinPos(series, key)

  // Kung iisa lang o pare-pareho ang halaga -> green.
  if (max <= min) return 'hsl(140 65% 42%)'

  const t = (v - min) / (max - min) // 0 (lowest) .. 1 (highest)
  const hue = Math.round(t * 130)   // 0 = red, 130 ≈ green
  return `hsl(${hue} 70% 45%)`
}

// Metric toggle para sa YTD drill-down charts.
const ytdSalesMetric = ref('sales')   // Overall Sales Record: 'sales' | 'qty'
const ytdExpMetric = ref('cost')      // Expenses Breakdown: 'cost' | 'qty'

// Per-month na qty + amount ng isang expense item (Jan..current month).
const expenseItemMonthlySeries = (category, name) => {
  const nm = (name || '').trim().toLowerCase()
  const byMonth = {}

  ;(yearBreakdown.value.expenseItems || []).forEach(it => {
    if (
      it.category === category &&
      (it.name || '').trim().toLowerCase() === nm
    ) {
      const mk = String(it.date).slice(0, 7)
      if (!byMonth[mk]) byMonth[mk] = { qty: 0, amount: 0 }
      byMonth[mk].qty += Number(it.qty || 1)
      byMonth[mk].amount += Number(it.amount || 0)
    }
  })

  return (yearBreakdown.value.rows || []).map(r => {
    const e = byMonth[r.date] || { qty: 0, amount: 0 }
    return {
      month: r.date,
      qty: round2(e.qty),
      amount: round2(e.amount)
    }
  })
}

const yearExpenseGroups = computed(() => {
  return groupExpenses(
    yearBreakdown.value.expenseItems || [],
    yearExpSort.value
  )
})

const yearExpenseGrand = computed(() => {
  return Math.round(
    yearExpenseGroups.value.reduce(
      (s, g) => s + g.subtotal,
      0
    ) * 100
  ) / 100
})

const yearExpenseGrandQty = computed(() => {
  return yearExpenseGroups.value.reduce(
    (s, g) => s + g.qtyTotal,
    0
  )
})

// History ng isang YTD expense item (per date na binili sa buong taon).
const yearExpenseItemHistory = (category, name) => {
  const nm = (name || '').trim().toLowerCase()
  return (yearBreakdown.value.expenseItems || [])
    .filter(
      it =>
        it.category === category &&
        (it.name || '').trim().toLowerCase() === nm
    )
    .slice()
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    )
}

// Average ng counts — 1 decimal (hindi currency).
const fmtAvgCount = n => Number(n || 0).toFixed(1)

const round2 = n =>
  Math.round(
    (Number(n || 0) + Number.EPSILON) * 100
  ) / 100

/*
|--------------------------------------------------------------------------
| +/- Balance (cash-audit adjustment) — recompute + save
|--------------------------------------------------------------------------
*/

const recomputeBreakdownTotals = () => {
  const rows =
    dailyBreakdown.value.rows

  const keys = [
    'sales',
    'totalExpenses',
    'balance',
    'profit',
    'ingredients',
    'materials',
    'maintenance',
    'miscellaneous',
    'labor',
    'bills',
    'orderQty',
    'dineInCount',
    'takeOutCount',
    'deliveryCount',
    'dineInSales',
    'takeOutSales',
    'deliverySales',
    'refundDiscount'
  ]

  const totals = {}

  keys.forEach(k => {
    totals[k] = round2(
      rows.reduce(
        (sum, r) =>
          sum + Number(r[k] || 0),
        0
      )
    )
  })

  dailyBreakdown.value.totals = totals
}

const savingBalanceDate = ref('')

const saveDailyBalance = async (
  row,
  rawValue
) => {
  const amount =
    rawValue === '' ||
    rawValue === null ||
    rawValue === undefined
      ? 0
      : Number(rawValue)

  const safeAmount =
    Number.isFinite(amount)
      ? round2(amount)
      : 0

  // Optimistic local update: balance + profit + totals
  row.balance = safeAmount

  row.profit = round2(
    Number(row.sales || 0) +
    safeAmount -
    Number(row.totalExpenses || 0)
  )

  recomputeBreakdownTotals()

  // Persist
  savingBalanceDate.value = row.date

  try {
    await axios.put(
      `${API}/reports/daily-balance`,
      {
        date: row.date,
        amount: safeAmount
      },
      {
        headers: getAuthHeaders()
      }
    )
  } catch (err) {
    console.error(
      'saveDailyBalance error:',
      err
    )

    breakdownError.value =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to save balance adjustment.'
  } finally {
    savingBalanceDate.value = ''
  }
}

const handleDateChange = () => {
  fetchReports()
}

// MTD: month-year picker -> itakda ang selectedDate sa unang araw ng buwan.
const onMonthChange = e => {
  const v = e.target.value // 'YYYY-MM'
  if (!/^\d{4}-\d{2}$/.test(v)) return
  selectedDate.value = `${v}-01`
  fetchReports()
}

// YTD: year picker -> itakda ang selectedDate sa Jan 1 ng taon.
const onYearChange = e => {
  const v = String(e.target.value || '').trim()
  if (!/^\d{4}$/.test(v)) return
  selectedDate.value = `${v}-01-01`
  fetchReports()
}

/*
|--------------------------------------------------------------------------
| Period
|--------------------------------------------------------------------------
*/

const selectPeriod = period => {
  activePeriod.value =
    period
}

/*
|--------------------------------------------------------------------------
| Expense Percentage
|--------------------------------------------------------------------------
*/

const expensePercentage = amount => {
  if (
    totalExpenses.value <= 0
  ) {
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

    <!-- ADMIN CHECK -->

    <div
      v-if="!isAdmin"
      class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 font-bold"
    >
      Admin access is required to view reports.
    </div>

    <template v-else>

      <!-- HEADER -->

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
            Sales, expenses, cash position, and estimated profit.
          </p>

          <button
            type="button"
            @click="openImportModal"
            class="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            📥 Import Historical (Excel)
          </button>

        </div>

        <div
          class="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
        >

          <label
            class="block text-xs font-bold text-gray-500 mb-1"
          >
            {{ activePeriod === 'MTD' ? 'Report Month' : activePeriod === 'YTD' ? 'Report Year' : 'Report Date' }}
          </label>

          <!-- Daily: buong petsa -->
          <input
            v-if="activePeriod === 'Daily'"
            v-model="selectedDate"
            @change="handleDateChange"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-200"
          />

          <!-- MTD: month-year lang -->
          <input
            v-else-if="activePeriod === 'MTD'"
            :value="(selectedDate || '').slice(0, 7)"
            @change="onMonthChange"
            type="month"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-200"
          />

          <!-- YTD: year lang -->
          <input
            v-else
            :value="(selectedDate || '').slice(0, 4)"
            @change="onYearChange"
            type="number"
            min="2020"
            max="2100"
            step="1"
            class="w-28 border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-200"
          />

        </div>

      </div>

      <!-- ERROR -->

      <div
        v-if="error"
        class="bg-red-100 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium"
      >
        {{ error }}
      </div>

      <!-- PERIOD SELECTOR -->

      <div
        class="bg-white border border-gray-200 rounded-2xl p-2 shadow-sm"
      >

        <div
          class="grid grid-cols-3 gap-2"
        >

          <button
            type="button"
            @click="
              selectPeriod('Daily')
            "
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
            @click="
              selectPeriod('MTD')
            "
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
            @click="
              selectPeriod('YTD')
            "
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

      <!-- LOADING -->

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

      <!-- ================================================= -->
      <!-- MTD: PER-DAY RECORDS TABLE -->
      <!-- ================================================= -->

      <template
        v-else-if="activePeriod === 'MTD'"
      >

        <div
          v-if="breakdownError"
          class="bg-red-100 text-red-700 border border-red-200 rounded-xl p-4 text-sm font-medium"
        >
          {{ breakdownError }}
        </div>

        <div
          :class="[
            'bg-white border border-gray-200 shadow-sm',
            isTableFullscreen
              ? 'fixed inset-0 z-[120] rounded-none flex flex-col overflow-hidden'
              : 'rounded-2xl overflow-hidden'
          ]"
        >

          <div
            class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0"
          >
            <div>
              <h2 class="font-black text-gray-800">
                Month-to-Date Records
              </h2>
              <p class="text-xs text-gray-500 mt-0.5">
                Araw-araw na breakdown para sa buwan ng
                {{ dailyBreakdown.month || (selectedDate || '').slice(0, 7) }}
              </p>
            </div>

            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-500 whitespace-nowrap">
                {{ dailyBreakdown.rows.length }} araw
              </span>

              <button
                type="button"
                @click="toggleCollapse('mtd-records')"
                class="px-3 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-sm font-bold text-gray-700"
              >{{ isCollapsed('mtd-records') ? 'Show' : 'Hide' }}</button>

              <button
                v-if="!isCollapsed('mtd-records')"
                type="button"
                @click="toggleTableFullscreen"
                :title="isTableFullscreen ? 'Normal view' : 'Fullscreen view'"
                :aria-label="isTableFullscreen ? 'Normal view' : 'Fullscreen view'"
                class="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all text-lg leading-none"
              >
                {{ isTableFullscreen ? '🗗' : '⛶' }}
              </button>
            </div>
          </div>

          <template v-if="!isCollapsed('mtd-records')">
          <div
            v-if="breakdownLoading"
            class="py-12 text-center text-gray-500 font-semibold"
          >
            Loading records...
          </div>

          <div
            v-else-if="dailyBreakdown.rows.length === 0"
            class="py-12 text-center text-gray-500 font-medium"
          >
            Walang records para sa buwang ito.
          </div>

          <div
            v-else
            :class="[
              isTableFullscreen
                ? 'flex-1 overflow-auto'
                : 'overflow-x-auto'
            ]"
          >
            <table class="w-full text-xs whitespace-nowrap">

              <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0 z-20">
                <tr>
                  <th class="text-left px-3 py-2 font-bold sticky left-0 bg-gray-50 z-30">Date</th>
                  <th class="text-left px-3 py-2 font-bold">Day</th>
                  <th class="text-right px-3 py-2 font-bold">Sales</th>
                  <th class="text-right px-3 py-2 font-bold">Total Expenses</th>
                  <th class="text-right px-3 py-2 font-bold">Profit</th>
                  <th class="text-right px-3 py-2 font-bold">Ingredients</th>
                  <th class="text-right px-3 py-2 font-bold">Material</th>
                  <th class="text-right px-3 py-2 font-bold">Maintenance</th>
                  <th class="text-right px-3 py-2 font-bold">Miscellaneous</th>
                  <th class="text-right px-3 py-2 font-bold">Labor</th>
                  <th class="text-right px-3 py-2 font-bold">Bills</th>
                  <th class="text-right px-3 py-2 font-bold">Order Qty</th>
                  <th class="text-right px-3 py-2 font-bold">Dine-in (ct)</th>
                  <th class="text-right px-3 py-2 font-bold">Take-out (ct)</th>
                  <th class="text-right px-3 py-2 font-bold">Delivery (ct)</th>
                  <th class="text-right px-3 py-2 font-bold">Dine-in (sales)</th>
                  <th class="text-right px-3 py-2 font-bold">Take-out (sales)</th>
                  <th class="text-right px-3 py-2 font-bold">Delivery (sales)</th>
                  <th class="text-right px-3 py-2 font-bold">Refund/Discount</th>
                  <th class="text-right px-3 py-2 font-bold">+/- Balance</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in dailyBreakdown.rows"
                  :key="row.date"
                  class="border-b border-gray-100 hover:bg-blue-50/40"
                >
                  <td class="text-left px-3 py-2 font-bold text-gray-800 sticky left-0 bg-white z-10">
                    {{ shortDate(row.date) }}
                  </td>
                  <td class="text-left px-3 py-2 text-gray-500">{{ dayName(row.date) }}</td>
                  <td class="text-right px-3 py-2 font-bold text-green-700">{{ formatAmount(row.sales) }}</td>
                  <td class="text-right px-3 py-2 text-gray-700">{{ formatAmount(row.totalExpenses) }}</td>
                  <td
                    class="text-right px-3 py-2 font-black"
                    :class="row.profit >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatAmount(row.profit) }}
                  </td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.ingredients) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.materials) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.maintenance) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.miscellaneous) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.labor) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.bills) }}</td>
                  <td class="text-right px-3 py-2 font-bold text-gray-800">{{ row.orderQty }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ row.dineInCount }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ row.takeOutCount }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ row.deliveryCount }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.dineInSales) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.takeOutSales) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.deliverySales) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.refundDiscount) }}</td>
                  <td class="text-right px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      :value="row.balance"
                      @change="
                        saveDailyBalance(
                          row,
                          $event.target.value
                        )
                      "
                      :class="[
                        'w-24 text-right px-2 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500',
                        Number(row.balance) < 0
                          ? 'border-red-300 text-red-600 font-bold'
                          : Number(row.balance) > 0
                            ? 'border-green-300 text-green-700 font-bold'
                            : 'border-gray-200 text-gray-500'
                      ]"
                      placeholder="0.00"
                    />
                  </td>
                </tr>
              </tbody>

              <tfoot
                v-if="dailyBreakdown.totals"
                class="border-t-2 border-gray-300 bg-gray-50 font-black text-gray-800"
              >
                <tr>
                  <td class="text-left px-3 py-2 sticky left-0 bg-gray-50 z-10">TOTAL</td>
                  <td class="px-3 py-2"></td>
                  <td class="text-right px-3 py-2 text-green-700">{{ formatAmount(dailyBreakdown.totals.sales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.totalExpenses) }}</td>
                  <td
                    class="text-right px-3 py-2"
                    :class="dailyBreakdown.totals.profit >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatAmount(dailyBreakdown.totals.profit) }}
                  </td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.ingredients) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.materials) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.maintenance) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.miscellaneous) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.labor) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.bills) }}</td>
                  <td class="text-right px-3 py-2">{{ dailyBreakdown.totals.orderQty }}</td>
                  <td class="text-right px-3 py-2">{{ dailyBreakdown.totals.dineInCount }}</td>
                  <td class="text-right px-3 py-2">{{ dailyBreakdown.totals.takeOutCount }}</td>
                  <td class="text-right px-3 py-2">{{ dailyBreakdown.totals.deliveryCount }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.dineInSales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.takeOutSales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.deliverySales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyBreakdown.totals.refundDiscount) }}</td>
                  <td
                    class="text-right px-3 py-2"
                    :class="(dailyBreakdown.totals.balance || 0) < 0 ? 'text-red-600' : 'text-green-700'"
                  >
                    {{ formatAmount(dailyBreakdown.totals.balance) }}
                  </td>
                </tr>

                <!-- DAILY AVERAGE (closed days / 0 sales excluded) -->
                <tr class="border-t border-gray-200 bg-blue-50/60 text-gray-700 font-bold">
                  <td class="text-left px-3 py-2 sticky left-0 bg-blue-50 z-10">
                    DAILY AVG
                  </td>
                  <td class="text-left px-3 py-2 text-[10px] text-gray-500 font-semibold whitespace-normal">
                    {{ dailyAverage.openDayCount }} open day(s)
                  </td>
                  <td class="text-right px-3 py-2 text-green-700">{{ formatAmount(dailyAverage.sales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.totalExpenses) }}</td>
                  <td
                    class="text-right px-3 py-2"
                    :class="dailyAverage.profit >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatAmount(dailyAverage.profit) }}
                  </td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.ingredients) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.materials) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.maintenance) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.miscellaneous) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.labor) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.bills) }}</td>
                  <td class="text-right px-3 py-2">{{ fmtAvgCount(dailyAverage.orderQty) }}</td>
                  <td class="text-right px-3 py-2">{{ fmtAvgCount(dailyAverage.dineInCount) }}</td>
                  <td class="text-right px-3 py-2">{{ fmtAvgCount(dailyAverage.takeOutCount) }}</td>
                  <td class="text-right px-3 py-2">{{ fmtAvgCount(dailyAverage.deliveryCount) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.dineInSales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.takeOutSales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.deliverySales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.refundDiscount) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(dailyAverage.balance) }}</td>
                </tr>
              </tfoot>

            </table>
          </div>
          </template>

        </div>

        <!-- ================================================= -->
        <!-- TOP 20 BEST SELLING -->
        <!-- ================================================= -->

        <div
          :class="[
            'bg-white border border-gray-200 shadow-sm',
            isFs('mtd-top') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
          ]"
        >
          <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 class="font-black text-gray-800">Best Selling</h2>
              <p class="text-xs text-gray-500 mt-0.5">Lahat ng may benta para sa buwan</p>
            </div>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-gray-400 font-semibold mr-1">Sort by:</span>
              <button
                type="button"
                @click="topSort = 'sales'"
                :class="[
                  'px-3 py-1.5 rounded-lg font-bold',
                  topSort === 'sales' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                ]"
              >Sales</button>
              <button
                type="button"
                @click="topSort = 'qty'"
                :class="[
                  'px-3 py-1.5 rounded-lg font-bold',
                  topSort === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                ]"
              >Qty</button>
              <button
                type="button"
                @click="toggleCollapse('mtd-top')"
                class="ml-1 px-2.5 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700"
              >{{ isCollapsed('mtd-top') ? 'Show' : 'Hide' }}</button>
              <button
                v-if="!isCollapsed('mtd-top')"
                type="button"
                @click="toggleFullscreen('mtd-top')"
                :title="isFs('mtd-top') ? 'Normal view' : 'Fullscreen'"
                class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-base"
              >{{ isFs('mtd-top') ? '🗗' : '⛶' }}</button>
            </div>
          </div>

          <template v-if="!isCollapsed('mtd-top')">
          <div v-if="topMenus.length === 0" class="py-8 text-center text-gray-500 text-sm">
            Walang data.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th class="text-left px-4 py-2 font-bold w-12">#</th>
                  <th class="text-left px-4 py-2 font-bold">Item</th>
                  <th class="text-right px-4 py-2 font-bold">Qty Sold</th>
                  <th class="text-right px-4 py-2 font-bold">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(m, i) in topMenus"
                  :key="`top-${m.menuId || m.name}`"
                  class="border-b border-gray-100"
                >
                  <td class="px-4 py-2 font-bold text-gray-400">{{ i + 1 }}</td>
                  <td class="px-4 py-2 font-bold text-gray-800">{{ m.name }}</td>
                  <td class="px-4 py-2 text-right text-gray-700">{{ m.qty }}</td>
                  <td class="px-4 py-2 text-right font-black text-green-700">{{ formatAmount(m.sales) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          </template>
        </div>

        <!-- ================================================= -->
        <!-- BOTTOM 20 LEAST / NOT SELLING -->
        <!-- ================================================= -->

        <div
          :class="[
            'bg-white border border-gray-200 shadow-sm',
            isFs('mtd-bottom') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
          ]"
        >
          <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 class="font-black text-gray-800">Top 20 Least / Not Selling</h2>
              <p class="text-xs text-gray-500 mt-0.5">Pinakakaunti ang benta (kasama ang hindi nabenta)</p>
            </div>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-gray-400 font-semibold mr-1">Sort by:</span>
              <button
                type="button"
                @click="bottomSort = 'sales'"
                :class="[
                  'px-3 py-1.5 rounded-lg font-bold',
                  bottomSort === 'sales' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                ]"
              >Sales</button>
              <button
                type="button"
                @click="bottomSort = 'qty'"
                :class="[
                  'px-3 py-1.5 rounded-lg font-bold',
                  bottomSort === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                ]"
              >Qty</button>
              <button
                type="button"
                @click="toggleCollapse('mtd-bottom')"
                class="ml-1 px-2.5 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700"
              >{{ isCollapsed('mtd-bottom') ? 'Show' : 'Hide' }}</button>
              <button
                v-if="!isCollapsed('mtd-bottom')"
                type="button"
                @click="toggleFullscreen('mtd-bottom')"
                :title="isFs('mtd-bottom') ? 'Normal view' : 'Fullscreen'"
                class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-base"
              >{{ isFs('mtd-bottom') ? '🗗' : '⛶' }}</button>
            </div>
          </div>

          <template v-if="!isCollapsed('mtd-bottom')">
          <div v-if="bottomMenus.length === 0" class="py-8 text-center text-gray-500 text-sm">
            Walang data.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th class="text-left px-4 py-2 font-bold w-12">#</th>
                  <th class="text-left px-4 py-2 font-bold">Item</th>
                  <th class="text-right px-4 py-2 font-bold">Qty Sold</th>
                  <th class="text-right px-4 py-2 font-bold">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(m, i) in bottomMenus"
                  :key="`bottom-${m.menuId || m.name}`"
                  class="border-b border-gray-100"
                >
                  <td class="px-4 py-2 font-bold text-gray-400">{{ i + 1 }}</td>
                  <td class="px-4 py-2 font-bold text-gray-800">{{ m.name }}</td>
                  <td class="px-4 py-2 text-right text-gray-700">{{ m.qty }}</td>
                  <td class="px-4 py-2 text-right font-black text-gray-700">{{ formatAmount(m.sales) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          </template>
        </div>

        <!-- ================================================= -->
        <!-- MTD EXPENSES BREAKDOWN BY CATEGORY -->
        <!-- ================================================= -->

        <div
          :class="[
            'bg-white border border-gray-200 shadow-sm',
            isFs('mtd-exp') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
          ]"
        >
          <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 class="font-black text-gray-800">Expenses Breakdown</h2>
              <p class="text-xs text-gray-500 mt-0.5">Per category para sa buwan (i-click ang category para sa detalye)</p>
            </div>
            <div class="flex items-center gap-1 text-xs">
              <template v-if="!isCollapsed('mtd-exp')">
                <span class="text-gray-400 font-semibold mr-1">Sort items:</span>
                <button type="button" @click="mtdExpSort = 'cost'" :class="['px-3 py-1.5 rounded-lg font-bold', mtdExpSort === 'cost' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Cost</button>
                <button type="button" @click="mtdExpSort = 'qty'" :class="['px-3 py-1.5 rounded-lg font-bold', mtdExpSort === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Qty</button>
              </template>
              <button
                type="button"
                @click="toggleCollapse('mtd-exp')"
                class="ml-1 px-2.5 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700"
              >{{ isCollapsed('mtd-exp') ? 'Show' : 'Hide' }}</button>
              <button
                v-if="!isCollapsed('mtd-exp')"
                type="button"
                @click="toggleFullscreen('mtd-exp')"
                :title="isFs('mtd-exp') ? 'Normal view' : 'Fullscreen'"
                class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-base"
              >{{ isFs('mtd-exp') ? '🗗' : '⛶' }}</button>
            </div>
          </div>

          <template v-if="!isCollapsed('mtd-exp')">
            <div v-if="mtdExpenseGroups.length === 0" class="py-8 text-center text-gray-500 text-sm">
              Walang expenses para sa buwan.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th class="text-left px-4 py-2 font-bold">Category / Item</th>
                    <th class="text-right px-4 py-2 font-bold">Qty</th>
                    <th class="text-right px-4 py-2 font-bold">Cost (Total)</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="g in mtdExpenseGroups" :key="`mexp-${g.category}`">
                    <tr
                      class="bg-gray-50 border-t border-gray-200 cursor-pointer hover:bg-gray-100"
                      @click="toggleExpCat('mtd-exp', g.category)"
                    >
                      <td class="px-4 py-2 font-black text-gray-800">
                        <span class="inline-block w-4 text-gray-500">{{ isExpCatOpen('mtd-exp', g.category) ? '▾' : '▸' }}</span>
                        {{ g.label }}
                        <span class="text-xs font-semibold text-gray-400">({{ g.items.length }})</span>
                      </td>
                      <td class="px-4 py-2 text-right font-black text-gray-800">{{ g.qtyTotal }}</td>
                      <td class="px-4 py-2 text-right font-black text-gray-800">{{ formatAmount(g.subtotal) }}</td>
                    </tr>
                    <template
                      v-for="(it, i) in (isExpCatOpen('mtd-exp', g.category) ? g.items : [])"
                      :key="`mexp-${g.category}-${i}`"
                    >
                      <tr
                        class="border-b border-gray-100 cursor-pointer hover:bg-blue-50/40"
                        @click="toggleExpItem('mtd-exp', g.category, it.name)"
                      >
                        <td class="pl-10 pr-4 py-1.5 text-gray-600">
                          <span class="inline-block w-3 text-[10px] text-gray-400">{{ isExpItemOpen('mtd-exp', g.category, it.name) ? '▾' : '▸' }}</span>
                          {{ it.name }}
                        </td>
                        <td class="px-4 py-1.5 text-right text-gray-700">{{ it.qty }}</td>
                        <td class="px-4 py-1.5 text-right text-gray-700">{{ formatAmount(it.amount) }}</td>
                      </tr>
                      <tr v-if="isExpItemOpen('mtd-exp', g.category, it.name)" class="bg-blue-50/30 border-b border-gray-100">
                        <td colspan="3" class="px-4 py-2">
                          <p class="pl-12 text-[11px] font-black text-gray-500 uppercase tracking-wide mb-1">History — per date na binili</p>
                          <table class="w-full text-xs">
                            <thead>
                              <tr class="text-gray-400">
                                <th class="text-left pl-12 pr-4 py-1 font-semibold">Date</th>
                                <th class="text-right px-4 py-1 font-semibold">Qty</th>
                                <th class="text-right px-4 py-1 font-semibold">Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="(h, hi) in expenseItemHistory(g.category, it.name)"
                                :key="`mhist-${g.category}-${i}-${hi}`"
                                class="border-t border-gray-100"
                              >
                                <td class="text-left pl-12 pr-4 py-1 text-gray-600">
                                  {{ shortDate(h.date) }}
                                  <span class="text-gray-400">({{ dayName(h.date) }})</span>
                                </td>
                                <td class="text-right px-4 py-1 text-gray-600">
                                  {{ h.qty }}<span v-if="h.unit" class="text-gray-400"> {{ h.unit }}</span>
                                </td>
                                <td class="text-right px-4 py-1 text-gray-600">{{ formatAmount(h.amount) }}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="border-t border-gray-200 font-bold text-gray-700">
                                <td class="text-left pl-12 pr-4 py-1">Total</td>
                                <td class="text-right px-4 py-1">{{ it.qty }}</td>
                                <td class="text-right px-4 py-1">{{ formatAmount(it.amount) }}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </td>
                      </tr>
                    </template>
                  </template>
                </tbody>
                <tfoot class="border-t-2 border-gray-300 bg-gray-50">
                  <tr>
                    <td class="px-4 py-2 font-black text-gray-800">GRAND TOTAL</td>
                    <td class="px-4 py-2 text-right font-black text-gray-800">{{ mtdExpenseGrandQty }}</td>
                    <td class="px-4 py-2 text-right font-black text-gray-800">{{ formatAmount(mtdExpenseGrand) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </template>
        </div>

      </template>

      <!-- ================================================= -->
      <!-- DAILY: SUMMARY (tugma sa MTD total fields) -->
      <!-- ================================================= -->

      <template
        v-else-if="activePeriod === 'Daily'"
      >

        <div
          v-if="breakdownError"
          class="bg-red-100 text-red-700 border border-red-200 rounded-xl p-4 text-sm font-medium"
        >
          {{ breakdownError }}
        </div>

        <div
          v-if="breakdownLoading"
          class="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 font-semibold"
        >
          Loading...
        </div>

        <template v-else>

          <!-- Period info -->
          <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p class="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Daily Report
            </p>
            <p class="text-lg font-black text-gray-800 mt-1">
              {{ formatDateOnly(selectedDate) }}
              <span class="text-sm font-semibold text-gray-500">
                ({{ dayName(selectedDate) }})
              </span>
            </p>
          </div>

          <!-- Headline: Sales / Expenses / Profit -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wide">Sales</p>
              <p class="text-2xl font-black text-green-600 mt-2">
                {{ formatAmount(dailyRow ? dailyRow.sales : 0) }}
              </p>
            </div>
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Expenses</p>
              <p class="text-2xl font-black text-gray-800 mt-2">
                {{ formatAmount(dailyRow ? dailyRow.totalExpenses : 0) }}
              </p>
            </div>
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wide">Profit</p>
              <p
                class="text-2xl font-black mt-2"
                :class="(dailyRow ? dailyRow.profit : 0) >= 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatAmount(dailyRow ? dailyRow.profit : 0) }}
              </p>
            </div>
          </div>

          <!-- +/- Balance (editable) -->
          <div
            v-if="dailyRow"
            class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4"
          >
            <div>
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wide">+/- Balance</p>
              <p class="text-xs text-gray-400 mt-1">
                Cash audit adjustment — (−) kulang, (+) sobra. Kasama sa Profit.
              </p>
            </div>
            <input
              type="number"
              step="0.01"
              :value="dailyRow.balance"
              @change="saveDailyBalance(dailyRow, $event.target.value)"
              :class="[
                'w-32 text-right px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 font-bold',
                Number(dailyRow.balance) < 0
                  ? 'border-red-300 text-red-600'
                  : Number(dailyRow.balance) > 0
                    ? 'border-green-300 text-green-700'
                    : 'border-gray-200 text-gray-600'
              ]"
              placeholder="0.00"
            />
          </div>

          <!-- Expense breakdown -->
          <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p class="text-sm font-black text-gray-700 mb-3">Expense Breakdown</p>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div v-for="e in [
                { label: 'Ingredients', key: 'ingredients' },
                { label: 'Material', key: 'materials' },
                { label: 'Maintenance', key: 'maintenance' },
                { label: 'Miscellaneous', key: 'miscellaneous' },
                { label: 'Labor', key: 'labor' },
                { label: 'Bills', key: 'bills' }
              ]" :key="e.key" class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">{{ e.label }}</p>
                <p class="text-lg font-black text-gray-800 mt-1">
                  {{ formatAmount(dailyRow ? dailyRow[e.key] : 0) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Orders -->
          <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p class="text-sm font-black text-gray-700 mb-3">Orders</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Order Qty</p>
                <p class="text-lg font-black text-gray-800 mt-1">{{ dailyRow ? dailyRow.orderQty : 0 }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Dine-in (ct)</p>
                <p class="text-lg font-black text-gray-800 mt-1">{{ dailyRow ? dailyRow.dineInCount : 0 }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Take-out (ct)</p>
                <p class="text-lg font-black text-gray-800 mt-1">{{ dailyRow ? dailyRow.takeOutCount : 0 }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Delivery (ct)</p>
                <p class="text-lg font-black text-gray-800 mt-1">{{ dailyRow ? dailyRow.deliveryCount : 0 }}</p>
              </div>
            </div>
          </div>

          <!-- Sales by type + Refund/Discount -->
          <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p class="text-sm font-black text-gray-700 mb-3">Sales by Type</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Dine-in</p>
                <p class="text-lg font-black text-gray-800 mt-1">{{ formatAmount(dailyRow ? dailyRow.dineInSales : 0) }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Take-out</p>
                <p class="text-lg font-black text-gray-800 mt-1">{{ formatAmount(dailyRow ? dailyRow.takeOutSales : 0) }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Delivery</p>
                <p class="text-lg font-black text-gray-800 mt-1">{{ formatAmount(dailyRow ? dailyRow.deliverySales : 0) }}</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Refund/Discount</p>
                <p class="text-lg font-black text-gray-800 mt-1">{{ formatAmount(dailyRow ? dailyRow.refundDiscount : 0) }}</p>
              </div>
            </div>
          </div>

          <!-- DAILY BEST SELLING -->
          <div
            :class="[
              'bg-white border border-gray-200 shadow-sm',
              isFs('daily-top') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
            ]"
          >
            <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 class="font-black text-gray-800">Best Selling (araw na ito)</h2>
                <p class="text-xs text-gray-500 mt-0.5">Lahat ng may benta sa {{ formatDateOnly(selectedDate) }}</p>
              </div>
              <div class="flex items-center gap-1 text-xs">
                <span class="text-gray-400 font-semibold mr-1">Sort by:</span>
                <button type="button" @click="dailyTopSort = 'sales'" :class="['px-3 py-1.5 rounded-lg font-bold', dailyTopSort === 'sales' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Sales</button>
                <button type="button" @click="dailyTopSort = 'qty'" :class="['px-3 py-1.5 rounded-lg font-bold', dailyTopSort === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Qty</button>
                <button type="button" @click="toggleCollapse('daily-top')" class="ml-1 px-2.5 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700">{{ isCollapsed('daily-top') ? 'Show' : 'Hide' }}</button>
                <button v-if="!isCollapsed('daily-top')" type="button" @click="toggleFullscreen('daily-top')" :title="isFs('daily-top') ? 'Normal view' : 'Fullscreen'" class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-base">{{ isFs('daily-top') ? '🗗' : '⛶' }}</button>
              </div>
            </div>
            <template v-if="!isCollapsed('daily-top')">
            <div v-if="dailyTopMenus.length === 0" class="py-8 text-center text-gray-500 text-sm">Walang data.</div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th class="text-left px-4 py-2 font-bold w-12">#</th>
                    <th class="text-left px-4 py-2 font-bold">Item</th>
                    <th class="text-right px-4 py-2 font-bold">Qty Sold</th>
                    <th class="text-right px-4 py-2 font-bold">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(m, i) in dailyTopMenus" :key="`dtop-${m.menuId || m.name}`" class="border-b border-gray-100">
                    <td class="px-4 py-2 font-bold text-gray-400">{{ i + 1 }}</td>
                    <td class="px-4 py-2 font-bold text-gray-800">{{ m.name }}</td>
                    <td class="px-4 py-2 text-right text-gray-700">{{ m.qty }}</td>
                    <td class="px-4 py-2 text-right font-black text-green-700">{{ formatAmount(m.sales) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            </template>
          </div>

          <!-- DAILY TOP 20 LEAST / NOT SELLING -->
          <div
            :class="[
              'bg-white border border-gray-200 shadow-sm',
              isFs('daily-bottom') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
            ]"
          >
            <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 class="font-black text-gray-800">Top 20 Least / Not Selling (araw na ito)</h2>
                <p class="text-xs text-gray-500 mt-0.5">Pinakakaunti/walang benta sa {{ formatDateOnly(selectedDate) }}</p>
              </div>
              <div class="flex items-center gap-1 text-xs">
                <span class="text-gray-400 font-semibold mr-1">Sort by:</span>
                <button type="button" @click="dailyBottomSort = 'sales'" :class="['px-3 py-1.5 rounded-lg font-bold', dailyBottomSort === 'sales' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Sales</button>
                <button type="button" @click="dailyBottomSort = 'qty'" :class="['px-3 py-1.5 rounded-lg font-bold', dailyBottomSort === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Qty</button>
                <button type="button" @click="toggleCollapse('daily-bottom')" class="ml-1 px-2.5 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700">{{ isCollapsed('daily-bottom') ? 'Show' : 'Hide' }}</button>
                <button v-if="!isCollapsed('daily-bottom')" type="button" @click="toggleFullscreen('daily-bottom')" :title="isFs('daily-bottom') ? 'Normal view' : 'Fullscreen'" class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-base">{{ isFs('daily-bottom') ? '🗗' : '⛶' }}</button>
              </div>
            </div>
            <template v-if="!isCollapsed('daily-bottom')">
            <div v-if="dailyBottomMenus.length === 0" class="py-8 text-center text-gray-500 text-sm">Walang data.</div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th class="text-left px-4 py-2 font-bold w-12">#</th>
                    <th class="text-left px-4 py-2 font-bold">Item</th>
                    <th class="text-right px-4 py-2 font-bold">Qty Sold</th>
                    <th class="text-right px-4 py-2 font-bold">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(m, i) in dailyBottomMenus" :key="`dbot-${m.menuId || m.name}`" class="border-b border-gray-100">
                    <td class="px-4 py-2 font-bold text-gray-400">{{ i + 1 }}</td>
                    <td class="px-4 py-2 font-bold text-gray-800">{{ m.name }}</td>
                    <td class="px-4 py-2 text-right text-gray-700">{{ m.qty }}</td>
                    <td class="px-4 py-2 text-right font-black text-gray-700">{{ formatAmount(m.sales) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            </template>
          </div>

          <!-- ================================================= -->
          <!-- DAILY EXPENSES BREAKDOWN BY CATEGORY -->
          <!-- ================================================= -->

          <div
            :class="[
              'bg-white border border-gray-200 shadow-sm',
              isFs('daily-exp') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
            ]"
          >
            <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 class="font-black text-gray-800">Expenses Breakdown</h2>
                <p class="text-xs text-gray-500 mt-0.5">Per category para sa araw na ito (i-click ang category para sa detalye)</p>
              </div>
              <div class="flex items-center gap-1 text-xs">
                <template v-if="!isCollapsed('daily-exp')">
                  <span class="text-gray-400 font-semibold mr-1">Sort items:</span>
                  <button type="button" @click="dailyExpSort = 'cost'" :class="['px-3 py-1.5 rounded-lg font-bold', dailyExpSort === 'cost' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Cost</button>
                  <button type="button" @click="dailyExpSort = 'qty'" :class="['px-3 py-1.5 rounded-lg font-bold', dailyExpSort === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Qty</button>
                </template>
                <button
                  type="button"
                  @click="toggleCollapse('daily-exp')"
                  class="ml-1 px-2.5 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700"
                >{{ isCollapsed('daily-exp') ? 'Show' : 'Hide' }}</button>
                <button
                  v-if="!isCollapsed('daily-exp')"
                  type="button"
                  @click="toggleFullscreen('daily-exp')"
                  :title="isFs('daily-exp') ? 'Normal view' : 'Fullscreen'"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-base"
                >{{ isFs('daily-exp') ? '🗗' : '⛶' }}</button>
              </div>
            </div>

            <template v-if="!isCollapsed('daily-exp')">
              <div v-if="dailyExpenseGroups.length === 0" class="py-8 text-center text-gray-500 text-sm">
                Walang expenses sa araw na ito.
              </div>
              <div v-else class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <tr>
                      <th class="text-left px-4 py-2 font-bold">Category / Item</th>
                      <th class="text-right px-4 py-2 font-bold">Qty</th>
                      <th class="text-right px-4 py-2 font-bold">Cost (Total)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="g in dailyExpenseGroups" :key="`dexp-${g.category}`">
                      <tr
                        class="bg-gray-50 border-t border-gray-200 cursor-pointer hover:bg-gray-100"
                        @click="toggleExpCat('daily-exp', g.category)"
                      >
                        <td class="px-4 py-2 font-black text-gray-800">
                          <span class="inline-block w-4 text-gray-500">{{ isExpCatOpen('daily-exp', g.category) ? '▾' : '▸' }}</span>
                          {{ g.label }}
                          <span class="text-xs font-semibold text-gray-400">({{ g.items.length }})</span>
                        </td>
                        <td class="px-4 py-2 text-right font-black text-gray-800">{{ g.qtyTotal }}</td>
                        <td class="px-4 py-2 text-right font-black text-gray-800">{{ formatAmount(g.subtotal) }}</td>
                      </tr>
                      <tr
                        v-for="(it, i) in (isExpCatOpen('daily-exp', g.category) ? g.items : [])"
                        :key="`dexp-${g.category}-${i}`"
                        class="border-b border-gray-100"
                      >
                        <td class="pl-10 pr-4 py-1.5 text-gray-600">{{ it.name }}</td>
                        <td class="px-4 py-1.5 text-right text-gray-700">{{ it.qty }}</td>
                        <td class="px-4 py-1.5 text-right text-gray-700">{{ formatAmount(it.amount) }}</td>
                      </tr>
                    </template>
                  </tbody>
                  <tfoot class="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td class="px-4 py-2 font-black text-gray-800">GRAND TOTAL</td>
                      <td class="px-4 py-2 text-right font-black text-gray-800">{{ dailyExpenseGrandQty }}</td>
                      <td class="px-4 py-2 text-right font-black text-gray-800">{{ formatAmount(dailyExpenseGrand) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </template>
          </div>

        </template>

      </template>

      <template
        v-else-if="activePeriod === 'YTD'"
      >

        <div
          v-if="yearBreakdownError"
          class="bg-red-100 text-red-700 border border-red-200 rounded-xl p-4 text-sm font-medium"
        >
          {{ yearBreakdownError }}
        </div>

        <!-- ================================================= -->
        <!-- YTD: PER-MONTH RECORDS TABLE -->
        <!-- ================================================= -->

        <div
          :class="[
            'bg-white border border-gray-200 shadow-sm',
            isFs('ytd-records') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
          ]"
        >
          <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-gray-800">Year-to-Date Records</h2>
              <p class="text-xs text-gray-500 mt-0.5">
                Buwan-buwan na breakdown para sa taong
                {{ yearBreakdown.year || (selectedDate || '').slice(0, 4) }}
              </p>
            </div>

            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-500 whitespace-nowrap">
                {{ yearBreakdown.rows.length }} buwan
              </span>

              <button
                type="button"
                @click="toggleCollapse('ytd-records')"
                class="px-3 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-sm font-bold text-gray-700"
              >{{ isCollapsed('ytd-records') ? 'Show' : 'Hide' }}</button>

              <button
                v-if="!isCollapsed('ytd-records')"
                type="button"
                @click="toggleFullscreen('ytd-records')"
                :title="isFs('ytd-records') ? 'Normal view' : 'Fullscreen view'"
                class="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all text-lg leading-none"
              >{{ isFs('ytd-records') ? '🗗' : '⛶' }}</button>
            </div>
          </div>

          <template v-if="!isCollapsed('ytd-records')">
          <div
            v-if="yearBreakdownLoading"
            class="py-12 text-center text-gray-500 font-semibold"
          >
            Loading records...
          </div>

          <div
            v-else-if="yearBreakdown.rows.length === 0"
            class="py-12 text-center text-gray-500 font-medium"
          >
            Walang records para sa taong ito.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs whitespace-nowrap">

              <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0 z-20">
                <tr>
                  <th class="text-left px-3 py-2 font-bold sticky left-0 bg-gray-50 z-30">Month</th>
                  <th class="text-right px-3 py-2 font-bold">Sales</th>
                  <th class="text-right px-3 py-2 font-bold">Total Expenses</th>
                  <th class="text-right px-3 py-2 font-bold">Profit</th>
                  <th class="text-right px-3 py-2 font-bold">Ingredients</th>
                  <th class="text-right px-3 py-2 font-bold">Material</th>
                  <th class="text-right px-3 py-2 font-bold">Maintenance</th>
                  <th class="text-right px-3 py-2 font-bold">Miscellaneous</th>
                  <th class="text-right px-3 py-2 font-bold">Labor</th>
                  <th class="text-right px-3 py-2 font-bold">Bills</th>
                  <th class="text-right px-3 py-2 font-bold">Order Qty</th>
                  <th class="text-right px-3 py-2 font-bold">Dine-in (ct)</th>
                  <th class="text-right px-3 py-2 font-bold">Take-out (ct)</th>
                  <th class="text-right px-3 py-2 font-bold">Delivery (ct)</th>
                  <th class="text-right px-3 py-2 font-bold">Dine-in (sales)</th>
                  <th class="text-right px-3 py-2 font-bold">Take-out (sales)</th>
                  <th class="text-right px-3 py-2 font-bold">Delivery (sales)</th>
                  <th class="text-right px-3 py-2 font-bold">Refund/Discount</th>
                  <th class="text-right px-3 py-2 font-bold">+/- Balance</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in yearBreakdown.rows"
                  :key="row.date"
                  class="border-b border-gray-100 hover:bg-blue-50/40"
                >
                  <td class="text-left px-3 py-2 font-bold text-gray-800 sticky left-0 bg-white z-10">
                    {{ monthLabel(row.date) }}
                  </td>
                  <td class="text-right px-3 py-2 font-bold text-green-700">{{ formatAmount(row.sales) }}</td>
                  <td class="text-right px-3 py-2 text-gray-700">{{ formatAmount(row.totalExpenses) }}</td>
                  <td
                    class="text-right px-3 py-2 font-black"
                    :class="row.profit >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatAmount(row.profit) }}
                  </td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.ingredients) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.materials) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.maintenance) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.miscellaneous) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.labor) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.bills) }}</td>
                  <td class="text-right px-3 py-2 font-bold text-gray-800">{{ row.orderQty }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ row.dineInCount }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ row.takeOutCount }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ row.deliveryCount }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.dineInSales) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.takeOutSales) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.deliverySales) }}</td>
                  <td class="text-right px-3 py-2 text-gray-600">{{ formatAmount(row.refundDiscount) }}</td>
                  <td
                    class="text-right px-3 py-2 font-bold"
                    :class="Number(row.balance) < 0 ? 'text-red-600' : Number(row.balance) > 0 ? 'text-green-700' : 'text-gray-400'"
                  >
                    {{ formatAmount(row.balance) }}
                  </td>
                </tr>
              </tbody>

              <tfoot
                v-if="yearBreakdown.totals"
                class="border-t-2 border-gray-300 bg-gray-50 font-black text-gray-800"
              >
                <tr>
                  <td class="text-left px-3 py-2 sticky left-0 bg-gray-50 z-10">TOTAL</td>
                  <td class="text-right px-3 py-2 text-green-700">{{ formatAmount(yearBreakdown.totals.sales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.totalExpenses) }}</td>
                  <td
                    class="text-right px-3 py-2"
                    :class="yearBreakdown.totals.profit >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatAmount(yearBreakdown.totals.profit) }}
                  </td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.ingredients) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.materials) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.maintenance) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.miscellaneous) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.labor) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.bills) }}</td>
                  <td class="text-right px-3 py-2">{{ yearBreakdown.totals.orderQty }}</td>
                  <td class="text-right px-3 py-2">{{ yearBreakdown.totals.dineInCount }}</td>
                  <td class="text-right px-3 py-2">{{ yearBreakdown.totals.takeOutCount }}</td>
                  <td class="text-right px-3 py-2">{{ yearBreakdown.totals.deliveryCount }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.dineInSales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.takeOutSales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.deliverySales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(yearBreakdown.totals.refundDiscount) }}</td>
                  <td
                    class="text-right px-3 py-2"
                    :class="(yearBreakdown.totals.balance || 0) < 0 ? 'text-red-600' : 'text-green-700'"
                  >
                    {{ formatAmount(yearBreakdown.totals.balance) }}
                  </td>
                </tr>

                <!-- MONTHLY AVERAGE (closed months / 0 sales excluded) -->
                <tr class="border-t border-gray-200 bg-blue-50/60 text-gray-700 font-bold">
                  <td class="text-left px-3 py-2 sticky left-0 bg-blue-50 z-10">
                    MONTHLY AVG
                    <span class="text-[10px] text-gray-500 font-semibold">({{ monthlyAverage.openMonthCount }} open)</span>
                  </td>
                  <td class="text-right px-3 py-2 text-green-700">{{ formatAmount(monthlyAverage.sales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.totalExpenses) }}</td>
                  <td
                    class="text-right px-3 py-2"
                    :class="monthlyAverage.profit >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatAmount(monthlyAverage.profit) }}
                  </td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.ingredients) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.materials) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.maintenance) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.miscellaneous) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.labor) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.bills) }}</td>
                  <td class="text-right px-3 py-2">{{ fmtAvgCount(monthlyAverage.orderQty) }}</td>
                  <td class="text-right px-3 py-2">{{ fmtAvgCount(monthlyAverage.dineInCount) }}</td>
                  <td class="text-right px-3 py-2">{{ fmtAvgCount(monthlyAverage.takeOutCount) }}</td>
                  <td class="text-right px-3 py-2">{{ fmtAvgCount(monthlyAverage.deliveryCount) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.dineInSales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.takeOutSales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.deliverySales) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.refundDiscount) }}</td>
                  <td class="text-right px-3 py-2">{{ formatAmount(monthlyAverage.balance) }}</td>
                </tr>
              </tfoot>

            </table>
          </div>

          <p v-if="!isCollapsed('ytd-records')" class="px-4 md:px-5 py-2 text-[11px] text-gray-400 border-t border-gray-100">
            Ang +/- Balance ay kabuuan ng per-araw na cash audit sa loob ng buwan (read-only dito; i-edit sa MTD/Daily).
          </p>
          </template>
        </div>

        <!-- ================================================= -->
        <!-- YTD OVERALL SALES RECORD (lahat ng items) -->
        <!-- ================================================= -->

        <div
          :class="[
            'bg-white border border-gray-200 shadow-sm',
            isFs('ytd-overall') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
          ]"
        >
          <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 class="font-black text-gray-800">Overall Sales Record</h2>
              <p class="text-xs text-gray-500 mt-0.5">Lahat ng items para sa {{ yearBreakdown.year }} — i-click ang item para sa buwanang sales performance</p>
            </div>
            <div class="flex items-center gap-1 text-xs">
              <template v-if="!isCollapsed('ytd-overall')">
                <span class="text-gray-400 font-semibold mr-1">Sort by:</span>
                <button type="button" @click="yearOverallSort = 'sales'" :class="['px-3 py-1.5 rounded-lg font-bold', yearOverallSort === 'sales' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Sales</button>
                <button type="button" @click="yearOverallSort = 'qty'" :class="['px-3 py-1.5 rounded-lg font-bold', yearOverallSort === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Qty</button>
              </template>
              <button type="button" @click="toggleCollapse('ytd-overall')" class="ml-1 px-2.5 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700">{{ isCollapsed('ytd-overall') ? 'Show' : 'Hide' }}</button>
              <button v-if="!isCollapsed('ytd-overall')" type="button" @click="toggleFullscreen('ytd-overall')" :title="isFs('ytd-overall') ? 'Normal view' : 'Fullscreen'" class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-base">{{ isFs('ytd-overall') ? '🗗' : '⛶' }}</button>
            </div>
          </div>

          <template v-if="!isCollapsed('ytd-overall')">
          <div v-if="overallMenus.length === 0" class="py-8 text-center text-gray-500 text-sm">Walang menu items.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th class="text-left px-4 py-2 font-bold w-12">#</th>
                  <th class="text-left px-4 py-2 font-bold">Item</th>
                  <th class="text-right px-4 py-2 font-bold">Qty Sold</th>
                  <th class="text-right px-4 py-2 font-bold">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(m, i) in overallMenus" :key="`yov-${m.menuId || m.name}`">
                  <tr
                    class="border-b border-gray-100 cursor-pointer hover:bg-blue-50/40"
                    @click="toggleYearMenu(m)"
                  >
                    <td class="px-4 py-2 font-bold text-gray-400">{{ i + 1 }}</td>
                    <td class="px-4 py-2 font-bold text-gray-800">
                      <span class="inline-block w-3 text-[10px] text-gray-400">{{ isYearMenuOpen(m) ? '▾' : '▸' }}</span>
                      {{ m.name }}
                    </td>
                    <td class="px-4 py-2 text-right text-gray-700">{{ m.qty }}</td>
                    <td class="px-4 py-2 text-right font-black text-green-700">{{ formatAmount(m.sales) }}</td>
                  </tr>

                  <tr v-if="isYearMenuOpen(m)" class="bg-blue-50/30 border-b border-gray-100">
                    <td colspan="4" class="px-4 py-4">
                      <template v-for="series in [itemMonthlySeries(m)]" :key="'ser'">

                        <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
                          <p class="text-[11px] font-black text-gray-500 uppercase tracking-wide">
                            Buwanang Sales Performance — {{ m.name }}
                          </p>
                          <div class="flex items-center gap-1 text-xs">
                            <span class="text-gray-400 font-semibold mr-1">View:</span>
                            <button type="button" @click.stop="ytdSalesMetric = 'sales'" :class="['px-3 py-1 rounded-lg font-bold', ytdSalesMetric === 'sales' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Sales</button>
                            <button type="button" @click.stop="ytdSalesMetric = 'qty'" :class="['px-3 py-1 rounded-lg font-bold', ytdSalesMetric === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Qty</button>
                          </div>
                        </div>

                        <!-- HORIZONTAL BAR CHART -->
                        <template v-for="mx in [seriesMax(series, ytdSalesMetric === 'qty' ? 'qty' : 'sales')]" :key="'mx'">
                          <div v-if="mx > 0" class="mb-4 space-y-1">
                            <div
                              v-for="(pt, pi) in series"
                              :key="`bar-${pi}`"
                              class="flex items-center gap-2"
                            >
                              <span class="w-16 text-[10px] text-gray-500 text-right shrink-0">{{ monthShort(pt.month) }}</span>
                              <div class="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                                <div
                                  class="h-full rounded transition-all"
                                  :style="{
                                    width: barPct(ytdSalesMetric === 'qty' ? pt.qty : pt.sales, mx) + '%',
                                    backgroundColor: barColor(ytdSalesMetric === 'qty' ? pt.qty : pt.sales, series, ytdSalesMetric === 'qty' ? 'qty' : 'sales')
                                  }"
                                  :title="`${monthLabel(pt.month)}: ${formatAmount(pt.sales)} (${pt.qty} pcs)`"
                                ></div>
                              </div>
                              <span class="w-28 text-[10px] text-right shrink-0 leading-tight">
                                <span class="text-gray-700 font-semibold">{{ ytdSalesMetric === 'qty' ? pt.qty + ' pcs' : formatAmount(pt.sales) }}</span>
                                <span class="text-gray-400"> · {{ ytdSalesMetric === 'qty' ? formatAmount(pt.sales) : pt.qty + ' pcs' }}</span>
                              </span>
                            </div>
                            <div class="flex items-center gap-2 pt-1 mt-1 border-t border-gray-200 font-bold text-gray-700">
                              <span class="w-16 text-[10px] text-right shrink-0">TOTAL</span>
                              <span class="flex-1"></span>
                              <span class="w-28 text-[10px] text-right shrink-0 leading-tight">
                                <span>{{ ytdSalesMetric === 'qty' ? m.qty + ' pcs' : formatAmount(m.sales) }}</span>
                                <span class="text-gray-400 font-normal"> · {{ ytdSalesMetric === 'qty' ? formatAmount(m.sales) : m.qty + ' pcs' }}</span>
                              </span>
                            </div>
                          </div>
                          <p v-else class="text-xs text-gray-400 mb-1">Walang sales sa taong ito.</p>
                        </template>

                      </template>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          </template>
        </div>

        <!-- ================================================= -->
        <!-- YTD EXPENSES BREAKDOWN BY CATEGORY -->
        <!-- ================================================= -->

        <div
          :class="[
            'bg-white border border-gray-200 shadow-sm',
            isFs('ytd-exp') ? 'fixed inset-0 z-[120] rounded-none overflow-auto' : 'rounded-2xl overflow-hidden'
          ]"
        >
          <div class="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 class="font-black text-gray-800">Expenses Breakdown</h2>
              <p class="text-xs text-gray-500 mt-0.5">Per category para sa buong taon (i-click ang category para sa detalye)</p>
            </div>
            <div class="flex items-center gap-1 text-xs">
              <template v-if="!isCollapsed('ytd-exp')">
                <span class="text-gray-400 font-semibold mr-1">Sort items:</span>
                <button type="button" @click="yearExpSort = 'cost'" :class="['px-3 py-1.5 rounded-lg font-bold', yearExpSort === 'cost' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Cost</button>
                <button type="button" @click="yearExpSort = 'qty'" :class="['px-3 py-1.5 rounded-lg font-bold', yearExpSort === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Qty</button>
              </template>
              <button type="button" @click="toggleCollapse('ytd-exp')" class="ml-1 px-2.5 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-bold text-gray-700">{{ isCollapsed('ytd-exp') ? 'Show' : 'Hide' }}</button>
              <button v-if="!isCollapsed('ytd-exp')" type="button" @click="toggleFullscreen('ytd-exp')" :title="isFs('ytd-exp') ? 'Normal view' : 'Fullscreen'" class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-base">{{ isFs('ytd-exp') ? '🗗' : '⛶' }}</button>
            </div>
          </div>

          <template v-if="!isCollapsed('ytd-exp')">
            <div v-if="yearExpenseGroups.length === 0" class="py-8 text-center text-gray-500 text-sm">
              Walang expenses para sa taong ito.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th class="text-left px-4 py-2 font-bold">Category / Item</th>
                    <th class="text-right px-4 py-2 font-bold">Qty</th>
                    <th class="text-right px-4 py-2 font-bold">Cost (Total)</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="g in yearExpenseGroups" :key="`yexp-${g.category}`">
                    <tr
                      class="bg-gray-50 border-t border-gray-200 cursor-pointer hover:bg-gray-100"
                      @click="toggleExpCat('ytd-exp', g.category)"
                    >
                      <td class="px-4 py-2 font-black text-gray-800">
                        <span class="inline-block w-4 text-gray-500">{{ isExpCatOpen('ytd-exp', g.category) ? '▾' : '▸' }}</span>
                        {{ g.label }}
                        <span class="text-xs font-semibold text-gray-400">({{ g.items.length }})</span>
                      </td>
                      <td class="px-4 py-2 text-right font-black text-gray-800">{{ g.qtyTotal }}</td>
                      <td class="px-4 py-2 text-right font-black text-gray-800">{{ formatAmount(g.subtotal) }}</td>
                    </tr>
                    <template
                      v-for="(it, i) in (isExpCatOpen('ytd-exp', g.category) ? g.items : [])"
                      :key="`yexp-${g.category}-${i}`"
                    >
                      <tr
                        class="border-b border-gray-100 cursor-pointer hover:bg-blue-50/40"
                        @click="toggleExpItem('ytd-exp', g.category, it.name)"
                      >
                        <td class="pl-10 pr-4 py-1.5 text-gray-600">
                          <span class="inline-block w-3 text-[10px] text-gray-400">{{ isExpItemOpen('ytd-exp', g.category, it.name) ? '▾' : '▸' }}</span>
                          {{ it.name }}
                        </td>
                        <td class="px-4 py-1.5 text-right text-gray-700">{{ it.qty }}</td>
                        <td class="px-4 py-1.5 text-right text-gray-700">{{ formatAmount(it.amount) }}</td>
                      </tr>
                      <tr v-if="isExpItemOpen('ytd-exp', g.category, it.name)" class="bg-blue-50/30 border-b border-gray-100">
                        <td colspan="3" class="px-4 py-3">
                          <template v-for="series in [expenseItemMonthlySeries(g.category, it.name)]" :key="'eser'">

                            <div class="flex items-center justify-between gap-2 mb-3 flex-wrap pl-10">
                              <p class="text-[11px] font-black text-gray-500 uppercase tracking-wide">
                                Buwanang Gastos — {{ it.name }}
                              </p>
                              <div class="flex items-center gap-1 text-xs">
                                <span class="text-gray-400 font-semibold mr-1">View:</span>
                                <button type="button" @click.stop="ytdExpMetric = 'cost'" :class="['px-3 py-1 rounded-lg font-bold', ytdExpMetric === 'cost' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Cost</button>
                                <button type="button" @click.stop="ytdExpMetric = 'qty'" :class="['px-3 py-1 rounded-lg font-bold', ytdExpMetric === 'qty' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600']">Qty</button>
                              </div>
                            </div>

                            <!-- HORIZONTAL BAR CHART (monthly gastos) -->
                            <template v-for="mx in [seriesMax(series, ytdExpMetric === 'qty' ? 'qty' : 'amount')]" :key="'emx'">
                              <div v-if="mx > 0" class="mb-4 space-y-1 pl-10 pr-2">
                                <div
                                  v-for="(pt, pi) in series"
                                  :key="`ebar-${pi}`"
                                  class="flex items-center gap-2"
                                >
                                  <span class="w-16 text-[10px] text-gray-500 text-right shrink-0">{{ monthShort(pt.month) }}</span>
                                  <div class="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                                    <div
                                      class="h-full rounded transition-all"
                                      :style="{
                                        width: barPct(ytdExpMetric === 'qty' ? pt.qty : pt.amount, mx) + '%',
                                        backgroundColor: barColor(ytdExpMetric === 'qty' ? pt.qty : pt.amount, series, ytdExpMetric === 'qty' ? 'qty' : 'amount')
                                      }"
                                      :title="`${monthLabel(pt.month)}: ${formatAmount(pt.amount)} (qty ${pt.qty})`"
                                    ></div>
                                  </div>
                                  <span class="w-28 text-[10px] text-right shrink-0 leading-tight">
                                    <span class="text-gray-700 font-semibold">{{ ytdExpMetric === 'qty' ? pt.qty : formatAmount(pt.amount) }}</span>
                                    <span class="text-gray-400"> · {{ ytdExpMetric === 'qty' ? formatAmount(pt.amount) : 'qty ' + pt.qty }}</span>
                                  </span>
                                </div>
                                <div class="flex items-center gap-2 pt-1 mt-1 border-t border-gray-200 font-bold text-gray-700">
                                  <span class="w-16 text-[10px] text-right shrink-0">TOTAL</span>
                                  <span class="flex-1"></span>
                                  <span class="w-28 text-[10px] text-right shrink-0 leading-tight">
                                    <span>{{ ytdExpMetric === 'qty' ? it.qty : formatAmount(it.amount) }}</span>
                                    <span class="text-gray-400 font-normal"> · {{ ytdExpMetric === 'qty' ? formatAmount(it.amount) : 'qty ' + it.qty }}</span>
                                  </span>
                                </div>
                              </div>
                              <p v-else class="text-xs text-gray-400 mb-1 pl-10">Walang gastos sa taong ito.</p>
                            </template>

                          </template>
                        </td>
                      </tr>
                    </template>
                  </template>
                </tbody>
                <tfoot class="border-t-2 border-gray-300 bg-gray-50">
                  <tr>
                    <td class="px-4 py-2 font-black text-gray-800">GRAND TOTAL</td>
                    <td class="px-4 py-2 text-right font-black text-gray-800">{{ yearExpenseGrandQty }}</td>
                    <td class="px-4 py-2 text-right font-black text-gray-800">{{ formatAmount(yearExpenseGrand) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </template>
        </div>

      </template>

      <!-- NO REPORT -->

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

      <!-- ================================================= -->
      <!-- IMPORT HISTORICAL MODAL -->
      <!-- ================================================= -->

      <div
        v-if="isImportModalOpen"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"
        @click.self="closeImportModal"
      >
        <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

          <div class="bg-indigo-600 text-white px-5 py-4 shrink-0">
            <div class="text-lg font-bold">📥 Import Historical Data</div>
            <div class="text-sm text-indigo-100 mt-1">
              Mag-upload ng lumang monthly Excel (RDR template). Babasahin ang Summary + daily sheets.
            </div>
          </div>

          <div class="p-5 space-y-4 overflow-y-auto">

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Excel file (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                @change="onImportFileChange"
                class="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p v-if="importFileName" class="text-xs text-gray-500 mt-1">{{ importFileName }}</p>
            </div>

            <p class="text-[11px] text-gray-400 leading-relaxed">
              Per-araw na per-item sales at expenses ang ii-import. Ang mga petsang may live POS data na ay awtomatikong ili-laktaw (iwas-doble). Puwedeng i-upload ulit ang parehong buwan — papalitan lang nito ang dati.
            </p>

            <div v-if="importError" class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
              {{ importError }}
            </div>

            <div v-if="importResult" class="bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-3 text-sm space-y-1">
              <p class="font-bold">{{ importResult.message }}</p>
              <p class="text-xs">Buwan: {{ (importResult.months || []).join(', ') }}</p>
              <p class="text-xs">Saklaw: {{ importResult.dateRange?.from }} → {{ importResult.dateRange?.to }}</p>
              <p class="text-xs">Item-sales rows: {{ importResult.itemSalesRows }} · Expense rows: {{ importResult.expenseRows }}</p>
              <p v-if="importResult.skippedCount" class="text-xs text-amber-700">
                Na-skip ({{ importResult.skippedCount }}): {{ (importResult.skipped || []).join(', ') }}
              </p>
            </div>
          </div>

          <div class="flex gap-2 p-5 pt-0 shrink-0">
            <button
              type="button"
              @click="closeImportModal"
              :disabled="importing"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors disabled:opacity-50"
            >
              Isara
            </button>
            <button
              type="button"
              @click="submitImport"
              :disabled="importing || !importFile"
              class="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {{ importing ? 'Importing...' : 'Import' }}
            </button>
          </div>

        </div>
      </div>

    </template>

  </div>
</template>