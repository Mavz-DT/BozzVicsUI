<script setup>
import {
  ref,
  onMounted,
  computed,
  watch
} from 'vue'

import { useExpenseStore } from '../stores/expense'
import { useAuthStore } from '../stores/auth'

const expenseStore = useExpenseStore()
const authStore = useAuthStore()

// =====================================================
// API
// =====================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API = `${API_BASE_URL}/api`

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

// =====================================================
// API HELPERS
// =====================================================

const extractArray = data => {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.expenses)) {
    return data.expenses
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

const parseApiResponse = async res => {
  const text = await res.text()

  if (!text) {
    if (!res.ok) {
      throw new Error(
        `Request failed with status ${res.status}.`
      )
    }

    return null
  }

  let data = null

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      'Hindi valid JSON ang response ng server. I-check ang API URL at backend.'
    )
  }

  if (!res.ok) {
    throw new Error(
      data?.message ||
      `Request failed with status ${res.status}.`
    )
  }

  return data
}

const fetchJson = async (
  url,
  options = {}
) => {
  const res = await fetch(
    url,
    options
  )

  return parseApiResponse(res)
}

// =====================================================
// DATE
// =====================================================

const getTodayPH = () => {
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

const todayPH = getTodayPH()

const selectedDate = ref(
  todayPH
)

const selectedLaborMonth = ref(
  todayPH.slice(0, 7)
)

const selectedBillMonth = ref(
  todayPH.slice(0, 7)
)

const laborMonthLoading =
  ref(false)

const laborMonthExpenses =
  ref([])

const billMonthLoading =
  ref(false)

const billMonthExpenses =
  ref([])

const dailyExpenses =
  ref([])

// =====================================================
// AUTH / ROLE
// =====================================================

const isAdmin =
  computed(() => {
    return (
      authStore.user?.role ===
      'Admin'
    )
  })

const isCashier =
  computed(() => {
    return (
      authStore.user?.role ===
      'Cashier'
    )
  })

// =====================================================
// EXPENSE TABS
// =====================================================

const expenseSections = [
  {
    key: 'Ingredient',
    label: 'Expenses',
    icon: '💼'
  },
  {
    key: 'Labor',
    label: 'Labor Cost',
    icon: '👷'
  },
  {
    key: 'Bill',
    label: 'Bills',
    icon: '🧾'
  }
]

const activeSection =
  ref('Ingredient')

const searchExpense =
  ref('')

// Category sub-filter para sa Expenses tab (All / Ingredient / Material).
// IMPORTANTE: dapat may default na 'All' — kung undefined ito, mabi-break
// ang expenses list (walang lalabas) at magpapakita ng "undefined records".
const inventoryCategoryFilter =
  ref('All')

// =====================================================
// CATEGORY OPTIONS
// =====================================================

const operatingCategoryOptions = [
  'Ingredient',
  'Material',
  'Maintenance',
  'Miscellaneous'
]

const adminCategoryOptions = [
  'Ingredient',
  'Material',
  'Maintenance',
  'Miscellaneous',
  'Bill',
  'Labor'
]

const cashierCategoryOptions = [
  {
    value: 'Ingredient',
    label: 'Ingredient'
  },
  {
    value: 'Material',
    label: 'Material'
  },
  {
    value: 'Maintenance',
    label: 'Maintenance'
  },
  {
    value: 'Miscellaneous',
    label: 'Miscellaneous'
  },
  {
    value: 'Bill',
    label: 'Bill'
  },
  {
    // Category = Labor Cost. Ang "Ulam" ay item name (auto-set kapag
    // pinili ito), HINDI category. Walang category na "Ulam".
    value: 'Labor',
    label: 'Labor Cost'
  }
]

const inventoryCategoryOptions = [
  'All',
  'Ingredient',
  'Material'
]

const CASHIER_ALLOWED_BILLS = [
  'Electricity Bill',
  'Pest Control',
  'Water Bill',
  'WiFi Bill'
]

const getCategoryOptions =
  computed(() => {
    if (
      isCashier.value
    ) {
      return cashierCategoryOptions
    }

    return adminCategoryOptions.map(
      category => ({
        value: category,
        label: category
      })
    )
  })

const normalizeExpenseName =
  name => {
    return String(
      name || ''
    )
      .trim()
      .toLowerCase()
  }

const isInventoryCategory =
  category => {
    return (
      category === 'Ingredient' ||
      category === 'Material'
    )
  }

const isOperatingCategory =
  category => {
    return operatingCategoryOptions.includes(
      category
    )
  }

const isCashierAllowedBill =
  name => {
    const normalizedName =
      normalizeExpenseName(
        name
      )

    return CASHIER_ALLOWED_BILLS.some(
      bill =>
        normalizeExpenseName(
          bill
        ) === normalizedName
    )
  }

const isUlamLabor =
  (
    name,
    laborType
  ) => {
    const normalizedName =
      normalizeExpenseName(
        name
      )

    const normalizedLaborType =
      normalizeExpenseName(
        laborType
      )

    return (
      normalizedName ===
        'ulam' ||
      normalizedName ===
        'ulam / meal subsidy' ||
      normalizedLaborType ===
        'ulam' ||
      normalizedLaborType ===
        'meal subsidy'
    )
  }

const isCashierAllowedRecord =
  expense => {
    if (!expense) {
      return false
    }

    if (
      isOperatingCategory(
        expense.category
      )
    ) {
      return true
    }

    if (
      expense.category ===
      'Bill'
    ) {
      return isCashierAllowedBill(
        expense.name
      )
    }

    if (
      expense.category ===
      'Labor'
    ) {
      return isUlamLabor(
        expense.name,
        expense.laborType
      )
    }

    return false
  }

const getCategoryLabel =
  expense => {
    // Walang "Ulam" na category. Ang Ulam ay item name na may
    // category na Labor Cost. Lahat ng Labor ay "Labor Cost".
    if (
      expense?.category ===
      'Labor'
    ) {
      return 'Labor Cost'
    }

    return (
      expense?.category ||
      '—'
    )
  }

// =====================================================
// FORM
// =====================================================

const form = ref({
  item: '',
  expenseItemId: null,

  price: '',
  qty: 1,
  unit: 'pcs',

  category: '',

  frequency: 'One-Time',

  periodMonth:
    todayPH.slice(0, 7),

  payrollPeriodStart: '',
  payrollPeriodEnd: '',

  expenseDate:
    todayPH,

  remarks: '',

  dueDate: '',
  paymentStatus: 'Paid',
  paidDate: '',

  paymentSource:
    'Store',

  maintenanceType: '',
  billType: '',

  laborType: 'Regular',
  laborAmountStatus: 'Actual',

  payday: ''
})

const submitting =
  ref(false)

const isEditMode =
  ref(false)

const editingExpenseId =
  ref(null)

const error =
  ref('')

const success =
  ref('')

// =====================================================
// BILL PAYMENT MODAL
// =====================================================

const isBillPaymentModalOpen =
  ref(false)

const selectedBillForPayment =
  ref(null)

const billPaymentSource =
  ref('Store')

const billPaymentSubmitting =
  ref(false)

// =====================================================
// MASTER EXPENSE ITEMS
// =====================================================

const masterExpenseItems =
  ref([])

const masterLoading =
  ref(false)

// =====================================================
// FALLBACK INVENTORY ITEMS
// =====================================================

const inventoryFallbackItems = [
  {
    name: 'Atsuete',
    category: 'Ingredient'
  },
  {
    name: 'Asukal',
    category: 'Ingredient'
  },
  {
    name: 'Bawang',
    category: 'Ingredient'
  },
  {
    name: 'Beef Cubes',
    category: 'Ingredient'
  },
  {
    name: 'Beef Balat',
    category: 'Ingredient'
  },
  {
    name: 'Beef Lamang Loob',
    category: 'Ingredient'
  },
  {
    name: 'Beef Balat + Lamang Loob',
    category: 'Ingredient'
  },
  {
    name: 'Beef Powder',
    category: 'Ingredient'
  },
  {
    name: 'Bihon',
    category: 'Ingredient'
  },
  {
    name: 'Buns',
    category: 'Ingredient'
  },
  {
    name: 'Calamansi',
    category: 'Ingredient'
  },
  {
    name: 'Canton',
    category: 'Ingredient'
  },
  {
    name: 'Carrot',
    category: 'Ingredient'
  },
  {
    name: 'Cassava Starch',
    category: 'Ingredient'
  },
  {
    name: 'Chami Sauce',
    category: 'Ingredient'
  },
  {
    name: 'Chicharon',
    category: 'Ingredient'
  },
  {
    name: 'Chicken Cubes',
    category: 'Ingredient'
  },
  {
    name: 'Cooking Oil',
    category: 'Ingredient'
  },
  {
    name: 'Corn Starch',
    category: 'Ingredient'
  },
  {
    name: 'Egg',
    category: 'Ingredient'
  },
  {
    name: 'Ginisa Mix',
    category: 'Ingredient'
  },
  {
    name: 'Kikiam',
    category: 'Ingredient'
  },
  {
    name: 'Liver',
    category: 'Ingredient'
  },
  {
    name: 'Luya',
    category: 'Ingredient'
  },
  {
    name: 'Magic Sarap',
    category: 'Ingredient'
  },
  {
    name: 'Miki',
    category: 'Ingredient'
  },
  {
    name: 'Oyster Sauce',
    category: 'Ingredient'
  },
  {
    name: 'Paminta',
    category: 'Ingredient'
  },
  {
    name: 'Patis',
    category: 'Ingredient'
  },
  {
    name: 'Pork',
    category: 'Ingredient'
  },
  {
    name: 'Pork Liempo',
    category: 'Ingredient'
  },
  {
    name: 'Pork Cubes',
    category: 'Ingredient'
  },
  {
    name: 'Repolyo',
    category: 'Ingredient'
  },
  {
    name: 'Rice',
    category: 'Ingredient'
  },
  {
    name: 'Salt',
    category: 'Ingredient'
  },
  {
    name: 'Sibuyas',
    category: 'Ingredient'
  },
  {
    name: 'Sili',
    category: 'Ingredient'
  },
  {
    name: 'Siling haba',
    category: 'Ingredient'
  },
  {
    name: 'Siomai',
    category: 'Ingredient'
  },
  {
    name: 'Star Anise',
    category: 'Ingredient'
  },
  {
    name: 'Suka',
    category: 'Ingredient'
  },
  {
    name: 'Toyo',
    category: 'Ingredient'
  },
  {
    name: 'Bilao',
    category: 'Material'
  },
  {
    name: 'Dishwashing Liquid',
    category: 'Material'
  },
  {
    name: 'Garbage Bag',
    category: 'Material'
  },
  {
    name: 'Gas Tank',
    category: 'Material'
  },
  {
    name: 'Gasoline',
    category: 'Material'
  },
  {
    name: 'Ice',
    category: 'Material'
  },
  {
    name: 'Ice Plastic',
    category: 'Material'
  },
  {
    name: 'Mineral Water',
    category: 'Material'
  },
  {
    name: 'Paper Bowl',
    category: 'Material'
  },
  {
    name: 'Paper Bags',
    category: 'Material'
  },
  {
    name: 'Plastic Bag',
    category: 'Material'
  },
  {
    name: 'Rags',
    category: 'Material'
  },
  {
    name: 'Scouring Pad',
    category: 'Material'
  },
  {
    name: 'Tissue',
    category: 'Material'
  },
  {
    name: 'straw',
    category: 'Material'
  },
  {
    name: 'steel wool',
    category: 'Material'
  }
]

// =====================================================
// MASTER ITEM HELPERS
// =====================================================

const getMasterItemKey =
  item => {
    return `${String(
      item?.category || ''
    ).trim().toLowerCase()}|${String(
      item?.name || ''
    ).trim().toLowerCase()}`
  }

const mergeMasterItems =
  (
    existingItems,
    newItems
  ) => {
    const map = new Map()

    for (
      const item of
        existingItems || []
    ) {
      if (
        item?.name &&
        item?.category
      ) {
        map.set(
          getMasterItemKey(item),
          item
        )
      }
    }

    for (
      const item of
        newItems || []
    ) {
      if (
        item?.name &&
        item?.category
      ) {
        const key =
          getMasterItemKey(item)

        const existing =
          map.get(key)

        if (
          existing?.source ===
            'fallback' &&
          item?.source !==
            'fallback'
        ) {
          map.set(
            key,
            item
          )
        } else if (
          !existing
        ) {
          map.set(
            key,
            item
          )
        }
      }
    }

    return Array.from(
      map.values()
    )
  }

// =====================================================
// FETCH MASTER EXPENSE ITEMS
// =====================================================

const fetchMasterExpenseItems =
  async () => {
    masterLoading.value =
      true

    try {
      const data =
        await fetchJson(
          `${API}/expenses/search`,
          {
            headers: {
              ...getAuthHeaders()
            }
          }
        )

      const rawItems =
        extractArray(data)

      const apiItems =
        rawItems.filter(
          item =>
            item?.isActive !== false
        )

      const fallbackItems =
        inventoryFallbackItems.map(
          item => ({
            _id: null,
            name: item.name,
            category: item.category,
            frequency: 'One-Time',
            estimateMethod: 'Fixed',
            laborType: '',
            defaultAmount: 0,
            source: 'fallback'
          })
        )

      masterExpenseItems.value =
        mergeMasterItems(
          fallbackItems,
          apiItems
        )

    } catch (err) {
      console.error(
        'Error fetching expense master items:',
        err
      )

      masterExpenseItems.value =
        inventoryFallbackItems.map(
          item => ({
            _id: null,
            name: item.name,
            category: item.category,
            frequency: 'One-Time',
            estimateMethod: 'Fixed',
            laborType: '',
            defaultAmount: 0,
            source: 'fallback'
          })
        )
    } finally {
      masterLoading.value =
        false
    }
  }

const selectedMasterItem =
  computed(() => {
    if (
      !form.value.expenseItemId
    ) {
      return null
    }

    return (
      masterExpenseItems.value.find(
        item =>
          String(
            item._id
          ) ===
          String(
            form.value.expenseItemId
          )
      ) || null
    )
  })

// =====================================================
// FORM CATEGORY STATE
// =====================================================

const isCategorySelected =
  computed(() => {
    return Boolean(
      form.value.category
    )
  })

const isExistingExpenseItem =
  computed(() => {
    return Boolean(
      form.value.expenseItemId
    )
  })

const isInventoryExpense =
  computed(() => {
    return isInventoryCategory(
      form.value.category
    )
  })

const isBillExpense =
  computed(() => {
    return (
      form.value.category ===
      'Bill'
    )
  })

const isLaborExpense =
  computed(() => {
    return (
      form.value.category ===
      'Labor'
    )
  })

const isUlamExpense =
  computed(() => {
    if (
      form.value.category !==
      'Labor'
    ) {
      return false
    }

    return isUlamLabor(
      form.value.item,
      form.value.laborType
    )
  })

const isAdminLabor =
  computed(() => {
    return (
      isLaborExpense.value &&
      !isUlamExpense.value
    )
  })

const isOperatingExpense =
  computed(() => {
    return (
      isOperatingCategory(
        form.value.category
      )
    )
  })

// =====================================================
// AUTOCOMPLETE
// =====================================================

const showItemSuggestions =
  ref(false)

const itemSuggestions =
  ref([])

const selectedExpenseItemName =
  ref('')

const selectedExpenseItemId =
  ref(null)

const expenseFrequencyOptions = [
  'Weekly',
  'Daily',
  'Monthly',
  'One-Time'
]

// =====================================================
// ITEM SEARCH
// =====================================================

const matchesItemQuery =
  (
    item,
    query
  ) => {
    const normalizedQuery =
      String(
        query || ''
      )
        .trim()
        .toLowerCase()

    if (!normalizedQuery) {
      return false
    }

    const normalizedName =
      String(
        item?.name || ''
      )
        .trim()
        .toLowerCase()

    if (!normalizedName) {
      return false
    }

    return normalizedName.includes(
      normalizedQuery
    )
  }

const getItemScore =
  (
    item,
    query
  ) => {
    const normalizedQuery =
      String(
        query || ''
      )
        .trim()
        .toLowerCase()

    const normalizedName =
      String(
        item?.name || ''
      )
        .trim()
        .toLowerCase()

    if (
      !normalizedQuery ||
      !normalizedName
    ) {
      return 0
    }

    if (
      normalizedName ===
      normalizedQuery
    ) {
      return 1000
    }

    if (
      normalizedName.startsWith(
        normalizedQuery
      )
    ) {
      return 900
    }

    const words =
      normalizedName.split(
        /\s+/
      )

    if (
      words.some(
        word =>
          word.startsWith(
            normalizedQuery
          )
      )
    ) {
      return 800
    }

    if (
      normalizedName.includes(
        normalizedQuery
      )
    ) {
      return 700
    }

    return 0
  }

const filterItemsForRole =
  items => {
    const records =
      Array.isArray(items)
        ? items
        : []

    if (
      isAdmin.value
    ) {
      return records.filter(
        item =>
          item?.isActive !== false
      )
    }

    return records.filter(
      item => {
        if (
          item?.isActive === false
        ) {
          return false
        }

        if (
          isOperatingCategory(
            item?.category
          )
        ) {
          return true
        }

        if (
          item?.category ===
          'Bill'
        ) {
          return isCashierAllowedBill(
            item?.name
          )
        }

        if (
          item?.category ===
          'Labor'
        ) {
          return isUlamLabor(
            item?.name,
            item?.laborType
          )
        }

        return false
      }
    )
  }

const searchExpenseItems =
  async () => {
    const query =
      form.value.item.trim()

    if (!query) {
      itemSuggestions.value =
        []

      showItemSuggestions.value =
        false

      return
    }

    let localItems =
      masterExpenseItems.value
        .filter(
          item =>
            matchesItemQuery(
              item,
              query
            )
        )

    localItems =
      filterItemsForRole(
        localItems
      )

    let apiItems = []

    try {
      const params =
        new URLSearchParams()

      params.append(
        'q',
        query
      )

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT:
      | Do not send category here.
      |
      | Item autocomplete is UNIVERSAL.
      | The selected existing item decides the category.
      |--------------------------------------------------------------------------
      */

      const data =
        await fetchJson(
          `${API}/expenses/search?${params.toString()}`,
          {
            headers: {
              ...getAuthHeaders()
            }
          }
        )

      apiItems =
        filterItemsForRole(
          extractArray(data)
        )

    } catch (err) {
      console.error(
        'API autocomplete search error:',
        err
      )
    }

    const mergedMap =
      new Map()

    for (
      const item of localItems
    ) {
      const key =
        getMasterItemKey(item)

      mergedMap.set(
        key,
        item
      )
    }

    for (
      const item of apiItems
    ) {
      const key =
        getMasterItemKey(item)

      mergedMap.set(
        key,
        {
          ...item,
          source:
            item.source ||
            'master'
        }
      )
    }

    let combinedItems =
      Array.from(
        mergedMap.values()
      )

    combinedItems =
      combinedItems
        .map(
          item => ({
            ...item,
            _autocompleteScore:
              getItemScore(
                item,
                query
              )
          })
        )
        .filter(
          item =>
            item._autocompleteScore >
            0
        )
        .sort(
          (
            a,
            b
          ) => {
            if (
              b._autocompleteScore !==
              a._autocompleteScore
            ) {
              return (
                b._autocompleteScore -
                a._autocompleteScore
              )
            }

            if (
              a.source !==
              b.source
            ) {
              return (
                a.source ===
                'master'
                  ? -1
                  : 1
              )
            }

            return String(
              a.name || ''
            ).localeCompare(
              String(
                b.name || ''
              )
            )
          }
        )
        .slice(
          0,
          10
        )
        .map(
          item => {
            const {
              _autocompleteScore,
              ...cleanItem
            } = item

            return cleanItem
          }
        )

    if (
      apiItems.length > 0
    ) {
      masterExpenseItems.value =
        mergeMasterItems(
          masterExpenseItems.value,
          apiItems.map(
            item => ({
              ...item,
              source:
                item.source ||
                'master'
            })
          )
        )
    }

    itemSuggestions.value =
      combinedItems

    showItemSuggestions.value =
      combinedItems.length >
      0
  }

// =====================================================
// ITEM INPUT
// =====================================================

const onItemInput =
  async () => {
    const currentName =
      form.value.item.trim()

    if (
      currentName !==
      selectedExpenseItemName.value
    ) {
      form.value.expenseItemId =
        null

      selectedExpenseItemId.value =
        null

      selectedExpenseItemName.value =
        ''

      /*
      |--------------------------------------------------------------------------
      | NEW ITEM:
      | Category becomes blank until user chooses one.
      |--------------------------------------------------------------------------
      */

      if (
        !isEditMode.value
      ) {
        if (
          isCashier.value
        ) {
          form.value.category =
            ''
        } else if (
          activeSection.value ===
          'Ingredient'
        ) {
          form.value.category =
            ''
        }
      }
    }

    await searchExpenseItems()
  }

// =====================================================
// SELECT EXISTING ITEM
// =====================================================

const selectExpenseItem =
  async item => {
    if (!item) {
      return
    }

    form.value.item =
      item.name || ''

    form.value.expenseItemId =
      item._id || null

    selectedExpenseItemId.value =
      item._id || null

    selectedExpenseItemName.value =
      item.name || ''

    /*
    |--------------------------------------------------------------------------
    | EXISTING ITEM:
    | Category is automatically loaded from master.
    |--------------------------------------------------------------------------
    */

    form.value.category =
      item.category || ''

    if (
      expenseFrequencyOptions.includes(
        item.frequency
      )
    ) {
      form.value.frequency =
        item.frequency
    } else {
      form.value.frequency =
        'One-Time'
    }

    /*
    |--------------------------------------------------------------------------
    | Do NOT autofill Ulam amount from default master amount.
    |
    | Ulam is now manual actual daily input.
    |--------------------------------------------------------------------------
    */

    if (
      item.category ===
        'Labor' &&
      isUlamLabor(
        item.name,
        item.laborType
      )
    ) {
      form.value.price =
        ''

      form.value.frequency =
        'One-Time'

      form.value.laborType =
        'Ulam'

      form.value.unit =
        'day'

      form.value.expenseDate =
        todayPH
    } else if (
      item.defaultAmount !==
        undefined &&
      item.defaultAmount !==
        null
    ) {
      form.value.price =
        Number(
          item.defaultAmount
        )
    }

    if (
      item.unit
    ) {
      form.value.unit =
        item.unit
    }

    if (
      item.category ===
      'Labor'
    ) {
      form.value.laborType =
        isUlamLabor(
          item.name,
          item.laborType
        )
          ? 'Ulam'
          : (
              item.laborType ||
              'Regular'
            )
    }

    /*
    |--------------------------------------------------------------------------
    | Update Admin tab based on selected item.
    |--------------------------------------------------------------------------
    */

    if (
      isAdmin.value
    ) {
      if (
        isOperatingCategory(
          item.category
        )
      ) {
        activeSection.value =
          'Ingredient'

        if (
          isInventoryCategory(
            item.category
          )
        ) {
          inventoryCategoryFilter.value =
            item.category
        }
      } else if (
        item.category ===
        'Bill'
      ) {
        activeSection.value =
          'Bill'
      } else if (
        item.category ===
        'Labor'
      ) {
        activeSection.value =
          'Labor'
      }
    }

    updatePeriodFromFrequency()

    showItemSuggestions.value =
      false

    if (
      item.category ===
      'Bill'
    ) {
      await prepareBillFromSelectedItem()
    }

    if (
      item.category ===
      'Labor'
    ) {
      await prepareLaborFromSelectedItem()
    }
  }

// =====================================================
// CLOSE SUGGESTIONS
// =====================================================

const closeItemSuggestions =
  () => {
    setTimeout(() => {
      showItemSuggestions.value =
        false
    }, 120)
  }

// =====================================================
// PREPARE BILL
// =====================================================

const prepareBillFromSelectedItem =
  async () => {
    if (
      form.value.category !==
      'Bill'
    ) {
      return
    }

    form.value.billType =
      form.value.item

    updatePeriodFromFrequency()

    if (
      isAdmin.value &&
      form.value.expenseItemId &&
      (
        form.value.frequency ===
          'Monthly' ||
        form.value.frequency ===
          'Weekly' ||
        form.value.frequency ===
          'Daily'
      )
    ) {
      await fetchBillEstimate()
    }
  }

// =====================================================
// BILL ESTIMATE
// =====================================================

const fetchBillEstimate =
  async () => {
    if (
      form.value.category !==
      'Bill'
    ) {
      return
    }

    if (
      !form.value.expenseItemId
    ) {
      return
    }

    if (
      isEditMode.value
    ) {
      return
    }

    if (
      !isAdmin.value
    ) {
      return
    }

    try {
      const params =
        new URLSearchParams()

      params.append(
        'expenseItemId',
        form.value.expenseItemId
      )

      let periodStart =
        ''

      if (
        form.value.frequency ===
          'Monthly' ||
        form.value.frequency ===
          'Daily'
      ) {
        periodStart =
          getMonthStartDate(
            form.value.periodMonth
          )
      }

      if (
        form.value.frequency ===
        'Weekly'
      ) {
        periodStart =
          form.value.payrollPeriodStart
      }

      if (
        periodStart
      ) {
        params.append(
          'periodStart',
          periodStart
        )
      }

      params.append(
        'month',
        form.value.periodMonth ||
          selectedBillMonth.value
      )

      const data =
        await fetchJson(
          `${API}/expenses/bill-estimate?${params.toString()}`,
          {
            headers: {
              ...getAuthHeaders()
            }
          }
        )

      if (
        data?.amount !==
        undefined
      ) {
        form.value.price =
          Number(
            data.amount || 0
          )
      }

    } catch (err) {
      console.error(
        'Error fetching bill estimate:',
        err
      )

      error.value =
        err.message ||
        'Failed to load bill estimate.'
    }
  }

// =====================================================
// BILL PAYMENT STATUS
// =====================================================

const changePaymentStatus =
  () => {
    if (
      form.value.paymentStatus ===
      'Due'
    ) {
      form.value.paidDate =
        ''

      form.value.paymentSource =
        ''

      return
    }

    if (
      !['Store', 'Owner'].includes(
        form.value.paymentSource
      )
    ) {
      form.value.paymentSource =
        'Store'
    }

    if (
      !form.value.paidDate
    ) {
      form.value.paidDate =
        todayPH
    }
  }

// =====================================================
// LABOR PREPARE
// =====================================================

const prepareLaborFromSelectedItem =
  async () => {
    if (
      form.value.category !==
      'Labor'
    ) {
      return
    }

    if (
      isUlamLabor(
        form.value.item,
        form.value.laborType
      )
    ) {
      form.value.laborType =
        'Ulam'

      form.value.frequency =
        'One-Time'

      form.value.price =
        ''

      form.value.unit =
        'day'

      form.value.expenseDate =
        todayPH

      return
    }

    form.value.laborType =
      form.value.laborType ||
      'Regular'

    updatePeriodFromFrequency()

    if (
      form.value.laborType ===
      '13thMonth'
    ) {
      await fetch13thMonthEstimate()
      return
    }

    const item =
      selectedMasterItem.value

    if (
      item &&
      item.defaultAmount !==
        undefined
    ) {
      form.value.price =
        Number(
          item.defaultAmount ||
          0
        )
    }
  }

// =====================================================
// 13TH MONTH ESTIMATE
// =====================================================

const fetch13thMonthEstimate =
  async () => {
    if (
      form.value.category !==
      'Labor'
    ) {
      return
    }

    if (
      form.value.laborType !==
      '13thMonth'
    ) {
      return
    }

    if (
      !form.value.expenseItemId
    ) {
      return
    }

    if (
      !isAdmin.value
    ) {
      return
    }

    form.value.frequency =
      'Monthly'

    if (
      !form.value.periodMonth
    ) {
      form.value.periodMonth =
        selectedLaborMonth.value ||
        selectedDate.value.slice(
          0,
          7
        )
    }

    updatePeriodFromFrequency()

    try {
      const params =
        new URLSearchParams()

      params.append(
        'month',
        form.value.periodMonth
      )

      params.append(
        'expenseItemId',
        form.value.expenseItemId
      )

      const data =
        await fetchJson(
          `${API}/expenses/labor/13th-month-estimate?${params.toString()}`,
          {
            headers: {
              ...getAuthHeaders()
            }
          }
        )

      if (
        !isEditMode.value
      ) {
        form.value.price =
          Number(
            data?.amount || 0
          )
      }

    } catch (err) {
      console.error(
        'Error fetching 13th month estimate:',
        err
      )

      error.value =
        err.message ||
        'Failed to load 13th month estimate.'
    }
  }

// =====================================================
// FREQUENCY / PERIOD
// =====================================================

const formatInputDate =
  date => {
    const year =
      date.getFullYear()

    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      )

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      )

    return `${year}-${month}-${day}`
  }

