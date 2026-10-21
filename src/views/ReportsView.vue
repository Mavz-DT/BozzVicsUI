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

const breakdownLoading = ref(false)
const breakdownError = ref('')

// Sort order ng Top/Bottom menu tables: 'sales' (default) o 'qty'.
const topSort = ref('sales')
const bottomSort = ref('sales')

// Daily (per-araw) menu table sort.
const dailyTopSort = ref('sales')
const dailyBottomSort = ref('sales')

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
        v-else-if="activeReport"
      >

        <!-- PERIOD INFO -->

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
                {{
                  formatDateOnly(
                    activeReport.start
                  )
                }}
                —
                {{
                  formatReportEndDate(
                    activeReport.end
                  )
                }}
              </p>

            </div>

          </div>

        </div>

        <!-- TOP SUMMARY -->

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
              {{
                formatAmount(
                  estimatedProfit
                )
              }}
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

        <!-- ======================================================== -->
        <!-- CASH AUDIT SNAPSHOT -->
        <!-- ======================================================== -->

        <section class="space-y-4">

          <div
            class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2"
          >

            <div>

              <h2
                class="text-xl font-black text-gray-800"
              >
                Cash Audit Snapshot
              </h2>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Physical cash and GCash position for the selected date.
              </p>

            </div>

            <div
              class="text-sm text-gray-500"
            >
              Selected Date:
              <span
                class="font-black text-gray-700"
              >
                {{
                  cashAudit.date ||
                  selectedDate
                }}
              </span>
            </div>

          </div>

          <!-- CASH AUDIT ERROR -->

          <div
            v-if="cashAuditError"
            class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium"
          >
            {{ cashAuditError }}
          </div>

          <!-- CASH AUDIT LOADING -->

          <div
            v-if="cashAuditLoading"
            class="bg-white border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-500 shadow-sm"
          >
            Loading cash audit snapshot...
          </div>

          <div
            v-else
            class="space-y-4"
          >

            <!-- SUMMARY CARDS -->

            <div
              class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >

              <!-- OPENING -->

              <div
                class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
              >

                <p
                  class="text-xs font-bold text-gray-500 uppercase tracking-wide"
                >
                  Opening Cash
                </p>

                <p
                  class="text-2xl md:text-3xl font-black text-gray-800 mt-2"
                >
                  {{
                    formatAmount(
                      cashAudit.openingCash
                    )
                  }}
                </p>

                <p
                  class="text-xs text-gray-400 mt-1"
                >
                  Initial cash in the drawer.
                </p>

              </div>

              <!-- CASH SALES -->

              <div
                class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
              >

                <p
                  class="text-xs font-bold text-gray-500 uppercase tracking-wide"
                >
                  Cash Sales
                </p>

                <p
                  class="text-2xl md:text-3xl font-black text-emerald-600 mt-2"
                >
                  {{
                    formatAmount(
                      cashAudit.cashSales
                    )
                  }}
                </p>

                <p
                  class="text-xs text-gray-400 mt-1"
                >
                  Actual cash received from sales.
                </p>

              </div>

              <!-- STORE EXPENSES -->

              <div
                class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
              >

                <p
                  class="text-xs font-bold text-gray-500 uppercase tracking-wide"
                >
                  Store-paid Expenses
                </p>

                <p
                  class="text-2xl md:text-3xl font-black text-red-600 mt-2"
                >
                  {{
                    formatAmount(
                      cashAudit.storeExpenses
                    )
                  }}
                </p>

                <p
                  class="text-xs text-gray-400 mt-1"
                >
                  Deducted from physical cash.
                </p>

              </div>

              <!-- OTHER CASH OUT -->

              <div
                class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
              >

                <p
                  class="text-xs font-bold text-gray-500 uppercase tracking-wide"
                >
                  Other Cash Out
                </p>

                <p
                  class="text-2xl md:text-3xl font-black text-red-600 mt-2"
                >
                  {{
                    formatAmount(
                      cashAudit.otherCashOut
                    )
                  }}
                </p>

                <p
                  class="text-xs text-gray-400 mt-1"
                >
                  Other physical cash released.
                </p>

              </div>

              <!-- EXPECTED CASH -->

              <div
                class="rounded-2xl p-5 shadow-sm border-2"
                :style="{
                  borderColor:
                    settingsStore.themeColor
                }"
              >

                <p
                  class="text-xs font-bold text-gray-500 uppercase tracking-wide"
                >
                  Expected Cash in Drawer
                </p>

                <p
                  class="text-2xl md:text-3xl font-black text-gray-900 mt-2"
                >
                  {{
                    formatAmount(
                      cashAudit.expectedCash
                    )
                  }}
                </p>

                <p
                  class="text-xs text-gray-500 mt-1"
                >
                  Expected physical cash after movements.
                </p>

              </div>

              <!-- GCASH -->

              <div
                class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
              >

                <p
                  class="text-xs font-bold text-gray-500 uppercase tracking-wide"
                >
                  GCash Received
                </p>

                <p
                  class="text-2xl md:text-3xl font-black mt-2"
                  :style="{
                    color:
                      settingsStore.themeColor
                  }"
                >
                  {{
                    formatAmount(
                      cashAudit.gcashReceived
                    )
                  }}
                </p>

                <p
                  class="text-xs text-gray-400 mt-1"
                >
                  Separate from physical cash drawer.
                </p>

              </div>

            </div>

            <!-- CASH FORMULA -->

            <div
              class="bg-gray-50 border border-gray-200 rounded-2xl p-5"
            >

              <p
                class="text-xs font-black uppercase tracking-wide text-gray-500"
              >
                Expected Cash Calculation
              </p>

              <div
                class="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-3"
              >

                <div
                  class="rounded-xl bg-white border border-gray-200 p-4"
                >

                  <p
                    class="text-xs text-gray-400"
                  >
                    Opening
                  </p>

                  <p
                    class="font-black text-gray-800 mt-1"
                  >
                    {{
                      formatAmount(
                        cashAudit.openingCash
                      )
                    }}
                  </p>

                </div>

                <div
                  class="rounded-xl bg-white border border-gray-200 p-4"
                >

                  <p
                    class="text-xs text-gray-400"
                  >
                    + Cash In
                  </p>

                  <p
                    class="font-black text-emerald-600 mt-1"
                  >
                    {{
                      formatAmount(
                        cashAudit.cashSales +
                        cashAudit.otherCashIn
                      )
                    }}
                  </p>

                </div>

                <div
                  class="rounded-xl bg-white border border-gray-200 p-4"
                >

                  <p
                    class="text-xs text-gray-400"
                  >
                    - Store Expenses
                  </p>

                  <p
                    class="font-black text-red-600 mt-1"
                  >
                    {{
                      formatAmount(
                        cashAudit.storeExpenses
                      )
                    }}
                  </p>

                </div>

                <div
                  class="rounded-xl bg-white border border-gray-200 p-4"
                >

                  <p
                    class="text-xs text-gray-400"
                  >
                    - Other Cash Out
                  </p>

                  <p
                    class="font-black text-red-600 mt-1"
                  >
                    {{
                      formatAmount(
                        cashAudit.otherCashOut
                      )
                    }}
                  </p>

                </div>

                <div
                  class="rounded-xl border-2 p-4"
                  :style="{
                    borderColor:
                      settingsStore.themeColor
                  }"
                >

                  <p
                    class="text-xs text-gray-500"
                  >
                    = Expected
                  </p>

                  <p
                    class="font-black text-gray-900 mt-1"
                  >
                    {{
                      formatAmount(
                        cashAudit.expectedCash
                      )
                    }}
                  </p>

                </div>

              </div>

            </div>

            <!-- SNAPSHOT NOTE -->

            <div
              class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"
            >

              <p
                class="text-xs text-blue-700 leading-relaxed"
              >
                Cash Audit Snapshot ay para lamang sa selected date. Kahit MTD o YTD ang report period, hindi ito cumulative cash balance. Para sa actual daily cash audit, gamitin ang Cash Ledger bilang detailed source.
              </p>

            </div>

          </div>

        </section>

        <!-- SALES SUMMARY -->

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
                  {{
                    formatAmount(
                      grossSales
                    )
                  }}
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
                  -{{
                    formatAmount(
                      discounts
                    )
                  }}
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
                  +{{
                    formatAmount(
                      deliveryFees
                    )
                  }}
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
                  {{
                    formatAmount(
                      totalSales
                    )
                  }}
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
                  {{
                    formatAmount(
                      cashSales
                    )
                  }}
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
                  {{
                    formatAmount(
                      gcashSales
                    )
                  }}
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
                  -{{
                    formatAmount(
                      refunds
                    )
                  }}
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
                  {{
                    formatAmount(
                      adjustments
                    )
                  }}
                </span>

              </div>

            </div>

          </div>

        </section>

        <!-- ORDER TYPE SALES -->

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
                  {{
                    sales.dineInCount ||
                    0
                  }}
                </span>

              </div>

              <p
                class="text-2xl font-black text-purple-600 mt-3"
              >
                {{
                  formatAmount(
                    dineInSales
                  )
                }}
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
                  {{
                    sales.takeOutCount ||
                    0
                  }}
                </span>

              </div>

              <p
                class="text-2xl font-black text-orange-600 mt-3"
              >
                {{
                  formatAmount(
                    takeOutSales
                  )
                }}
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
                  {{
                    sales.deliveryCount ||
                    0
                  }}
                </span>

              </div>

              <p
                class="text-2xl font-black text-blue-600 mt-3"
              >
                {{
                  formatAmount(
                    deliverySales
                  )
                }}
              </p>

            </div>

          </div>

        </section>

        <!-- EXPENSE BREAKDOWN -->

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
                  {{
                    formatAmount(
                      ingredientsExpense
                    )
                  }}
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
                  {{
                    formatAmount(
                      materialsExpense
                    )
                  }}
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
                  {{
                    formatAmount(
                      maintenanceExpense
                    )
                  }}
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
                  {{
                    formatAmount(
                      billsExpense
                    )
                  }}
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
                  {{
                    formatAmount(
                      miscellaneousExpense
                    )
                  }}
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
                  {{
                    formatAmount(
                      laborExpense
                    )
                  }}
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
                {{
                  formatAmount(
                    totalExpenses
                  )
                }}
              </span>

            </div>

          </div>

        </section>

        <!-- BILL BREAKDOWN -->

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
                {{
                  formatAmount(
                    directBillExpense
                  )
                }}
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
                {{
                  formatAmount(
                    recurringBillExpense
                  )
                }}
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
                {{
                  formatAmount(
                    selectedDateBillAllocation
                  )
                }}
              </p>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                Recurring bill allocation for {{ selectedDate }}.
              </p>

            </div>

          </div>

        </section>

        <!-- LABOR BREAKDOWN -->

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
                {{
                  formatAmount(
                    regularLaborExpense
                  )
                }}
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
                {{
                  formatAmount(
                    thirteenthMonthExpense
                  )
                }}
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
                {{
                  formatAmount(
                    laborBenefitsExpense
                  )
                }}
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
                {{
                  formatAmount(
                    estimatedDailyRegularLabor
                  )
                }}
              </p>

              <p
                class="text-xs text-gray-500 mt-1"
              >
                Source:
                {{ regularEstimateSource }}
              </p>

            </div>

          </div>

        </section>

        <!-- SELECTED DATE LABOR ALLOCATION -->

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
                  {{
                    formatAmount(
                      selectedDateRegularLabor
                    )
                  }}
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
                  {{
                    formatAmount(
                      selectedDate13thMonth
                    )
                  }}
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
                  {{
                    formatAmount(
                      selectedDateLaborBenefits
                    )
                  }}
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

        <!-- AVERAGES -->

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
                {{
                  formatAmount(
                    averageSales
                  )
                }}
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
                {{
                  formatAmount(
                    averageExpenses
                  )
                }}
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
                {{
                  formatAmount(
                    averageProfit
                  )
                }}
              </p>

            </div>

          </div>

        </section>

        <!-- PROFIT SUMMARY -->

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
                  {{
                    formatAmount(
                      estimatedProfit
                    )
                  }}
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

    </template>

  </div>
</template>