<script setup>
import {
  ref,
  computed,
  onMounted
} from 'vue'

import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// =====================================================
// API
// =====================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API_URL =
  `${API_BASE_URL}/api/expense-items`

// =====================================================
// AUTH
// =====================================================

const getToken = () => {
  let token = ''

  try {
    if (
      typeof authStore.getToken ===
      'function'
    ) {
      token =
        authStore.getToken() || ''
    }
  } catch (err) {
    console.warn(
      'Unable to get auth token:',
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
// RESPONSE HELPERS
// =====================================================

const extractItemsArray = data => {
  if (Array.isArray(data)) {
    return data
  }

  if (
    Array.isArray(
      data?.expenseItems
    )
  ) {
    return data.expenseItems
  }

  if (
    Array.isArray(
      data?.items
    )
  ) {
    return data.items
  }

  if (
    Array.isArray(
      data?.records
    )
  ) {
    return data.records
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
      data?.data
    )
  ) {
    return data.data
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

  let data = null

  try {
    data =
      JSON.parse(text)
  } catch {
    throw new Error(
      'Hindi valid JSON ang response ng server. I-check ang VITE_API_URL at backend URL.'
    )
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `Request failed with status ${response.status}.`
    )
  }

  return data
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
// CONSTANTS
// =====================================================

const categoryOptions = [
  'Ingredient',
  'Material',
  'Maintenance',
  'Bill',
  'Miscellaneous',
  'Labor'
]

const frequencyOptions = [
  'Daily',
  'Weekly',
  'Monthly',
  'One-Time'
]

const unitOptions = [
  'pcs',
  'kg',
  'g',
  'liter',
  'ml',
  'box',
  'pack',
  'bottle',
  'can',
  'sack',
  'bag',
  'tray',
  'set',
  'tank',
  'day',
  'week',
  'month'
]

// =====================================================
// STATE
// =====================================================

const items =
  ref([])

const loading =
  ref(false)

const saving =
  ref(false)

const error =
  ref('')

const success =
  ref('')

const isEditMode =
  ref(false)

const editingId =
  ref(null)

const search =
  ref('')

const categoryFilter =
  ref('All')

const statusFilter =
  ref('All')

const form =
  ref({
    name: '',
    category: 'Ingredient',
    unit: '',
    frequency: 'One-Time',
    defaultAmount: '',
    estimateMethod: 'Fixed',
    laborType: ''
  })

// =====================================================
// FILTERED ITEMS
// =====================================================

const filteredItems =
  computed(() => {
    const query =
      search.value
        .trim()
        .toLowerCase()

    const list =
      Array.isArray(
        items.value
      )
        ? items.value
        : []

    return list.filter(
      item => {
        const matchesSearch =
          !query ||
          String(
            item?.name || ''
          )
            .toLowerCase()
            .includes(query) ||
          String(
            item?.category || ''
          )
            .toLowerCase()
            .includes(query) ||
          String(
            item?.unit || ''
          )
            .toLowerCase()
            .includes(query) ||
          String(
            item?.laborType || ''
          )
            .toLowerCase()
            .includes(query)

        const matchesCategory =
          categoryFilter.value ===
            'All' ||
          item?.category ===
            categoryFilter.value

        const matchesStatus =
          statusFilter.value ===
            'All' ||
          (
            statusFilter.value ===
            'Active'
              ? item?.isActive !== false
              : item?.isActive === false
          )

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus
        )
      }
    )
  })

// =====================================================
// CATEGORY COUNTS
// =====================================================

const activeCount =
  computed(() => {
    const list =
      Array.isArray(
        items.value
      )
        ? items.value
        : []

    return list.filter(
      item =>
        item?.isActive !== false
    ).length
  })

const ingredientCount =
  computed(() => {
    const list =
      Array.isArray(
        items.value
      )
        ? items.value
        : []

    return list.filter(
      item =>
        item?.category ===
        'Ingredient'
    ).length
  })

const materialCount =
  computed(() => {
    const list =
      Array.isArray(
        items.value
      )
        ? items.value
        : []

    return list.filter(
      item =>
        item?.category ===
        'Material'
    ).length
  })

const billCount =
  computed(() => {
    const list =
      Array.isArray(
        items.value
      )
        ? items.value
        : []

    return list.filter(
      item =>
        item?.category ===
        'Bill'
    ).length
  })

const laborCount =
  computed(() => {
    const list =
      Array.isArray(
        items.value
      )
        ? items.value
        : []

    return list.filter(
      item =>
        item?.category ===
        'Labor'
    ).length
  })

// =====================================================
// HELPERS
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

const getFrequencyLabel =
  frequency => {
    return (
      frequency ||
      '—'
    )
  }

const getCategoryClass =
  category => {
    if (
      category ===
      'Ingredient'
    ) {
      return 'bg-orange-100 text-orange-700'
    }

    if (
      category ===
      'Material'
    ) {
      return 'bg-yellow-100 text-yellow-700'
    }

    if (
      category ===
      'Maintenance'
    ) {
      return 'bg-blue-100 text-blue-700'
    }

    if (
      category ===
      'Bill'
    ) {
      return 'bg-green-100 text-green-700'
    }

    if (
      category ===
      'Labor'
    ) {
      return 'bg-purple-100 text-purple-700'
    }

    return 'bg-gray-100 text-gray-700'
  }

const isInventoryCategory =
  category => {
    return (
      category ===
        'Ingredient' ||
      category ===
        'Material'
    )
  }

// =====================================================
// FETCH ITEMS
// =====================================================

const fetchItems =
  async () => {
    loading.value =
      true

    error.value =
      ''

    try {
      const token =
        getToken()

      if (!token) {
        throw new Error(
          'Walang authentication token. Mag-login ulit sa POS.'
        )
      }

      const data =
        await fetchJson(
          API_URL,
          {
            headers:
              getAuthHeaders()
          }
        )

      console.log(
        'Expense items API response:',
        data
      )

      items.value =
        extractItemsArray(
          data
        )
    } catch (err) {
      console.error(
        'Error fetching expense items:',
        err
      )

      items.value = []

      error.value =
        err.message ||
        'Failed to load expense items.'
    } finally {
      loading.value =
        false
    }
  }

// =====================================================
// RESET FORM
// =====================================================

const resetForm =
  () => {
    form.value = {
      name: '',
      category:
        'Ingredient',
      unit:
        '',
      frequency:
        'One-Time',
      defaultAmount:
        '',
      estimateMethod:
        'Fixed',
      laborType:
        ''
    }

    isEditMode.value =
      false

    editingId.value =
      null
  }

// =====================================================
// CATEGORY CHANGE
// =====================================================

const handleCategoryChange =
  () => {
    if (
      isInventoryCategory(
        form.value.category
      )
    ) {
      form.value.estimateMethod =
        'Fixed'

      form.value.laborType =
        ''

      return
    }

    if (
      form.value.category ===
      'Bill'
    ) {
      form.value.laborType =
        ''

      if (
        form.value.frequency ===
          'Weekly' ||
        form.value.frequency ===
          'Daily' ||
        form.value.frequency ===
          'Monthly'
      ) {
        form.value.estimateMethod =
          'PreviousActual'
      }

      return
    }

    if (
      form.value.category ===
      'Labor'
    ) {
      form.value.frequency =
        'Weekly'

      form.value.estimateMethod =
        'PreviousActual'

      return
    }

    form.value.laborType =
      ''
  }

// =====================================================
// SAVE
// =====================================================

const saveItem =
  async () => {
    error.value =
      ''

    success.value =
      ''

    const name =
      form.value.name.trim()

    if (!name) {
      error.value =
        'Item name is required.'

      return
    }

    if (
      form.value.category ===
        'Labor' &&
      !form.value.laborType.trim()
    ) {
      error.value =
        'Labor Type is required for Labor items.'

      return
    }

    const amount =
      Number(
        form.value.defaultAmount ||
        0
      )

    if (
      Number.isNaN(
        amount
      ) ||
      amount < 0
    ) {
      error.value =
        'Default Amount must be a valid non-negative number.'

      return
    }

    saving.value =
      true

    try {
      const payload = {
        name,

        category:
          form.value.category,

        unit:
          String(
            form.value.unit ||
            ''
          ).trim(),

        frequency:
          form.value.frequency,

        defaultAmount:
          amount,

        estimateMethod:
          form.value.estimateMethod,

        laborType:
          form.value.category ===
          'Labor'
            ? form.value.laborType.trim()
            : ''
      }

      const url =
        isEditMode.value
          ? `${API_URL}/${editingId.value}`
          : API_URL

      const method =
        isEditMode.value
          ? 'PUT'
          : 'POST'

      const data =
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
              JSON.stringify(
                payload
              )
          }
        )

      console.log(
        'Expense item save response:',
        data
      )

      success.value =
        isEditMode.value
          ? 'Expense item updated successfully.'
          : 'Expense item created successfully.'

      resetForm()

      await fetchItems()

      setTimeout(() => {
        success.value =
          ''
      }, 3000)
    } catch (err) {
      console.error(
        'Error saving expense item:',
        err
      )

      error.value =
        err.message ||
        'Failed to save expense item.'
    } finally {
      saving.value =
        false
    }
  }