const getDateOnly =
  value => {
    if (!value) {
      return ''
    }

    if (
      value instanceof Date
    ) {
      if (
        Number.isNaN(
          value.getTime()
        )
      ) {
        return ''
      }

      return new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }
      ).format(value)
    }

    const stringValue =
      String(value)

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        stringValue
      )
    ) {
      return stringValue
    }

    if (
      stringValue.includes('T')
    ) {
      const directDate =
        stringValue
          .split('T')[0]
          .slice(0, 10)

      if (
        /^\d{4}-\d{2}-\d{2}$/.test(
          directDate
        )
      ) {
        const parsed =
          new Date(
            stringValue
          )

        if (
          !Number.isNaN(
            parsed.getTime()
          )
        ) {
          return new Intl.DateTimeFormat(
            'en-CA',
            {
              timeZone:
                'Asia/Manila',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }
          ).format(parsed)
        }

        return directDate
      }
    }

    const parsed =
      new Date(
        stringValue
      )

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).format(parsed)
  }

const getMonthStartDate =
  dateString => {
    if (!dateString) {
      return ''
    }

    const [year, month] =
      dateString
        .split('-')
        .map(Number)

    return formatInputDate(
      new Date(
        year,
        month - 1,
        1
      )
    )
  }

const getMonthEndDate =
  dateString => {
    if (!dateString) {
      return ''
    }

    const [year, month] =
      dateString
        .split('-')
        .map(Number)

    return formatInputDate(
      new Date(
        year,
        month,
        0
      )
    )
  }

const formatDateValue =
  date => {
    const year =
      date.getFullYear()

    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      )

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      )

    return `${year}-${month}-${day}`
  }

const addDays =
  (
    dateString,
    days
  ) => {
    if (!dateString) {
      return ''
    }

    const date =
      new Date(
        `${dateString}T00:00:00`
      )

    date.setDate(
      date.getDate() + days
    )

    return formatDateValue(
      date
    )
  }

const getMonday =
  dateString => {
    if (!dateString) {
      return ''
    }

    const date =
      new Date(
        `${dateString}T00:00:00`
      )

    const day =
      date.getDay()

    const diff =
      day === 0
        ? -6
        : 1 - day

    date.setDate(
      date.getDate() + diff
    )

    return formatDateValue(
      date
    )
  }

const getSunday =
  dateString => {
    const monday =
      getMonday(
        dateString
      )

    return addDays(
      monday,
      6
    )
  }

const updatePeriodFromFrequency =
  () => {
    const frequency =
      form.value.frequency

    if (
      frequency ===
      'Weekly'
    ) {
      const baseDate =
        form.value.payrollPeriodStart ||
        selectedDate.value ||
        todayPH

      const start =
        form.value.payrollPeriodStart ||
        getMonday(
          baseDate
        )

      form.value.payrollPeriodStart =
        start

      form.value.payrollPeriodEnd =
        getSunday(
          start
        )

      return
    }

    if (
      frequency ===
      'Monthly'
    ) {
      if (
        !form.value.periodMonth
      ) {
        form.value.periodMonth =
          activeSection.value ===
            'Bill'
            ? (
                selectedBillMonth.value ||
                todayPH.slice(0, 7)
              )
            : activeSection.value ===
                'Labor'
              ? (
                  selectedLaborMonth.value ||
                  todayPH.slice(0, 7)
                )
              : todayPH.slice(
                  0,
                  7
                )
      }

      form.value.payrollPeriodStart =
        getMonthStartDate(
          form.value.periodMonth
        )

      form.value.payrollPeriodEnd =
        getMonthEndDate(
          form.value.periodMonth
        )

      return
    }

    if (
      frequency ===
      'Daily'
    ) {
      if (
        !form.value.periodMonth
      ) {
        form.value.periodMonth =
          activeSection.value ===
            'Bill'
            ? (
                selectedBillMonth.value ||
                todayPH.slice(0, 7)
              )
            : activeSection.value ===
                'Labor'
              ? (
                  selectedLaborMonth.value ||
                  todayPH.slice(0, 7)
                )
              : todayPH.slice(
                  0,
                  7
                )
      }

      form.value.payrollPeriodStart =
        getMonthStartDate(
          form.value.periodMonth
        )

      form.value.payrollPeriodEnd =
        getMonthEndDate(
          form.value.periodMonth
        )

      return
    }

    form.value.payrollPeriodStart =
      ''

    form.value.payrollPeriodEnd =
      ''

    if (
      !form.value.expenseDate
    ) {
      form.value.expenseDate =
        selectedDate.value ||
        todayPH
    }
  }

const changeFrequency =
  async () => {
    error.value = ''

    updatePeriodFromFrequency()

    if (
      form.value.category ===
      'Bill'
    ) {
      await fetchBillEstimate()
    }

    if (
      form.value.category ===
        'Labor' &&
      form.value.laborType ===
        '13thMonth'
    ) {
      await fetch13thMonthEstimate()
    }
  }

// =====================================================
// CATEGORY CHANGE
// =====================================================

const changeCategory =
  async () => {
    error.value = ''

    /*
    |--------------------------------------------------------------------------
    | Selecting a NEW category means this is a new item
    | unless we're currently editing an existing record.
    |--------------------------------------------------------------------------
    */

    if (
      !isEditMode.value
    ) {
      form.value.expenseItemId =
        null

      selectedExpenseItemId.value =
        null

      selectedExpenseItemName.value =
        ''

      itemSuggestions.value =
        []

      showItemSuggestions.value =
        false
    }

    form.value.price =
      ''

    form.value.qty =
      1

    form.value.unit =
      'pcs'

    form.value.frequency =
      'One-Time'

    form.value.periodMonth =
      todayPH.slice(
        0,
        7
      )

    form.value.payrollPeriodStart =
      ''

    form.value.payrollPeriodEnd =
      ''

    form.value.expenseDate =
      todayPH

    form.value.remarks =
      ''

    form.value.dueDate =
      ''

    form.value.paymentStatus =
      'Paid'

    form.value.paidDate =
      ''

    form.value.paymentSource =
      'Store'

    form.value.maintenanceType =
      ''

    form.value.billType =
      ''

    form.value.laborType =
      'Regular'

    form.value.laborAmountStatus =
      'Actual'

    form.value.payday =
      ''

    if (
      form.value.category ===
      'Bill'
    ) {
      form.value.billType =
        form.value.item
    }

    if (
      form.value.category ===
      'Labor'
    ) {
      if (
        isCashier.value
      ) {
        form.value.item =
          'Ulam'

        form.value.laborType =
          'Ulam'

        form.value.frequency =
          'One-Time'

        form.value.unit =
          'day'

        form.value.expenseDate =
          todayPH
      } else {
        form.value.laborType =
          'Regular'
      }
    }

    if (
      isInventoryCategory(
        form.value.category
      )
    ) {
      inventoryCategoryFilter.value =
        form.value.category
    }

    updatePeriodFromFrequency()
  }

// =====================================================
// ADMIN SECTION CHANGE
// =====================================================

const changeSection =
  async section => {
    if (
      !isAdmin.value
    ) {
      return
    }

    activeSection.value =
      section

    /*
    |--------------------------------------------------------------------------
    | Category behavior:
    |
    | Operating Expenses = blank for new item.
    | Bills = Bill.
    | Labor Cost = Labor.
    |--------------------------------------------------------------------------
    */

    const defaultCategory =
      section === 'Bill'
        ? 'Bill'
        : section === 'Labor'
          ? 'Labor'
          : ''

    form.value = {
      item: '',
      expenseItemId: null,

      price: '',
      qty: 1,
      unit: 'pcs',

      category:
        defaultCategory,

      frequency:
        'One-Time',

      periodMonth:
        section === 'Bill'
          ? selectedBillMonth.value
          : section === 'Labor'
            ? selectedLaborMonth.value
            : todayPH.slice(
                0,
                7
              ),

      payrollPeriodStart:
        '',

      payrollPeriodEnd:
        '',

      expenseDate:
        todayPH,

      remarks:
        '',

      dueDate:
        '',

      paymentStatus:
        'Paid',

      paidDate:
        '',

      paymentSource:
        'Store',

      maintenanceType:
        '',

      billType:
        section === 'Bill'
          ? ''
          : '',

      laborType:
        'Regular',

      laborAmountStatus:
        'Actual',

      payday:
        ''
    }

    selectedExpenseItemName.value =
      ''

    selectedExpenseItemId.value =
      null

    showItemSuggestions.value =
      false

    itemSuggestions.value =
      []

    if (
      section ===
      'Ingredient'
    ) {
      inventoryCategoryFilter.value =
        'All'

      await fetchExpenses()
      return
    }

    if (
      section ===
      'Bill'
    ) {
      await fetchBillMonthExpenses()
      return
    }

    if (
      section ===
      'Labor'
    ) {
      await fetchLaborMonthExpenses()
      return
    }
  }

// =====================================================
// SELECT CASHIER BILL
// =====================================================

const selectCashierBill =
  billName => {
    const existingMaster =
      masterExpenseItems.value.find(
        item =>
          item.category ===
            'Bill' &&
          normalizeExpenseName(
            item.name
          ) ===
            normalizeExpenseName(
              billName
            )
      )

    form.value.item =
      billName

    form.value.expenseItemId =
      existingMaster?._id ||
      null

    form.value.category =
      'Bill'

    form.value.billType =
      billName

    form.value.frequency =
      existingMaster?.frequency &&
      expenseFrequencyOptions.includes(
        existingMaster.frequency
      )
        ? existingMaster.frequency
        : 'One-Time'

    form.value.price =
      ''

    form.value.qty =
      1

    form.value.unit =
      'pcs'

    form.value.dueDate =
      ''

    form.value.paymentStatus =
      'Paid'

    form.value.paidDate =
      todayPH

    form.value.paymentSource =
      'Store'

    form.value.expenseDate =
      todayPH

    form.value.remarks =
      ''

    selectedExpenseItemName.value =
      billName

    selectedExpenseItemId.value =
      existingMaster?._id ||
      null

    updatePeriodFromFrequency()

    showItemSuggestions.value =
      false

    itemSuggestions.value =
      []
  }

// =====================================================
// FETCH LABOR RECORDS FOR MONTH
// =====================================================

const fetchLaborMonthExpenses =
  async () => {
    if (
      !isAdmin.value
    ) {
      laborMonthExpenses.value =
        []

      return
    }

    if (
      !selectedLaborMonth.value
    ) {
      selectedLaborMonth.value =
        todayPH.slice(
          0,
          7
        )
    }

    laborMonthLoading.value =
      true

    try {
      const params =
        new URLSearchParams()

      params.append(
        'category',
        'Labor'
      )

      params.append(
        'laborMonth',
        selectedLaborMonth.value
      )

      params.append(
        'includeEstimates',
        'true'
      )

      const data =
        await fetchJson(
          `${API}/expenses?${params.toString()}`,
          {
            headers: {
              ...getAuthHeaders()
            }
          }
        )

      laborMonthExpenses.value =
        extractArray(data)
          .filter(
            record =>
              record.category ===
              'Labor'
          )
          .sort(
            (
              a,
              b
            ) => {
              const aStatus =
                a.laborAmountStatus ===
                'Actual'
                  ? 0
                  : 1

              const bStatus =
                b.laborAmountStatus ===
                'Actual'
                  ? 0
                  : 1

              if (
                aStatus !==
                bStatus
              ) {
                return (
                  aStatus -
                  bStatus
                )
              }

              const aDate =
                new Date(
                  a.date ||
                  a.payrollPeriodStart ||
                  0
                ).getTime()

              const bDate =
                new Date(
                  b.date ||
                  b.payrollPeriodStart ||
                  0
                ).getTime()

              return (
                aDate -
                bDate
              )
            }
          )

    } catch (err) {
      console.error(
        'Error fetching Labor Cost records:',
        err
      )

      laborMonthExpenses.value =
        []

      error.value =
        err.message ||
        'Failed to load Labor Cost records.'

    } finally {
      laborMonthLoading.value =
        false
    }
  }

// =====================================================
// FETCH BILL RECORDS FOR MONTH
// =====================================================