// =====================================================
// EDIT
// =====================================================

const editItem =
  item => {
    if (!item) {
      return
    }

    form.value = {
      name:
        item.name ||
        '',

      category:
        item.category ||
        'Ingredient',

      unit:
        item.unit ||
        '',

      frequency:
        item.frequency ||
        'One-Time',

      defaultAmount:
        item.defaultAmount ??
        '',

      estimateMethod:
        item.estimateMethod ||
        'Fixed',

      laborType:
        item.laborType ||
        ''
    }

    isEditMode.value =
      true

    editingId.value =
      item._id

    error.value =
      ''

    success.value =
      ''

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

// =====================================================
// STATUS
// =====================================================

const toggleStatus =
  async item => {
    if (!item?._id) {
      return
    }

    const action =
      item.isActive === false
        ? 'activate'
        : 'deactivate'

    const confirmed =
      window.confirm(
        `Sigurado kang i-${action} ang "${item.name}"?`
      )

    if (!confirmed) {
      return
    }

    error.value =
      ''

    success.value =
      ''

    try {
      const data =
        await fetchJson(
          `${API_URL}/${item._id}/status`,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              ...getAuthHeaders()
            },

            body:
              JSON.stringify({
                isActive:
                  item.isActive ===
                  false
                    ? true
                    : false
              })
          }
        )

      console.log(
        'Expense item status response:',
        data
      )

      success.value =
        item.isActive === false
          ? 'Expense item activated.'
          : 'Expense item deactivated.'

      await fetchItems()

      setTimeout(() => {
        success.value =
          ''
      }, 3000)
    } catch (err) {
      console.error(
        'Error updating item status:',
        err
      )

      error.value =
        err.message ||
        'Failed to update item status.'
    }
  }