const fetchBillMonthExpenses =
  async () => {
    if (
      !isAdmin.value
    ) {
      billMonthExpenses.value =
        []

      return
    }

    if (
      !selectedBillMonth.value
    ) {
      selectedBillMonth.value =
        todayPH.slice(
          0,
          7
        )
    }

    billMonthLoading.value =
      true

    try {
      const params =
        new URLSearchParams()

      params.append(
        'category',
        'Bill'
      )

      params.append(
        'billMonth',
        selectedBillMonth.value
      )

      params.append(
        'includeEstimates',
        'true'
      )

      const data =
        await fetchJson(
          `${API}/expenses?${params.toString()}`,
          {
            headers: {
              ...getAuthHeaders()
            }
          }
        )

      billMonthExpenses.value =
        extractArray(data)
          .filter(
            record =>
              record.category ===
              'Bill'
          )
          .sort(
            (
              a,
              b
            ) => {
              const aStatus =
                a.expenseAmountStatus ===
                'Actual'
                  ? 0
                  : 1

              const bStatus =
                b.expenseAmountStatus ===
                'Actual'
                  ? 0
                  : 1

              if (
                aStatus !==
                bStatus
              ) {
                return (
                  aStatus -
                  bStatus
                )
              }

              const aDate =
                new Date(
                  a.date ||
                  a.billingPeriodStart ||
                  0
                ).getTime()

              const bDate =
                new Date(
                  b.date ||
                  b.billingPeriodStart ||
                  0
                ).getTime()

              if (
                aDate !==
                bDate
              ) {
                return (
                  aDate -
                  bDate
                )
              }

              return String(
                a.name || ''
              ).localeCompare(
                String(
                  b.name || ''
                )
              )
            }
          )

    } catch (err) {
      console.error(
        'Error fetching Bill records:',
        err
      )

      billMonthExpenses.value =
        []

      error.value =
        err.message ||
        'Failed to load Bill records.'

    } finally {
      billMonthLoading.value =
        false
    }
  }

// =====================================================
// LABOR MONTH FILTER
// =====================================================

const changeLaborMonth =
  async () => {
    if (
      !isAdmin.value
    ) {
      return
    }

    if (
      !selectedLaborMonth.value
    ) {
      selectedLaborMonth.value =
        todayPH.slice(
          0,
          7
        )
    }

    form.value.periodMonth =
      selectedLaborMonth.value

    error.value = ''

    await fetchLaborMonthExpenses()
  }

// =====================================================
// BILL MONTH FILTER
// =====================================================

const changeBillMonth =
  async () => {
    if (
      !isAdmin.value
    ) {
      return
    }

    if (
      !selectedBillMonth.value
    ) {
      selectedBillMonth.value =
        todayPH.slice(
          0,
          7
        )
    }

    form.value.periodMonth =
      selectedBillMonth.value

    error.value = ''

    await fetchBillMonthExpenses()
  }

// =====================================================
// CLEAR FILTERS
// =====================================================

const clearExpenseFilters =
  async () => {
    searchExpense.value =
      ''

    selectedDate.value =
      getTodayPH()

    selectedLaborMonth.value =
      getTodayPH().slice(
        0,
        7
      )

    selectedBillMonth.value =
      getTodayPH().slice(
        0,
        7
      )

    if (
      activeSection.value ===
      'Ingredient'
    ) {
      inventoryCategoryFilter.value =
        'All'
    }

    if (
      activeSection.value ===
      'Labor'
    ) {
      form.value.periodMonth =
        selectedLaborMonth.value

      await fetchLaborMonthExpenses()
      return
    }

    if (
      activeSection.value ===
      'Bill'
    ) {
      form.value.periodMonth =
        selectedBillMonth.value

      await fetchBillMonthExpenses()
      return
    }

    await fetchExpenses()
  }

// =====================================================
// SUBMIT EXPENSE
// =====================================================