// =====================================================
// ON MOUNT
// =====================================================

onMounted(() => {
  if (
    authStore.user?.role ===
    'Admin'
  ) {
    fetchItems()
  }
})
</script>

<template>
  <div
    v-if="
      authStore.user?.role === 'Admin'
    "
    class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
  >

    <!-- TITLE -->

    <div>

      <h1
        class="text-2xl font-bold text-blue-800 flex items-center gap-2"
      >
        ⚙️ Expense Item Master
      </h1>

      <p
        class="text-sm text-gray-500 mt-1"
      >
        Manage reusable expense items, units, frequencies,
        default amounts, and estimate settings.
      </p>

    </div>

    <!-- SUMMARY -->

    <div
      class="grid grid-cols-2 md:grid-cols-5 gap-3"
    >

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Active
        </div>

        <div
          class="text-2xl font-bold text-blue-600 mt-1"
        >
          {{ activeCount }}
        </div>
      </div>

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Ingredients
        </div>

        <div
          class="text-2xl font-bold text-orange-600 mt-1"
        >
          {{ ingredientCount }}
        </div>
      </div>

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Materials
        </div>

        <div
          class="text-2xl font-bold text-yellow-600 mt-1"
        >
          {{ materialCount }}
        </div>
      </div>

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Bills
        </div>

        <div
          class="text-2xl font-bold text-green-600 mt-1"
        >
          {{ billCount }}
        </div>
      </div>

      <div
        class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"
      >
        <div
          class="text-xs font-semibold text-gray-500 uppercase"
        >
          Labor
        </div>

        <div
          class="text-2xl font-bold text-purple-600 mt-1"
        >
          {{ laborCount }}
        </div>
      </div>

    </div>

    <!-- FORM -->

    <div
      class="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden"
    >

      <div
        class="bg-blue-600 text-white px-4 py-3 font-semibold flex items-center justify-between"
      >

        <span>
          {{
            isEditMode
              ? '✏️ Edit Expense Item'
              : '＋ Add Expense Item'
          }}
        </span>

      </div>

      <div
        class="p-5"
      >

        <div
          v-if="error"
          class="mb-4 bg-red-100 text-red-700 p-3 rounded-lg text-sm"
        >
          {{ error }}
        </div>

        <div
          v-if="success"
          class="mb-4 bg-green-100 text-green-700 p-3 rounded-lg text-sm"
        >
          {{ success }}
        </div>

        <div
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 items-end"
        >

          <!-- NAME -->

          <div
            class="xl:col-span-2"
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Item Name
              <span class="text-red-500">*</span>
            </label>

            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Bawang"
              class="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <!-- CATEGORY -->

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Category
            </label>

            <select
              v-model="form.category"
              @change="
                handleCategoryChange
              "
              class="w-full border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option
                v-for="category in categoryOptions"
                :key="category"
                :value="category"
              >
                {{ category }}
              </option>

            </select>

          </div>

          <!-- UNIT -->

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Unit
            </label>

            <select
              v-model="form.unit"
              class="w-full border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option value="">
                Not Established
              </option>

              <option
                v-for="unit in unitOptions"
                :key="unit"
                :value="unit"
              >
                {{ unit }}
              </option>

            </select>

            <p
              v-if="
                isInventoryCategory(
                  form.category
                )
              "
              class="text-xs text-gray-400 mt-1"
            >
              Puwedeng iwanang blank. Ang unang actual record
              ang maaaring mag-establish ng unit.
            </p>

          </div>

          <!-- FREQUENCY -->

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Frequency
            </label>

            <select
              v-model="form.frequency"
              class="w-full border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option
                v-for="frequency in frequencyOptions"
                :key="frequency"
                :value="frequency"
              >
                {{ frequency }}
              </option>

            </select>

          </div>

          <!-- DEFAULT AMOUNT -->

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Default Amount
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
                v-model="form.defaultAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="w-full border border-gray-300 rounded-lg p-2 pl-7 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>

        </div>

        <!-- ESTIMATE METHOD -->

        <div
          class="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Estimate Method
            </label>

            <select
              v-model="form.estimateMethod"
              class="w-full border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option value="PreviousActual">
                Previous Actual
              </option>

              <option value="Fixed">
                Fixed
              </option>

            </select>

          </div>

          <!-- LABOR TYPE -->

          <div
            v-if="
              form.category ===
              'Labor'
            "
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Labor Type
              <span class="text-red-500">*</span>
            </label>

            <input
              v-model="form.laborType"
              type="text"
              placeholder="e.g. Regular"
              class="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p
              class="text-xs text-gray-500 mt-1"
            >
              Halimbawa:
              Regular, 13thMonth, LaborBenefit.
            </p>

          </div>

        </div>

        <!-- INVENTORY NOTE -->

        <div
          v-if="
            isInventoryCategory(
              form.category
            )
          "
          class="mt-4 bg-orange-50 border border-orange-100 rounded-xl p-4"
        >

          <div
            class="font-semibold text-orange-800"
          >
            Inventory Item
          </div>

          <p
            class="text-sm text-orange-700 mt-1"
          >
            Hindi kailangang i-establish agad ang Unit.
            Kapag nag-record ng actual expense at wala pang
            master unit, automatic itong ise-save bilang
            established unit ng item.
          </p>

        </div>

        <!-- BUTTONS -->

        <div
          class="flex gap-2 mt-5"
        >

          <button
            @click="saveItem"
            :disabled="saving"
            type="button"
            class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {{
              saving
                ? 'Saving...'
                : (
                    isEditMode
                      ? 'Update Item'
                      : 'Add Item'
                  )
            }}
          </button>

          <button
            @click="resetForm"
            type="button"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-semibold"
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

    <!-- LIST -->

    <div
      class="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden"
    >

      <!-- HEADER -->

      <div
        class="px-4 py-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
      >

        <div
          class="font-bold text-blue-800"
        >

          Expense Master Items

          <span
            class="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
          >
            {{ filteredItems.length }}
          </span>

        </div>

        <div
          class="flex flex-col sm:flex-row gap-2"
        >

          <!-- SEARCH -->

          <input
            v-model="search"
            type="text"
            placeholder="Search item..."
            class="border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <!-- CATEGORY FILTER -->

          <select
            v-model="categoryFilter"
            class="border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >

            <option value="All">
              All Categories
            </option>

            <option
              v-for="category in categoryOptions"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>

          </select>

          <!-- STATUS FILTER -->

          <select
            v-model="statusFilter"
            class="border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >

            <option value="All">
              All Status
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive
            </option>

          </select>

        </div>

      </div>

      <!-- LOADING -->

      <div
        v-if="loading"
        class="py-10 text-center text-gray-400"
      >
        Loading...
      </div>

      <!-- EMPTY -->

      <div
        v-else-if="
          filteredItems.length === 0
        "
        class="py-10 text-center text-gray-400"
      >
        Walang Expense Master Items.
      </div>

      <!-- TABLE -->

      <div
        v-else
        class="overflow-x-auto"
      >

        <table
          class="w-full text-sm text-left text-gray-600"
        >

          <thead
            class="bg-gray-50 text-gray-700 border-b border-gray-100"
          >

            <tr>

              <th
                class="px-4 py-3"
              >
                Item
              </th>

              <th
                class="px-4 py-3"
              >
                Category
              </th>

              <th
                class="px-4 py-3"
              >
                Unit
              </th>

              <th
                class="px-4 py-3"
              >
                Frequency
              </th>

              <th
                class="px-4 py-3"
              >
                Labor Type
              </th>

              <th
                class="px-4 py-3 text-right"
              >
                Default Amount
              </th>

              <th
                class="px-4 py-3"
              >
                Estimate
              </th>

              <th
                class="px-4 py-3 text-center"
              >
                Status
              </th>

              <th
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
              v-for="item in filteredItems"
              :key="item._id"
              class="hover:bg-gray-50/50"
            >

              <!-- ITEM -->

              <td
                class="px-4 py-3 font-semibold text-gray-900"
              >
                {{ item.name }}
              </td>

              <!-- CATEGORY -->

              <td
                class="px-4 py-3"
              >

                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-bold',
                    getCategoryClass(
                      item.category
                    )
                  ]"
                >
                  {{ item.category }}
                </span>

              </td>

              <!-- UNIT -->

              <td
                class="px-4 py-3"
              >

                <span
                  v-if="
                    item.unit
                  "
                  class="font-medium text-gray-700"
                >
                  {{ item.unit }}
                </span>

                <span
                  v-else
                  class="text-gray-400 italic"
                >
                  Not Established
                </span>

              </td>

              <!-- FREQUENCY -->

              <td
                class="px-4 py-3"
              >
                {{
                  getFrequencyLabel(
                    item.frequency
                  )
                }}
              </td>

              <!-- LABOR TYPE -->

              <td
                class="px-4 py-3"
              >
                {{
                  item.category ===
                  'Labor'
                    ? (
                        item.laborType ||
                        '—'
                      )
                    : '—'
                }}
              </td>

              <!-- DEFAULT AMOUNT -->

              <td
                class="px-4 py-3 text-right font-semibold"
              >
                {{
                  fmtAmount(
                    item.defaultAmount
                  )
                }}
              </td>

              <!-- ESTIMATE -->

              <td
                class="px-4 py-3"
              >
                {{
                  item.estimateMethod ===
                  'PreviousActual'
                    ? 'Previous Actual'
                    : 'Fixed'
                }}
              </td>

              <!-- STATUS -->

              <td
                class="px-4 py-3 text-center"
              >

                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-bold',
                    item.isActive === false
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-green-100 text-green-700'
                  ]"
                >
                  {{
                    item.isActive === false
                      ? 'Inactive'
                      : 'Active'
                  }}
                </span>

              </td>

              <!-- ACTIONS -->

              <td
                class="px-4 py-3 text-center"
              >

                <div
                  class="flex items-center justify-center gap-2"
                >

                  <button
                    @click="
                      editItem(item)
                    "
                    type="button"
                    class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs"
                  >
                    Edit
                  </button>

                  <button
                    @click="
                      toggleStatus(item)
                    "
                    type="button"
                    :class="[
                      'px-3 py-1.5 rounded-lg font-semibold text-xs',
                      item.isActive === false
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                    ]"
                  >
                    {{
                      item.isActive === false
                        ? 'Activate'
                        : 'Deactivate'
                    }}
                  </button>

                </div>

              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>

  </div>

  <!-- NON-ADMIN -->

  <div
    v-else
    class="p-6 text-center text-red-600 font-semibold"
  >
    Admin access only.
  </div>
</template>