const submitExpense =
  async () => {
    error.value = ''
    success.value = ''

    const itemName =
      form.value.item.trim()

    /*
    |--------------------------------------------------------------------------
    | ITEM
    |--------------------------------------------------------------------------
    */

    if (!itemName) {
      error.value =
        'Item ay required.'

      return
    }

    /*
    |--------------------------------------------------------------------------
    | CATEGORY
    |--------------------------------------------------------------------------
    */

    if (
      !form.value.category
    ) {
      error.value =
        'Pumili muna ng Category.'

      return
    }

    /*
    |--------------------------------------------------------------------------
    | AMOUNT
    |--------------------------------------------------------------------------
    */

    if (
      form.value.price === '' ||
      form.value.price === null ||
      Number(
        form.value.price
      ) < 0
    ) {
      error.value =
        'Amount / Cost ay required.'

      return
    }

    /*
    |--------------------------------------------------------------------------
    | CASHIER BILL RESTRICTION
    |--------------------------------------------------------------------------
    */

    if (
      isCashier.value &&
      form.value.category ===
      'Bill' &&
      !isCashierAllowedBill(
        itemName
      )
    ) {
      error.value =
        'Cashier can only record Electricity Bill, Pest Control, Water Bill, or WiFi Bill.'

      return
    }

    /*
    |--------------------------------------------------------------------------
    | CASHIER LABOR = ULAM ONLY
    |--------------------------------------------------------------------------
    */

    if (
      isCashier.value &&
      form.value.category ===
      'Labor'
    ) {
      if (
        !isUlamLabor(
          itemName,
          form.value.laborType
        )
      ) {
        error.value =
          'Cashier can only record Ulam.'

        return
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CASHIER DATE
    |--------------------------------------------------------------------------
    */

    if (
      isCashier.value
    ) {
      form.value.expenseDate =
        todayPH

      if (
        form.value.category ===
        'Labor'
      ) {
        form.value.frequency =
          'One-Time'

        form.value.laborType =
          'Ulam'
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN LABOR RESTRICTION
    |--------------------------------------------------------------------------
    */

    if (
      form.value.category ===
        'Labor' &&
      !isUlamExpense.value &&
      !isAdmin.value
    ) {
      error.value =
        'Admin access required for Labor Cost.'

      return
    }

    /*
    |--------------------------------------------------------------------------
    | FREQUENCY
    |--------------------------------------------------------------------------
    */

    if (
      !expenseFrequencyOptions.includes(
        form.value.frequency
      )
    ) {
      error.value =
        'Pumili ng valid Frequency.'

      return
    }

    /*
    |--------------------------------------------------------------------------
    | WEEKLY
    |--------------------------------------------------------------------------
    */

    if (
      form.value.frequency ===
      'Weekly'
    ) {
      if (
        !form.value.payrollPeriodStart ||
        !form.value.payrollPeriodEnd
      ) {
        error.value =
          'Payroll Period Start at End ay required.'

        return
      }

      if (
        form.value.payrollPeriodStart >
        form.value.payrollPeriodEnd
      ) {
        error.value =
          'Payroll Period Start cannot be later than Payroll Period End.'

        return
      }
    }

    /*
    |--------------------------------------------------------------------------
    | MONTHLY / DAILY
    |--------------------------------------------------------------------------
    */

    if (
      form.value.frequency ===
        'Monthly' ||
      form.value.frequency ===
        'Daily'
    ) {
      if (
        form.value.category ===
        'Bill'
      ) {
        // Bills: ang Date (cash-out day) ang required.
        // Ang billed month ay auto mula sa Date.
        if (
          !form.value.expenseDate
        ) {
          error.value =
            'Date ay required.'

          return
        }
      } else {
        // Labor (Monthly/Daily): Month pa rin ang basehan.
        if (
          !form.value.periodMonth
        ) {
          error.value =
            'Month ay required.'

          return
        }

        updatePeriodFromFrequency()
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ONE-TIME
    |--------------------------------------------------------------------------
    */

    if (
      form.value.frequency ===
        'One-Time' &&
      !form.value.expenseDate
    ) {
      error.value =
        'Date ay required.'

      return
    }

    /*
    |--------------------------------------------------------------------------
    | ULAM = ALWAYS ONE-TIME DAILY ACTUAL
    |--------------------------------------------------------------------------
    */

    if (
      form.value.category ===
        'Labor' &&
      isUlamExpense.value
    ) {
      form.value.frequency =
        'One-Time'

      form.value.expenseDate =
        todayPH

      form.value.laborType =
        'Ulam'

      form.value.unit =
        'day'
    }

    /*
    |--------------------------------------------------------------------------
    | BILL PAYMENT
    |--------------------------------------------------------------------------
    */

    if (
      form.value.category ===
      'Bill'
    ) {
      if (
        !form.value.paymentStatus
      ) {
        form.value.paymentStatus =
          'Paid'
      }

      if (
        form.value.paymentStatus ===
        'Paid' &&
        !['Store', 'Owner'].includes(
          form.value.paymentSource
        )
      ) {
        form.value.paymentSource =
          'Store'
      }

      if (
        form.value.paymentStatus ===
        'Due'
      ) {
        form.value.paymentSource =
          ''

        form.value.paidDate =
          ''
      }
    } else {
      if (
        !['Store', 'Owner'].includes(
          form.value.paymentSource
        )
      ) {
        form.value.paymentSource =
          'Store'
      }
    }

    submitting.value =
      true

    try {
      let recordDate =
        form.value.expenseDate ||
        selectedDate.value

      if (
        form.value.frequency ===
        'Weekly'
      ) {
        recordDate =
          form.value.payrollPeriodStart
      }

      if (
        form.value.frequency ===
          'Monthly' ||
        form.value.frequency ===
          'Daily'
      ) {
        recordDate =
          form.value.category === 'Bill'
            ? (
                form.value.expenseDate ||
                todayPH
              )
            : getMonthStartDate(
                form.value.periodMonth
              )
      }

      if (
        form.value.category ===
          'Labor' &&
        isUlamExpense.value
      ) {
        recordDate =
          todayPH
      }

      let periodStart =
        null

      let periodEnd =
        null

      if (
        form.value.frequency ===
        'Weekly'
      ) {
        periodStart =
          form.value.payrollPeriodStart

        periodEnd =
          form.value.payrollPeriodEnd
      }

      if (
        form.value.frequency ===
          'Monthly' ||
        form.value.frequency ===
          'Daily'
      ) {
        const billMonthSource =
          form.value.category === 'Bill'
            ? (
                form.value.expenseDate ||
                todayPH
              )
            : form.value.periodMonth

        periodStart =
          getMonthStartDate(
            billMonthSource
          )

        periodEnd =
          getMonthEndDate(
            billMonthSource
          )
      }

      if (
        form.value.category ===
          'Labor' &&
        isUlamExpense.value
      ) {
        periodStart =
          null

        periodEnd =
          null
      }

      const laborType =
        form.value.category ===
        'Labor'
          ? (
              isUlamExpense.value
                ? 'Ulam'
                : (
                    form.value.laborType ||
                    'Regular'
                  )
            )
          : undefined

      let recordUnit =
        form.value.unit ||
        'pcs'

      if (
        form.value.category ===
        'Labor'
      ) {
        if (
          isUlamExpense.value
        ) {
          recordUnit =
            'day'
        } else if (
          form.value.frequency ===
          'Weekly'
        ) {
          recordUnit =
            'week'
        } else if (
          form.value.frequency ===
          'Monthly'
        ) {
          recordUnit =
            'month'
        } else if (
          form.value.frequency ===
          'Daily'
        ) {
          recordUnit =
            'day'
        } else {
          recordUnit =
            'pcs'
        }
      }

      const data = {
        name:
          itemName,

        expenseItemId:
          form.value.expenseItemId ||
          undefined,

        cost:
          Number(
            form.value.price
          ),

        qty:
          form.value.category ===
          'Labor'
            ? 1
            : Number(
                form.value.qty ||
                1
              ),

        unit:
          recordUnit,

        date:
          recordDate,

        category:
          form.value.category,

        remarks:
          form.value.remarks,

        recordedBy:
          authStore.user?.username ||
          (
            isCashier.value
              ? 'Cashier'
              : 'Admin'
          ),

        expenseFrequency:
          form.value.frequency,

        dueDate:
          form.value.category ===
          'Bill'
            ? (
                form.value.dueDate ||
                null
              )
            : null,

        paymentStatus:
          form.value.category ===
          'Bill'
            ? (
                form.value.paymentStatus ||
                'Paid'
              )
            : 'Paid',

        paidDate:
          form.value.category ===
          'Bill'
            ? (
                form.value.paymentStatus ===
                'Paid'
                  ? (
                      form.value.paidDate ||
                      todayPH
                    )
                  : null
              )
            : null,

        paymentSource:
          form.value.paymentStatus ===
          'Paid'
            ? (
                form.value.paymentSource ||
                'Store'
              )
            : null,

        billingPeriodStart:
          periodStart,

        billingPeriodEnd:
          periodEnd,

        laborType:
          laborType,

        laborFrequency:
          form.value.category ===
          'Labor'
            ? (
                isUlamExpense.value
                  ? 'Daily'
                  : (
                      form.value.frequency ===
                      'One-Time'
                        ? 'Daily'
                        : form.value.frequency
                    )
              )
            : undefined,

        payrollPeriodStart:
          form.value.category ===
          'Labor'
            ? (
                isUlamExpense.value
                  ? recordDate
                  : (
                      periodStart ||
                      recordDate
                    )
              )
            : null,

        payrollPeriodEnd:
          form.value.category ===
          'Labor'
            ? (
                isUlamExpense.value
                  ? recordDate
                  : (
                      periodEnd ||
                      recordDate
                    )
              )
            : null,

        laborAmountStatus:
          form.value.category ===
          'Labor'
            ? 'Actual'
            : undefined
      }

      let isSuccess =
        false

      if (
        isEditMode.value
      ) {
        const result =
          await fetchJson(
            `${API}/expenses/${editingExpenseId.value}`,
            {
              method: 'PUT',

              headers: {
                'Content-Type':
                  'application/json',

                ...getAuthHeaders()
              },

              body:
                JSON.stringify(
                  data
                )
            }
          )

        isSuccess =
          Boolean(
            result !== null
          )

      } else {
        isSuccess =
          await expenseStore.addExpense(
            data,
            selectedDate.value
          )
      }

      if (
        isSuccess
      ) {
        success.value =
          isEditMode.value
            ? 'Expense updated successfully!'
            : 'Expense recorded successfully!'

        resetForm()

        if (
          isAdmin.value &&
          activeSection.value ===
          'Labor'
        ) {
          await fetchLaborMonthExpenses()

        } else if (
          isAdmin.value &&
          activeSection.value ===
          'Bill'
        ) {
          await fetchBillMonthExpenses()

        } else {
          await fetchExpenses()
        }

        await fetchMasterExpenseItems()

        setTimeout(() => {
          success.value =
            ''
        }, 3000)
      }

    } catch (err) {
      console.error(
        'Error saving expense:',
        err
      )

      error.value =
        err.message ||
        'May problema sa pag-save ng expense.'

    } finally {
      submitting.value =
        false
    }
  }

// =====================================================
// RESET FORM
// =====================================================

const resetForm =
  () => {
    const defaultCategory =
      isAdmin.value
        ? (
            activeSection.value ===
            'Bill'
              ? 'Bill'
              : activeSection.value ===
                'Labor'
                ? 'Labor'
                : ''
          )
        : ''

    form.value = {
      item: '',
      expenseItemId: null,

      price: '',
      qty: 1,
      unit: 'pcs',

      category:
        defaultCategory,

      frequency:
        'One-Time',

      periodMonth:
        activeSection.value ===
        'Labor'
          ? (
              selectedLaborMonth.value ||
              getTodayPH().slice(
                0,
                7
              )
            )
          : activeSection.value ===
              'Bill'
            ? (
                selectedBillMonth.value ||
                getTodayPH().slice(
                  0,
                  7
                )
              )
            : getTodayPH().slice(
                0,
                7
              ),

      payrollPeriodStart:
        '',

      payrollPeriodEnd:
        '',

      expenseDate:
        getTodayPH(),

      remarks:
        '',

      dueDate:
        '',

      paymentStatus:
        'Paid',

      paidDate:
        '',

      paymentSource:
        'Store',

      maintenanceType:
        '',

      billType:
        '',

      laborType:
        'Regular',

      laborAmountStatus:
        'Actual',

      payday:
        ''
    }

    isEditMode.value =
      false

    editingExpenseId.value =
      null

    selectedExpenseItemName.value =
      ''

    selectedExpenseItemId.value =
      null

    error.value =
      ''

    showItemSuggestions.value =
      false

    itemSuggestions.value =
      []
  }

// =====================================================
// FETCH CURRENT SECTION
// =====================================================

  const fetchExpenses =
    async () => {
      try {
        const params =
          new URLSearchParams()

        if (
          selectedDate.value
        ) {
          if (
            isCashier.value
          ) {
            /*
            |--------------------------------------------------------------------------
            | CASHIER
            |--------------------------------------------------------------------------
            |
            | A recurring Bill such as Electricity Bill may have its
            | record date set to the beginning of the billing month.
            |
            | Therefore Cashier must fetch month-to-date records,
            | then the frontend will use paidDate/date to determine
            | which records belong to the selected day.
            |--------------------------------------------------------------------------
            */

            const monthStart =
              getMonthStartDate(
                selectedDate.value.slice(
                  0,
                  7
                )
              )

            params.append(
              'startDate',
              monthStart
            )

            params.append(
              'endDate',
              selectedDate.value
            )

          } else {
            /*
            |--------------------------------------------------------------------------
            | ADMIN
            |--------------------------------------------------------------------------
            |
            | Normal daily operating expense view.
            |--------------------------------------------------------------------------
            */

            params.append(
              'startDate',
              selectedDate.value
            )

            params.append(
              'endDate',
              selectedDate.value
            )
          }
        }

        const data =
          await fetchJson(
            `${API}/expenses?${params.toString()}`,
            {
              headers: {
                ...getAuthHeaders()
              }
            }
          )

        dailyExpenses.value =
          extractArray(data)

      } catch (err) {
        console.error(
          'Error fetching expenses:',
          err
        )

        dailyExpenses.value =
          []

        error.value =
          err.message ||
          'Hindi ma-load ang expenses.'
      }
    }

// =====================================================
// WATCH DAILY DATE
// =====================================================

watch(
  selectedDate,
  async () => {
    if (
      activeSection.value ===
      'Labor'
    ) {
      await fetchLaborMonthExpenses()
      return
    }

    if (
      activeSection.value ===
      'Bill'
    ) {
      return
    }

    await fetchExpenses()
  }
)

// =====================================================
// WATCH LABOR MONTH
// =====================================================

watch(
  selectedLaborMonth,
  async (
    newMonth,
    oldMonth
  ) => {
    if (
      activeSection.value !==
      'Labor'
    ) {
      return
    }

    if (
      newMonth ===
      oldMonth
    ) {
      return
    }

    form.value.periodMonth =
      newMonth

    await fetchLaborMonthExpenses()
  }
)

// =====================================================
// WATCH BILL MONTH
// =====================================================

watch(
  selectedBillMonth,
  async (
    newMonth,
    oldMonth
  ) => {
    if (
      activeSection.value !==
      'Bill'
    ) {
      return
    }

    if (
      newMonth ===
      oldMonth
    ) {
      return
    }

    form.value.periodMonth =
      newMonth

    await fetchBillMonthExpenses()
  }
)

// =====================================================
// FILTERED EXPENSES
// =====================================================

const expenses =
  computed(() => {
    const search =
      searchExpense.value
        .trim()
        .toLowerCase()

    /*
    |--------------------------------------------------------------------------
    | ADMIN LABOR
    |--------------------------------------------------------------------------
    */

    if (
      isAdmin.value &&
      activeSection.value ===
      'Labor'
    ) {
      return (
        Array.isArray(
          laborMonthExpenses.value
        )
          ? laborMonthExpenses.value
          : []
      ).filter(
        exp => {
          const itemName =
            (
              exp.name ||
              exp.title ||
              exp.item ||
              ''
            ).toLowerCase()

          return (
            !search ||
            itemName.includes(
              search
            )
          )
        }
      )
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN BILLS
    |--------------------------------------------------------------------------
    */

    if (
      isAdmin.value &&
      activeSection.value ===
      'Bill'
    ) {
      return (
        Array.isArray(
          billMonthExpenses.value
        )
          ? billMonthExpenses.value
          : []
      ).filter(
        exp => {
          const itemName =
            (
              exp.name ||
              exp.title ||
              exp.item ||
              ''
            ).toLowerCase()

          return (
            !search ||
            itemName.includes(
              search
            )
          )
        }
      )
    }

    /*
    |--------------------------------------------------------------------------
    | NORMAL DAILY RECORDS
    |--------------------------------------------------------------------------
    */

    const records =
      Array.isArray(
        dailyExpenses.value
      )
        ? dailyExpenses.value
        : []

    /*
    |--------------------------------------------------------------------------
    | CASHIER
    |--------------------------------------------------------------------------
    */

    if (
      isCashier.value
    ) {
      return records.filter(
        exp => {
          /*
          |--------------------------------------------------------------------------
          | For Cashier:
          |
          | Paid Bill -> use paidDate
          | Other expenses -> use date
          |--------------------------------------------------------------------------
          */

          const recordDate =
            exp.category === 'Bill'
              ? (
                  exp.paidDate ||
                  exp.date ||
                  exp.expenseDate ||
                  ''
                )
              : (
                  exp.date ||
                  exp.expenseDate ||
                  ''
                )

          const cleanDate =
            getDateOnly(
              recordDate
            )

          const matchesDate =
            cleanDate ===
            selectedDate.value

          const itemName =
            (
              exp.name ||
              exp.title ||
              exp.item ||
              exp.expenseItem?.name ||
              ''
            ).toLowerCase()

          const matchesSearch =
            !search ||
            itemName.includes(
              search
            )

          return (
            matchesDate &&
            matchesSearch &&
            isCashierAllowedRecord(
              exp
            )
          )
        }
      )
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN OPERATING EXPENSES
    |--------------------------------------------------------------------------
    */

    return records.filter(
      exp => {
        /*
        |--------------------------------------------------------------------------
        | Pareho ng scope sa cashier Expenses page — para "parehong
        | expenses" ang admin Operating page at ang cashier page.
        | Kasama ang records na ginawa ng cashier (operating + allowed
        | bills + ulam). Ang petsa ay base sa record/pay date (`date`).
        |--------------------------------------------------------------------------
        */

        const recordDate =
          exp.date ||
          exp.paidDate ||
          exp.expenseDate ||
          ''

        const cleanDate =
          getDateOnly(
            recordDate
          )

        const matchesDate =
          cleanDate ===
          selectedDate.value

        const itemName =
          (
            exp.name ||
            exp.title ||
            exp.item ||
            exp.expenseItem?.name ||
            ''
          ).toLowerCase()

        const matchesSearch =
          !search ||
          itemName.includes(
            search
          )

        // 'All' = lahat ng daily expense records na ini-input (kasama
        // ang mga ginawa ng cashier): operating categories + allowed
        // bills + ulam / iba pang DAILY labor.
        //
        // EXCLUDE lang ang MONTHLY / WEEKLY na recurring labor
        // (Salaries, 13th Month, benefits) — nasa hiwalay na Labor Cost
        // tab ito ni admin.
        //
        // Specific = ang piniling inventory category lang.
        const isMonthlyLabor =
          exp.category === 'Labor' &&
          [
            'Monthly',
            'Weekly'
          ].includes(
            exp.expenseFrequency
          )

        const matchesCategory =
          inventoryCategoryFilter.value ===
            'All'
            ? (
                isOperatingCategory(
                  exp.category
                ) ||
                (
                  exp.category === 'Bill' &&
                  isCashierAllowedBill(
                    exp.name
                  )
                ) ||
                (
                  exp.category === 'Labor' &&
                  !isMonthlyLabor
                )
              )
            : exp.category ===
                inventoryCategoryFilter.value

        return (
          matchesDate &&
          matchesSearch &&
          matchesCategory
        )
      }
    )
  })

// =====================================================
// TOTALS
// =====================================================

const totalExpenses =
  computed(() => {
    return (
      Array.isArray(
        expenses.value
      )
        ? expenses.value
        : []
    ).reduce(
      (
        sum,
        exp
      ) =>
        sum +
        Number(
          exp.cost ??
          exp.amount ??
          exp.price ??
          0
        ),
      0
    )
  })

const totalExpenseRecords =
  computed(() => {
    return Array.isArray(
      expenses.value
    )
      ? expenses.value.length
      : 0
  })

const totalBills =
  computed(() => {
    if (
      activeSection.value !==
      'Bill'
    ) {
      return 0
    }

    return Array.isArray(
      expenses.value
    )
      ? expenses.value.length
      : 0
  })

const paidBills =
  computed(() => {
    if (
      activeSection.value !==
      'Bill'
    ) {
      return 0
    }

    return expenses.value.filter(
      exp =>
        getBillStatus(exp) ===
        'Paid'
    ).length
  })

const dueBills =
  computed(() => {
    if (
      activeSection.value !==
      'Bill'
    ) {
      return 0
    }

    return expenses.value.filter(
      exp =>
        getBillStatus(exp) ===
        'Due'
    ).length
  })

const overdueBills =
  computed(() => {
    if (
      activeSection.value !==
      'Bill'
    ) {
      return 0
    }

    return expenses.value.filter(
      exp =>
        getBillStatus(exp) ===
        'Overdue'
    ).length
  })

const paidBillAmount =
  computed(() => {
    if (
      activeSection.value !==
      'Bill'
    ) {
      return 0
    }

    return expenses.value
      .filter(
        exp =>
          getBillStatus(exp) ===
          'Paid'
      )
      .reduce(
        (
          sum,
          exp
        ) =>
          sum +
          Number(
            exp.cost ??
            exp.amount ??
            exp.price ??
            0
          ),
        0
      )
  })

const unpaidBillAmount =
  computed(() => {
    if (
      activeSection.value !==
      'Bill'
    ) {
      return 0
    }

    return expenses.value
      .filter(
        exp =>
          getBillStatus(exp) !==
          'Paid'
      )
      .reduce(
        (
          sum,
          exp
        ) =>
          sum +
          Number(
            exp.cost ??
            exp.amount ??
            exp.price ??
            0
          ),
        0
      )
  })

// =====================================================
// FORMAT
// =====================================================

const fmtAmount =
  amount => {
    return (
      '₱' +
      Number(
        amount || 0
      ).toLocaleString(
        'en-US',
        {
          minimumFractionDigits:
            2,
          maximumFractionDigits:
            2
        }
      )
    )
  }

const formatDate =
  date => {
    if (!date) {
      return '—'
    }

    return new Date(date)
      .toLocaleDateString(
        'en-PH',
        {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          timeZone:
            'Asia/Manila'
        }
      )
  }

const getBillStatus =
  expense => {
    if (
      expense.paymentStatus ===
      'Paid'
    ) {
      return 'Paid'
    }

    if (
      !expense.dueDate
    ) {
      return 'Due'
    }

    const today =
      getTodayPH()

    const dueDate =
      getDateOnly(
        expense.dueDate
      )

    return dueDate < today
      ? 'Overdue'
      : 'Due'
  }

// =====================================================
// EDIT EXPENSE
// =====================================================

const editExpense =
  async expense => {
    // Parehong admin at cashier ay pwedeng mag-edit (ang server ang
    // nag-e-enforce ng limitasyon para sa cashier).
    if (
      !isAdmin.value &&
      !isCashier.value
    ) {
      return
    }

    if (
      expense.isSystemEstimate
    ) {
      error.value =
        'System estimates cannot be edited. Record the actual amount instead.'

      return
    }

    isEditMode.value =
      true

    editingExpenseId.value =
      expense._id

    if (
      isOperatingCategory(
        expense.category
      )
    ) {
      activeSection.value =
        'Ingredient'

      if (
        isInventoryCategory(
          expense.category
        )
      ) {
        inventoryCategoryFilter.value =
          expense.category
      }
    } else if (
      expense.category ===
      'Bill'
    ) {
      activeSection.value =
        'Bill'
    } else if (
      expense.category ===
      'Labor'
    ) {
      activeSection.value =
        'Labor'
    }

    const expenseItemId =
      expense.expenseItem?._id ||
      expense.expenseItem ||
      ''

    const frequency =
      expense.expenseFrequency ||
      expense.expenseItem?.frequency ||
      'One-Time'

    let periodMonth =
      todayPH.slice(
        0,
        7
      )

    if (
      expense.billingPeriodStart
    ) {
      periodMonth =
        getDateOnly(
          expense.billingPeriodStart
        ).slice(
          0,
          7
        )
    } else if (
      expense.payrollPeriodStart
    ) {
      periodMonth =
        getDateOnly(
          expense.payrollPeriodStart
        ).slice(
          0,
          7
        )
    } else if (
      expense.date
    ) {
      periodMonth =
        getDateOnly(
          expense.date
        ).slice(
          0,
          7
        )
    }

    form.value = {
      item:
        expense.name ||
        '',

      expenseItemId:
        expenseItemId,

      price:
        expense.cost ??
        expense.amount ??
        expense.price ??
        '',

      qty:
        expense.qty ??
        1,

      unit:
        expense.unit ||
        'pcs',

      category:
        expense.category ||
        '',

      frequency:
        frequency,

      periodMonth:
        periodMonth,

      payrollPeriodStart:
        expense.payrollPeriodStart
          ? getDateOnly(
              expense.payrollPeriodStart
            )
          : '',

      payrollPeriodEnd:
        expense.payrollPeriodEnd
          ? getDateOnly(
              expense.payrollPeriodEnd
            )
          : '',

      expenseDate:
        expense.date
          ? getDateOnly(
              expense.date
            )
          : getTodayPH(),

      remarks:
        expense.remarks ||
        '',

      dueDate:
        expense.dueDate
          ? getDateOnly(
              expense.dueDate
            )
          : '',

      paymentStatus:
        expense.paymentStatus ||
        'Paid',

      paidDate:
        expense.paidDate
          ? getDateOnly(
              expense.paidDate
            )
          : '',

      paymentSource:
        expense.paymentStatus ===
        'Due'
          ? ''
          : (
              expense.paymentSource ||
              'Store'
            ),

      maintenanceType:
        expense.category ===
        'Maintenance'
          ? (
              expense.name ||
              ''
            )
          : '',

      billType:
        expense.category ===
        'Bill'
          ? (
              expense.name ||
              ''
            )
          : '',

      laborType:
        expense.category ===
        'Labor'
          ? (
              isUlamLabor(
                expense.name,
                expense.laborType
              )
                ? 'Ulam'
                : (
                    expense.laborType ||
                    expense.expenseItem?.laborType ||
                    'Regular'
                  )
            )
          : 'Regular',

      laborAmountStatus:
        expense.category ===
        'Labor'
          ? (
              expense.laborAmountStatus ||
              'Actual'
            )
          : 'Actual',

      payday:
        expense.payday
          ? getDateOnly(
              expense.payday
            )
          : ''
    }

    selectedExpenseItemName.value =
      form.value.item

    selectedExpenseItemId.value =
      expenseItemId ||
      null

    if (
      expense.category ===
      'Labor'
    ) {
      selectedLaborMonth.value =
        periodMonth

      form.value.periodMonth =
        periodMonth

    } else if (
      expense.category ===
      'Bill'
    ) {
      selectedBillMonth.value =
        periodMonth

      form.value.periodMonth =
        periodMonth

    } else {
      selectedDate.value =
        form.value.expenseDate
    }

    error.value =
      ''

    success.value =
      ''

    await fetchMasterExpenseItems()

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

// =====================================================
// DELETE EXPENSE
// =====================================================

const deleteExpense =
  async expenseOrId => {
    // Parehong admin at cashier ay pwedeng mag-delete (ang server ang
    // nag-e-enforce ng limitasyon para sa cashier).
    if (
      !isAdmin.value &&
      !isCashier.value
    ) {
      return
    }

    const expense =
      typeof expenseOrId ===
      'object'
        ? expenseOrId
        : null

    const id =
      typeof expenseOrId ===
      'object'
        ? expenseOrId?._id
        : expenseOrId

    if (
      expense?.isSystemEstimate ||
      String(
        id || ''
      ).startsWith(
        'estimate-'
      )
    ) {
      error.value =
        'System estimates cannot be deleted.'

      return
    }

    if (!id) {
      error.value =
        'Invalid expense record.'

      return
    }

    if (
      !confirm(
        'Sigurado kang buburahin ang record na ito?'
      )
    ) {
      return
    }

    try {
      await fetchJson(
        `${API}/expenses/${id}`,
        {
          method: 'DELETE',

          headers: {
            ...getAuthHeaders()
          }
        }
      )

      success.value =
        'Expense deleted successfully!'

      if (
        activeSection.value ===
        'Labor'
      ) {
        await fetchLaborMonthExpenses()

      } else if (
        activeSection.value ===
        'Bill'
      ) {
        await fetchBillMonthExpenses()

      } else {
        await fetchExpenses()
      }

      setTimeout(() => {
        success.value =
          ''
      }, 3000)

    } catch (err) {
      console.error(
        'Error deleting expense:',
        err
      )

      error.value =
        err.message ||
        'Failed to delete expense.'
    }
  }

// =====================================================
// MARK BILL AS PAID
// =====================================================

const markBillPaid =
  async expense => {
    if (
      !isAdmin.value
    ) {
      return
    }

    if (!expense) {
      error.value =
        'Invalid bill record.'

      return
    }

    const id =
      expense?._id

    if (!id) {
      error.value =
        'Invalid bill record.'

      return
    }

    if (
      String(id).startsWith(
        'estimate-'
      )
    ) {
      error.value =
        'System-generated estimates cannot be marked as paid. Record the actual bill first.'

      return
    }

    selectedBillForPayment.value =
      expense

    billPaymentSource.value =
      ['Store', 'Owner'].includes(
        expense.paymentSource
      )
        ? expense.paymentSource
        : 'Store'

    error.value =
      ''

    isBillPaymentModalOpen.value =
      true
  }

const cancelBillPayment =
  () => {
    isBillPaymentModalOpen.value =
      false

    selectedBillForPayment.value =
      null

    billPaymentSource.value =
      'Store'

    billPaymentSubmitting.value =
      false
  }

const confirmMarkBillPaid =
  async () => {
    const id =
      selectedBillForPayment.value?._id

    if (!id) {
      error.value =
        'Invalid bill record.'

      return
    }

    if (
      !['Store', 'Owner'].includes(
        billPaymentSource.value
      )
    ) {
      error.value =
        'Pumili kung Store o Owner ang nagbayad.'

      return
    }

    billPaymentSubmitting.value =
      true

    error.value =
      ''

    try {
      await fetchJson(
        `${API}/expenses/bills/${id}/pay`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            ...getAuthHeaders()
          },

          body:
            JSON.stringify({
              paymentSource:
                billPaymentSource.value
            })
        }
      )

      success.value =
        'Bill marked as Paid successfully.'

      cancelBillPayment()

      await fetchBillMonthExpenses()

      setTimeout(() => {
        success.value =
          ''
      }, 3000)

    } catch (err) {
      console.error(
        'Error marking bill as paid:',
        err
      )

      error.value =
        err.message ||
        'Failed to mark bill as Paid.'

    } finally {
      billPaymentSubmitting.value =
        false
    }
  }

// =====================================================
// ON MOUNT
// =====================================================

onMounted(async () => {
  await fetchMasterExpenseItems()

  /*
  |--------------------------------------------------------------------------
  | Admin starts in Operating Expenses with blank category.
  | Cashier starts with blank category.
  |--------------------------------------------------------------------------
  */

  await fetchExpenses()
})
</script>

<template>
  <div
    class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
  >

    <!-- ================================================= -->
    <!-- PAGE TITLE -->
    <!-- ================================================= -->

    <div>
      <h1
        class="text-2xl font-bold text-blue-800 flex items-center gap-2"
      >
        💰 Expenses
      </h1>

      <p
        class="text-sm text-gray-500 mt-1"
      >
        Record and monitor business expenses.
      </p>
    </div>

    <!-- ================================================= -->
    <!-- ADMIN TABS -->
    <!-- ================================================= -->

    <div
      v-if="isAdmin"
      class="bg-white border border-gray-100 shadow-sm rounded-2xl p-2"
    >

      <div
        class="flex gap-2 overflow-x-auto"
      >

        <button
          v-for="section in expenseSections"
          :key="section.key"
          type="button"
          @click="
            changeSection(section.key)
          "
          :class="[
            'whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            activeSection === section.key
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
          ]"
        >

          <span
            class="mr-1"
          >
            {{ section.icon }}
          </span>

          {{ section.label }}

        </button>

      </div>

    </div>

    <!-- ================================================= -->
    <!-- CASHIER HEADER -->
    <!-- ================================================= -->

    <div
      v-else
      class="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3"
    >

      <div
        class="font-bold text-blue-800 flex items-center gap-2"
      >
        <span>💰</span>
        <span>Expenses</span>
      </div>

      <div
        class="text-xs text-gray-500 mt-1"
      >
        Record today's allowed expenses.
      </div>

    </div>

    <!-- ================================================= -->
    <!-- BILL SUMMARY -->
    <!-- ================================================= -->

    <div
      v-if="
        isAdmin &&
        activeSection === 'Bill'
      "
      class="grid grid-cols-2 md:grid-cols-4 gap-3"
    >

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Total Bills
        </div>

        <div
          class="text-2xl font-bold text-gray-800 mt-1"
        >
          {{ totalBills }}
        </div>

        <div
          class="text-xs text-gray-400 mt-1"
        >
          {{ fmtAmount(totalExpenses) }}
        </div>
      </div>

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Paid
        </div>

        <div
          class="text-2xl font-bold text-green-600 mt-1"
        >
          {{ paidBills }}
        </div>

        <div
          class="text-xs text-gray-400 mt-1"
        >
          {{ fmtAmount(paidBillAmount) }}
        </div>
      </div>

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Due
        </div>

        <div
          class="text-2xl font-bold text-yellow-600 mt-1"
        >
          {{ dueBills }}
        </div>

        <div
          class="text-xs text-gray-400 mt-1"
        >
          Unpaid bills
        </div>
      </div>

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Overdue
        </div>

        <div
          class="text-2xl font-bold text-red-600 mt-1"
        >
          {{ overdueBills }}
        </div>

        <div
          class="text-xs text-gray-400 mt-1"
        >
          {{ fmtAmount(unpaidBillAmount) }}
        </div>
      </div>

    </div>

    <!-- ================================================= -->
    <!-- RECORD EXPENSE FORM -->
    <!-- ================================================= -->

    <div
      class="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-visible"
    >

      <div
        class="bg-blue-600 text-white py-3 px-4 font-semibold flex items-center gap-2"
      >

        <span>
          {{
            isEditMode
              ? '✏️ Edit Expense'
              : `+ Record ${
                  isCashier
                    ? 'Expense'
                    : activeSection === 'Bill'
                      ? 'Bill'
                      : activeSection === 'Labor'
                        ? 'Labor Cost'
                        : 'Operating Expense'
                }`
          }}
        </span>

      </div>

      <div
        class="p-5 space-y-4"
      >

        <!-- ================================================= -->
        <!-- MESSAGES -->
        <!-- ================================================= -->

        <div
          v-if="error"
          class="bg-red-100 text-red-700 p-2 rounded-lg text-sm"
        >
          {{ error }}
        </div>

        <div
          v-if="success"
          class="bg-green-100 text-green-700 p-2 rounded-lg text-sm"
        >
          {{ success }}
        </div>

        <!-- ================================================= -->
        <!-- ITEM + AMOUNT + CATEGORY -->
        <!-- ================================================= -->

        <div
          class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
        >

          <!-- ITEM -->

          <div
            class="md:col-span-6 relative"
            @focusout="
              (e) => {
                if (
                  !e.currentTarget.contains(
                    e.relatedTarget
                  )
                ) {
                  closeItemSuggestions()
                }
              }
            "
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Item
              <span class="text-red-500">*</span>
            </label>

            <!-- CASHIER BILL -->

            <select
              v-if="
                isCashier &&
                form.category === 'Bill'
              "
              v-model="form.item"
              @change="
                selectCashierBill(form.item)
              "
              class="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >

              <option value="">
                Select Bill
              </option>

              <option
                v-for="bill in CASHIER_ALLOWED_BILLS"
                :key="bill"
                :value="bill"
              >
                {{ bill }}
              </option>

            </select>

            <!-- CASHIER ULAM -->

            <input
              v-else-if="
                isCashier &&
                form.category === 'Labor'
              "
              :value="
                form.item ||
                'Ulam'
              "
              type="text"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            />

            <!-- UNIVERSAL ITEM -->

            <input
              v-else
              v-model="form.item"
              @input="onItemInput"
              @focus="searchExpenseItems"
              type="text"
              autocomplete="off"
              placeholder="Type item name..."
              class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <!-- AUTOCOMPLETE -->

            <div
              v-if="
                showItemSuggestions &&
                itemSuggestions.length > 0
              "
              class="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden"
            >

              <div
                v-for="item in itemSuggestions"
                :key="
                  item._id ||
                  `${item.category}-${item.name}`
                "
                @mousedown.prevent="
                  selectExpenseItem(item)
                "
                class="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0"
              >

                <div
                  class="font-medium text-gray-800"
                >
                  {{ item.name }}
                </div>

                <div
                  class="text-xs text-gray-500"
                >
                  {{ getCategoryLabel(item) }}

                  <span
                    v-if="item.frequency"
                  >
                    • {{ item.frequency }}
                  </span>

                </div>

              </div>

            </div>

            <div
              class="text-xs text-gray-400 mt-1"
            >
              <span
                v-if="
                  isExistingExpenseItem
                "
              >
                Existing item selected. Category loaded automatically.
              </span>

              <span
                v-else
              >
                Type an item name to search existing expense items, or enter a new item.
              </span>
            </div>

          </div>

          <!-- AMOUNT -->

          <div
            class="md:col-span-3"
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Amount
              <span class="text-red-500">*</span>
            </label>

            <div
              class="relative"
            >

              <span
                class="absolute left-3 top-2 text-gray-500"
              >
                ₱
              </span>

              <input
                v-model="form.price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="w-full border border-gray-300 rounded-lg p-2 pl-7 focus:ring-2 focus:ring-blue-500 outline-none"
              />

            </div>

          </div>

          <!-- CATEGORY -->

          <div
            class="md:col-span-3"
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Category
              <span class="text-red-500">*</span>
            </label>

            <!-- CASHIER -->

            <select
              v-if="
                isCashier
              "
              v-model="form.category"
              @change="changeCategory"
              :disabled="
                isExistingExpenseItem
              "
              class="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
            >

              <option
                value=""
              >
                Select Category
              </option>

              <option
                v-for="option in cashierCategoryOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>

            </select>

            <!-- ADMIN OPERATING -->

            <select
              v-else-if="
                activeSection === 'Ingredient'
              "
              v-model="form.category"
              @change="changeCategory"
              :disabled="
                isExistingExpenseItem
              "
              class="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
            >

              <option
                value=""
              >
                Select Category
              </option>

              <option
                v-for="category in operatingCategoryOptions"
                :key="category"
                :value="category"
              >
                {{ category }}
              </option>

            </select>

            <!-- ADMIN BILL / LABOR -->

            <input
              v-else
              :value="
                activeSection === 'Bill'
                  ? 'Bill'
                  : 'Labor'
              "
              type="text"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-600"
            />

            <div
              class="text-xs text-gray-400 mt-1"
            >
              <span
                v-if="
                  isExistingExpenseItem
                "
              >
                Category automatically loaded from the existing item.
              </span>

              <span
                v-else
              >
                Choose a category for the new item.
              </span>
            </div>

          </div>

        </div>

        <!-- ================================================= -->
        <!-- INVENTORY DETAILS -->
        <!-- ================================================= -->

        <div
          v-if="
            isInventoryExpense
          "
          class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
        >

          <div
            class="md:col-span-3"
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Qty
            </label>

            <input
              v-model="form.qty"
              type="number"
              min="0"
              step="0.01"
              placeholder="1"
              class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />

          </div>

          <div
            class="md:col-span-3"
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Unit
            </label>

            <select
              v-model="form.unit"
              class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >

              <option value="pcs">
                pcs
              </option>

              <option value="kg">
                kg
              </option>

              <option value="g">
                g
              </option>

              <option value="liter">
                liter
              </option>

              <option value="ml">
                ml
              </option>

              <option value="box">
                box
              </option>

              <option value="pack">
                pack
              </option>

            </select>

          </div>

        </div>

        <!-- ================================================= -->
        <!-- ADMIN BILL / LABOR FREQUENCY -->
        <!-- ================================================= -->

        <div
          v-if="
            isAdmin &&
            (
              isBillExpense ||
              isAdminLabor
            )
          "
          class="grid grid-cols-1 md:grid-cols-4 gap-4"
        >

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Frequency
              <span class="text-red-500">*</span>
            </label>

            <select
              v-model="form.frequency"
              @change="changeFrequency"
              class="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >

              <option
                v-for="frequency in expenseFrequencyOptions"
                :key="frequency"
                :value="frequency"
              >
                {{ frequency }}
              </option>

            </select>

          </div>

        </div>

        <!-- ================================================= -->
        <!-- WEEKLY -->
        <!-- ================================================= -->

        <div
          v-if="
            isAdmin &&
            form.frequency === 'Weekly' &&
            (
              isBillExpense ||
              isAdminLabor
            )
          "
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Period Start
              <span class="text-red-500">*</span>
            </label>

            <input
              v-model="form.payrollPeriodStart"
              @change="
                updatePeriodFromFrequency
              "
              type="date"
              class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />

          </div>

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Period End
            </label>

            <input
              v-model="form.payrollPeriodEnd"
              type="date"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-500"
            />

          </div>

        </div>

        <!-- ================================================= -->
        <!-- MONTHLY -->
        <!-- ================================================= -->

        <div
          v-if="
            isAdmin &&
            form.frequency === 'Monthly' &&
            isAdminLabor
          "
          class="grid grid-cols-1 md:grid-cols-3 gap-4"
        >

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Month
              <span class="text-red-500">*</span>
            </label>

            <input
              v-model="form.periodMonth"
              @change="
                updatePeriodFromFrequency
              "
              type="month"
              class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />

          </div>

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Period Start
            </label>

            <input
              :value="
                getMonthStartDate(
                  form.periodMonth
                )
              "
              type="date"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-500"
            />

          </div>

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Period End
            </label>

            <input
              :value="
                getMonthEndDate(
                  form.periodMonth
                )
              "
              type="date"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-500"
            />

          </div>

        </div>

        <!-- ================================================= -->
        <!-- DAILY -->
        <!-- ================================================= -->

        <div
          v-if="
            isAdmin &&
            form.frequency === 'Daily' &&
            isAdminLabor
          "
          class="grid grid-cols-1 md:grid-cols-3 gap-4"
        >

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Month
              <span class="text-red-500">*</span>
            </label>

            <input
              v-model="form.periodMonth"
              @change="
                updatePeriodFromFrequency
              "
              type="month"
              class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />

          </div>

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Period Start
            </label>

            <input
              :value="
                getMonthStartDate(
                  form.periodMonth
                )
              "
              type="date"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-500"
            />

          </div>

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Period End
            </label>

            <input
              :value="
                getMonthEndDate(
                  form.periodMonth
                )
              "
              type="date"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-500"
            />

          </div>

        </div>

        <!-- ================================================= -->
        <!-- ONE-TIME DATE -->
        <!-- ================================================= -->

        <div
          v-if="
            form.frequency === 'One-Time' ||
            isBillExpense
          "
          class="grid grid-cols-1 md:grid-cols-3 gap-4"
        >

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Date
              <span class="text-red-500">*</span>
            </label>

            <input
              v-if="
                isAdmin
              "
              v-model="form.expenseDate"
              type="date"
              class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <input
              v-else
              :value="todayPH"
              type="date"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-500"
            />

            <div
              class="text-xs text-gray-400 mt-1"
            >
              Araw na lumabas ang pera sa kaha (cash-out).
            </div>

          </div>

          <!-- Billed month (derived from Date) — para sa report distribution -->
          <div
            v-if="
              isBillExpense &&
              (
                form.frequency === 'Monthly' ||
                form.frequency === 'Daily'
              )
            "
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Billed Month
            </label>

            <input
              :value="
                (form.expenseDate || todayPH).slice(0, 7)
              "
              type="month"
              readonly
              class="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-500"
            />

            <div
              class="text-xs text-gray-400 mt-1"
            >
              Auto mula sa Date. I-back date para sa ibang buwan.
            </div>

          </div>

        </div>

        <!-- ================================================= -->
        <!-- PAYMENT SOURCE -->
        <!-- ================================================= -->

        <div
          v-if="
            form.category
          "
          class="grid grid-cols-1 md:grid-cols-3 gap-4"
        >

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Paid From
            </label>

            <select
              v-model="form.paymentSource"
              class="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >

              <option value="Store">
                Store / Kaha
              </option>

              <option value="Owner">
                Owner
              </option>

            </select>

            <div
              class="text-xs text-gray-400 mt-1"
            >
              {{
                form.paymentSource === 'Owner'
                  ? 'Owner ang gumamit ng sariling pera.'
                  : 'Pera ay kinuha sa store cash / kaha.'
              }}
            </div>

          </div>

        </div>

        <!-- ================================================= -->
        <!-- BILL DETAILS -->
        <!-- ================================================= -->
        <!--
          Tinanggal na ang Due Date / Payment Status / Paid Date.
          Bawat bill ay Paid na agad sa oras ng pag-record, at ang
          "Date" (cash-out day) sa itaas ang siyang gamit ng Cash
          Ledger. Ang billed month para sa reports ay auto mula sa Date.
        -->

        <!-- ================================================= -->
        <!-- ADMIN LABOR DETAILS -->
        <!-- ================================================= -->

        <div
          v-if="
            isAdminLabor
          "
          class="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2"
        >

          <div
            class="font-black text-blue-800"
          >
            Labor Cost
          </div>

          <div
            class="text-sm text-blue-700"
          >
            Regular Labor, Labor Benefits, at 13th Month ay Admin-only.
          </div>

        </div>

        <!-- ================================================= -->
        <!-- CASHIER ULAM -->
        <!-- ================================================= -->

        <div
          v-if="
            isUlamExpense
          "
          class="bg-orange-50 border border-orange-100 rounded-xl p-4"
        >

          <div
            class="font-black text-orange-800"
          >
            Ulam
          </div>

          <div
            class="text-sm text-orange-700 mt-1"
          >
            Actual daily amount lang ang ilagay. Hindi ito system estimate.
          </div>

        </div>

        <!-- ================================================= -->
        <!-- REMARKS -->
        <!-- ================================================= -->

        <div
          v-if="
            form.category
          "
        >

          <label
            class="block text-sm font-semibold text-gray-700 mb-1"
          >
            Remarks

            <span
              class="text-gray-400 font-normal"
            >
              (Optional)
            </span>

          </label>

          <input
            v-model="form.remarks"
            type="text"
            placeholder="Additional notes..."
            class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />

        </div>

        <!-- ================================================= -->
        <!-- BUTTONS -->
        <!-- ================================================= -->

        <div
          class="flex gap-2 pt-2"
        >

          <button
            @click="submitExpense"
            type="button"
            :disabled="submitting"
            class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >

            {{
              submitting
                ? 'Saving...'
                : (
                    isEditMode
                      ? 'Update Expense'
                      : 'Record Expense'
                  )
            }}

          </button>

          <button
            @click="resetForm"
            type="button"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {{
              isEditMode
                ? 'Cancel Edit'
                : 'Clear'
            }}
          </button>

        </div>

      </div>

    </div>

    <!-- ================================================= -->
    <!-- EXPENSE HISTORY -->
    <!-- ================================================= -->

    <div
      class="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden"
    >

      <div
        class="bg-white border-b border-gray-100 py-3 px-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3"
      >

        <div
          class="flex items-center gap-2"
        >

          <span
            class="font-bold text-blue-800"
          >
            {{
              isCashier
                ? 'Expenses'
                : expenseSections.find(
                    section =>
                      section.key ===
                      activeSection
                  )?.label ||
                  activeSection
            }}
          </span>

          <span
            class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
          >
            {{ totalExpenseRecords }}
          </span>

        </div>

        <div
          class="flex flex-col sm:flex-row gap-2"
        >

          <input
            v-model="searchExpense"
            type="text"
            placeholder="Search..."
            class="border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <!-- ADMIN OPERATING FILTER -->

          <select
            v-if="
              isAdmin &&
              activeSection === 'Ingredient'
            "
            v-model="inventoryCategoryFilter"
            class="border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >

            <option
              v-for="category in inventoryCategoryOptions"
              :key="category"
              :value="category"
            >
              {{
                category === 'All'
                  ? 'All Operating Expenses'
                  : category
              }}
            </option>

          </select>

          <!-- LABOR MONTH -->

          <div
            v-if="
              isAdmin &&
              activeSection === 'Labor'
            "
            class="flex items-center gap-2"
          >

            <span
              class="text-sm text-gray-500 font-medium whitespace-nowrap"
            >
              Month
            </span>

            <input
              v-model="selectedLaborMonth"
              @change="changeLaborMonth"
              type="month"
              class="border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <!-- BILL MONTH -->

          <div
            v-else-if="
              isAdmin &&
              activeSection === 'Bill'
            "
            class="flex items-center gap-2"
          >

            <span
              class="text-sm text-gray-500 font-medium whitespace-nowrap"
            >
              Month
            </span>

            <input
              v-model="selectedBillMonth"
              @change="changeBillMonth"
              type="month"
              class="border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <!-- DAILY DATE -->

          <template
            v-else
          >

            <input
              v-if="
                isAdmin
              "
              v-model="selectedDate"
              type="date"
              class="border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />

            <span
              v-else
              class="text-sm text-gray-500 font-medium p-2"
            >
              {{ selectedDate }}
            </span>

          </template>

          <button
            @click="clearExpenseFilters"
            type="button"
            class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Clear
          </button>

        </div>

      </div>

      <!-- INFO -->

      <div
        v-if="
          isCashier
        "
        class="px-4 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700"
      >

        Showing today's allowed expense records for

        <strong>
          {{ selectedDate }}
        </strong>

      </div>

      <div
        v-else-if="
          activeSection === 'Ingredient'
        "
        class="px-4 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700"
      >

        Showing:

        <strong>
          {{
            inventoryCategoryFilter === 'All'
              ? 'All Operating Expenses'
              : `${inventoryCategoryFilter} records`
          }}
        </strong>

        for

        <strong>
          {{ selectedDate }}
        </strong>

      </div>

      <div
        v-else-if="
          activeSection === 'Bill'
        "
        class="px-4 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700"
      >

        Showing Bill records applicable to:

        <strong>
          {{ selectedBillMonth }}
        </strong>

      </div>

      <div
        v-else-if="
          activeSection === 'Labor'
        "
        class="px-4 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700"
      >

        Showing Labor Cost records applicable to:

        <strong>
          {{ selectedLaborMonth }}
        </strong>

      </div>

      <!-- ================================================= -->
      <!-- LOADING -->
      <!-- ================================================= -->

      <div
        v-if="
          (
            activeSection === 'Labor' &&
            laborMonthLoading
          ) ||
          (
            activeSection === 'Bill' &&
            billMonthLoading
          )
        "
        class="px-4 py-8 text-center text-gray-400"
      >

        {{
          activeSection === 'Bill'
            ? 'Loading Bill records...'
            : 'Loading Labor Cost records...'
        }}

      </div>

      <!-- ================================================= -->
      <!-- TABLE -->
      <!-- ================================================= -->

      <div
        v-else
        class="overflow-x-auto"
      >

        <table
          class="w-full text-sm text-left text-gray-600"
        >

          <thead
            class="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100"
          >

            <tr>

              <th class="px-4 py-3">
                Expense
              </th>

              <th class="px-4 py-3">
                Category
              </th>

              <th
                v-if="
                  !isCashier &&
                  activeSection === 'Ingredient'
                "
                class="px-4 py-3 text-center"
              >
                Qty / Unit
              </th>

              <th
                v-if="
                  !isCashier &&
                  (
                    activeSection === 'Bill' ||
                    activeSection === 'Labor'
                  )
                "
                class="px-4 py-3"
              >
                Frequency
              </th>

              <th
                v-if="
                  !isCashier &&
                  (
                    activeSection === 'Bill' ||
                    activeSection === 'Labor'
                  )
                "
                class="px-4 py-3 text-center"
              >
                Amount Status
              </th>

              <th
                v-if="isCashier"
                class="px-4 py-3 text-center"
              >
                Status
              </th>

              <th
                class="px-4 py-3 text-right"
              >
                Amount
              </th>

              <th
                class="px-4 py-3 text-center"
              >
                Paid From
              </th>

              <th
                v-if="
                  !isCashier &&
                  activeSection === 'Bill'
                "
                class="px-4 py-3"
              >
                Due Date
              </th>

              <th
                v-if="
                  !isCashier &&
                  activeSection === 'Bill'
                "
                class="px-4 py-3 text-center"
              >
                Status
              </th>

              <th
                v-if="
                  !isCashier &&
                  activeSection === 'Bill'
                "
                class="px-4 py-3"
              >
                Paid Date
              </th>

              <th class="px-4 py-3">
                Remarks
              </th>

              <th class="px-4 py-3">
                Date
              </th>

              <th
                v-if="
                  !isCashier &&
                  activeSection === 'Labor'
                "
                class="px-4 py-3"
              >
                Payroll Period
              </th>

              <th
                class="px-4 py-3 text-center"
              >
                Recorded By
              </th>

              <th
                v-if="isAdmin || isCashier"
                class="px-4 py-3 text-center"
              >
                Actions
              </th>

            </tr>

          </thead>

          <tbody
            class="divide-y divide-gray-100"
          >

            <tr
              v-if="
                expenses.length === 0
              "
            >

              <td
                :colspan="
                  isCashier
                    ? 8
                    : activeSection === 'Bill'
                      ? 13
                      : activeSection === 'Labor'
                        ? 11
                        : 9
                "
                class="px-4 py-8 text-center text-gray-400"
              >

                {{
                  isCashier
                    ? 'Walang expense records para sa petsang ito.'
                    : activeSection === 'Labor'
                      ? 'Walang Labor Cost records para sa buwang ito.'
                      : activeSection === 'Bill'
                        ? 'Walang Bill records para sa buwang ito.'
                        : (
                            inventoryCategoryFilter === 'All'
                              ? 'Walang Operating Expense records para sa petsang ito.'
                              : `Walang ${inventoryCategoryFilter} records para sa petsang ito.`
                          )
                }}

              </td>

            </tr>

            <tr
              v-for="exp in expenses"
              :key="exp._id"
              class="hover:bg-gray-50/50"
            >

              <td
                class="px-4 py-3 font-medium text-gray-900"
              >
                {{
                  exp.name ||
                  exp.title ||
                  exp.item ||
                  '—'
                }}
              </td>

              <td
                class="px-4 py-3 text-gray-500"
              >
                {{ getCategoryLabel(exp) }}
              </td>

              <td
                v-if="
                  !isCashier &&
                  activeSection === 'Ingredient'
                "
                class="px-4 py-3 text-center"
              >
                {{ exp.qty || 1 }}
                {{ exp.unit || 'pcs' }}
              </td>

              <td
                v-if="
                  !isCashier &&
                  (
                    activeSection === 'Bill' ||
                    activeSection === 'Labor'
                  )
                "
                class="px-4 py-3"
              >
                {{
                  exp.expenseFrequency ||
                  exp.frequency ||
                  exp.laborFrequency ||
                  'One-Time'
                }}
              </td>

              <td
                v-if="
                  !isCashier &&
                  (
                    activeSection === 'Bill' ||
                    activeSection === 'Labor'
                  )
                "
                class="px-4 py-3 text-center"
              >

                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-bold',
                    (
                      activeSection === 'Bill'
                        ? exp.expenseAmountStatus
                        : exp.laborAmountStatus
                    ) === 'Actual'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  ]"
                >
                  {{
                    activeSection === 'Bill'
                      ? (
                          exp.expenseAmountStatus ||
                          'Actual'
                        )
                      : (
                          exp.laborAmountStatus ||
                          'Estimated'
                        )
                  }}
                </span>

              </td>

              <td
                v-if="isCashier"
                class="px-4 py-3 text-center"
              >

                <span
                  v-if="
                    exp.category === 'Bill'
                  "
                  :class="[
                    'px-2.5 py-1 rounded-full text-xs font-bold',
                    getBillStatus(exp) === 'Paid'
                      ? 'bg-green-100 text-green-700'
                      : getBillStatus(exp) === 'Overdue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  ]"
                >
                  {{
                    getBillStatus(exp)
                  }}
                </span>

                <span
                  v-else
                  class="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"
                >
                  Paid
                </span>

              </td>

              <td
                class="px-4 py-3 text-right font-semibold text-red-600"
              >
                {{
                  fmtAmount(
                    exp.cost ??
                    exp.amount ??
                    exp.price ??
                    0
                  )
                }}
              </td>

              <td
                class="px-4 py-3 text-center"
              >

                <span
                  v-if="
                    exp.isSystemEstimate ||
                    exp.paymentStatus === 'Due'
                  "
                  class="text-xs text-gray-400"
                >
                  —
                </span>

                <span
                  v-else-if="
                    (
                      exp.paymentSource ||
                      'Store'
                    ) === 'Owner'
                  "
                  class="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700"
                >
                  Owner
                </span>

                <span
                  v-else
                  class="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"
                >
                  Store
                </span>

              </td>

              <td
                v-if="
                  !isCashier &&
                  activeSection === 'Bill'
                "
                class="px-4 py-3"
              >
                {{
                  exp.dueDate
                    ? formatDate(
                        exp.dueDate
                      )
                    : '—'
                }}
              </td>

              <td
                v-if="
                  !isCashier &&
                  activeSection === 'Bill'
                "
                class="px-4 py-3 text-center"
              >

                <span
                  :class="[
                    'px-2.5 py-1 rounded-full text-xs font-bold',
                    getBillStatus(exp) === 'Paid'
                      ? 'bg-green-100 text-green-700'
                      : getBillStatus(exp) === 'Overdue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  ]"
                >
                  {{
                    getBillStatus(exp)
                  }}
                </span>

              </td>

              <td
                v-if="
                  !isCashier &&
                  activeSection === 'Bill'
                "
                class="px-4 py-3"
              >
                {{
                  exp.paidDate
                    ? formatDate(
                        exp.paidDate
                      )
                    : '—'
                }}
              </td>

              <td
                class="px-4 py-3 text-gray-500"
              >
                {{
                  exp.remarks ||
                  exp.notes ||
                  '—'
                }}
              </td>

              <td
                class="px-4 py-3 whitespace-nowrap"
              >
                {{
                  getDateOnly(
                    exp.date ||
                    exp.expenseDate ||
                    ''
                  ) ||
                  '—'
                }}
              </td>

              <td
                v-if="
                  !isCashier &&
                  activeSection === 'Labor'
                "
                class="px-4 py-3 whitespace-nowrap"
              >

                <div
                  class="font-medium text-gray-700"
                >
                  {{
                    exp.payrollPeriodStart
                      ? formatDate(
                          exp.payrollPeriodStart
                        )
                      : (
                          exp.billingPeriodStart
                            ? formatDate(
                                exp.billingPeriodStart
                              )
                            : '—'
                        )
                  }}
                </div>

                <div
                  v-if="
                    exp.payrollPeriodEnd ||
                    exp.billingPeriodEnd
                  "
                  class="text-xs text-gray-400 mt-1"
                >
                  to

                  {{
                    formatDate(
                      exp.payrollPeriodEnd ||
                      exp.billingPeriodEnd
                    )
                  }}
                </div>

              </td>

              <td
                class="px-4 py-3 text-center"
              >

                <span
                  :class="[
                    'px-2 py-1 rounded text-xs',
                    exp.isSystemEstimate
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  ]"
                >
                  {{
                    exp.recordedBy ||
                    'Admin'
                  }}
                </span>

              </td>

              <td
                v-if="isAdmin || isCashier"
                class="px-4 py-3 text-center"
              >

                <div
                  class="flex items-center justify-center gap-2"
                >

                  <button
                    v-if="
                      activeSection === 'Bill' &&
                      !exp.isSystemEstimate &&
                      exp.paymentStatus !== 'Paid'
                    "
                    @click="
                      markBillPaid(exp)
                    "
                    type="button"
                    title="Mark as Paid"
                    aria-label="Mark bill as Paid"
                    class="p-2 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-800 transition-colors"
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
                        d="M9 12.75 11.25 15 15 9.75"
                      />

                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />

                    </svg>

                  </button>

                  <span
                    v-if="
                      exp.isSystemEstimate
                    "
                    class="text-xs text-blue-600 font-medium px-2"
                  >
                    System Estimate
                  </span>

                  <template
                    v-else
                  >

                    <button
                      @click="
                        editExpense(exp)
                      "
                      type="button"
                      title="Edit expense"
                      aria-label="Edit expense"
                      class="p-2 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
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
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
                        />

                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />

                      </svg>

                    </button>

                    <button
                      @click="
                        deleteExpense(exp)
                      "
                      type="button"
                      title="Delete expense"
                      aria-label="Delete expense"
                      class="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
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
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 1-7.278 0"
                        />

                      </svg>

                    </button>

                  </template>

                </div>

              </td>

            </tr>

          </tbody>

        </table>

      </div>

      <!-- ================================================= -->
      <!-- TOTAL -->
      <!-- ================================================= -->

      <div
        class="bg-gray-50 border-t border-gray-100 px-4 py-3 flex justify-end"
      >

        <span
          class="font-bold text-red-600 text-lg"
        >
          Total Expenses:
          {{ fmtAmount(totalExpenses) }}
        </span>

      </div>

    </div>

    <!-- ================================================= -->
    <!-- BILL PAYMENT MODAL -->
    <!-- ================================================= -->

    <div
      v-if="isBillPaymentModalOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      @click.self="cancelBillPayment"
    >

      <div
        class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >

        <div
          class="bg-blue-600 text-white px-5 py-4"
        >

          <div
            class="text-lg font-bold"
          >
            Mark Bill as Paid
          </div>

          <div
            class="text-sm text-blue-100 mt-1"
          >
            Piliin kung saan nanggaling ang pambayad.
          </div>

        </div>

        <div
          class="p-5 space-y-4"
        >

          <div
            v-if="selectedBillForPayment"
            class="bg-gray-50 border border-gray-200 rounded-xl p-4"
          >

            <div
              class="font-semibold text-gray-800"
            >
              {{
                selectedBillForPayment.name ||
                selectedBillForPayment.title ||
                selectedBillForPayment.item ||
                'Bill'
              }}
            </div>

            <div
              class="text-lg font-bold text-red-600 mt-1"
            >
              {{
                fmtAmount(
                  selectedBillForPayment.cost ??
                  selectedBillForPayment.amount ??
                  selectedBillForPayment.price ??
                  0
                )
              }}
            </div>

          </div>

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-2"
            >
              Paid From
            </label>

            <div
              class="grid grid-cols-2 gap-3"
            >

              <button
                type="button"
                @click="
                  billPaymentSource = 'Store'
                "
                :class="[
                  'rounded-xl border-2 px-4 py-4 text-left transition-all',
                  billPaymentSource === 'Store'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                ]"
              >

                <div
                  class="font-bold"
                >
                  Store / Kaha
                </div>

                <div
                  class="text-xs mt-1"
                >
                  Galing sa pera ng store.
                </div>

              </button>

              <button
                type="button"
                @click="
                  billPaymentSource = 'Owner'
                "
                :class="[
                  'rounded-xl border-2 px-4 py-4 text-left transition-all',
                  billPaymentSource === 'Owner'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                ]"
              >

                <div
                  class="font-bold"
                >
                  Owner
                </div>

                <div
                  class="text-xs mt-1"
                >
                  Sariling pera ng owner.
                </div>

              </button>

            </div>

          </div>

          <div
            class="flex gap-2 pt-2"
          >

            <button
              type="button"
              @click="
                cancelBillPayment
              "
              :disabled="
                billPaymentSubmitting
              "
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              @click="
                confirmMarkBillPaid
              "
              :disabled="
                billPaymentSubmitting
              "
              class="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {{
                billPaymentSubmitting
                  ? 'Saving...'
                  : 'Confirm Payment'
              }}
            </button>

          </div>

        </div>

      </div>

    </div>

  </div>
</template>