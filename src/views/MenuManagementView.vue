<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const activeTab = ref('menus')

const categories = ref([])
const menus = ref([])
const expenseItems = ref([])

const loadingCategories = ref(false)
const loadingMenus = ref(false)
const loadingExpenseItems = ref(false)
const savingCategory = ref(false)
const savingMenu = ref(false)

const errorMessage = ref('')
const successMessage = ref('')

const categoryForm = ref({
  id: null,
  name: '',
  description: ''
})

const menuForm = ref({
  id: null,
  name: '',
  category: '',
  price: 0,
  stock: 0,
  isAvailable: true,
  consumptions: []
})

const menuSearch = ref('')
const menuCategoryFilter = ref('')

const isAdmin = computed(() => {
  return authStore.user?.role === 'Admin'
})

const filteredMenus = computed(() => {
  const search = menuSearch.value.trim().toLowerCase()

  return menus.value.filter(menu => {
    const matchesSearch =
      !search ||
      String(menu.name || '').toLowerCase().includes(search)

    const categoryId =
      typeof menu.category === 'object'
        ? menu.category?._id
        : menu.category

    const matchesCategory =
      !menuCategoryFilter.value ||
      categoryId === menuCategoryFilter.value

    return matchesSearch && matchesCategory
  })
})

const availableExpenseItems = computed(() => {
  return expenseItems.value.filter(item =>
    ['Ingredient', 'Material'].includes(item.category) &&
    item.isActive !== false
  )
})

const categoryFormTitle = computed(() => {
  return categoryForm.value.id
    ? 'Edit Category'
    : 'Add Category'
})

const menuFormTitle = computed(() => {
  return menuForm.value.id
    ? 'Edit Menu Item'
    : 'Add Menu Item'
})

const getToken = () => {
  return authStore.getToken()
}

const getHeaders = () => {
  const token = getToken()

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {})
  }
}

const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const showError = message => {
  errorMessage.value = message || 'Something went wrong.'
  successMessage.value = ''
}

const showSuccess = message => {
  successMessage.value = message
  errorMessage.value = ''
}

// ---------------------------------------------------------
// Categories
// ---------------------------------------------------------

const fetchCategories = async () => {
  loadingCategories.value = true

  try {
    const response = await fetch('/api/categories', {
      headers: getHeaders()
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Error fetching categories')
    }

    categories.value = Array.isArray(data) ? data : []
  } catch (error) {
    showError(error.message)
  } finally {
    loadingCategories.value = false
  }
}

const resetCategoryForm = () => {
  categoryForm.value = {
    id: null,
    name: '',
    description: ''
  }
}

const editCategory = category => {
  clearMessages()

  categoryForm.value = {
    id: category._id,
    name: category.name || '',
    description: category.description || ''
  }

  activeTab.value = 'categories'
}

const saveCategory = async () => {
  clearMessages()

  const name = categoryForm.value.name.trim()

  if (!name) {
    showError('Category name is required.')
    return
  }

  savingCategory.value = true

  try {
    const isEdit = Boolean(categoryForm.value.id)

    const url = isEdit
      ? `/api/categories/${categoryForm.value.id}`
      : '/api/categories'

    const method = isEdit ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify({
        name,
        description: categoryForm.value.description.trim()
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Error saving category'
      )
    }

    await fetchCategories()

    resetCategoryForm()

    showSuccess(
      isEdit
        ? 'Category updated successfully.'
        : 'Category added successfully.'
    )
  } catch (error) {
    showError(error.message)
  } finally {
    savingCategory.value = false
  }
}

const deleteCategory = async category => {
  clearMessages()

  const confirmed = window.confirm(
    `Delete category "${category.name}"?`
  )

  if (!confirmed) {
    return
  }

  try {
    const response = await fetch(
      `/api/categories/${category._id}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Error deleting category'
      )
    }

    await fetchCategories()

    if (categoryForm.value.id === category._id) {
      resetCategoryForm()
    }

    showSuccess('Category deleted successfully.')
  } catch (error) {
    showError(error.message)
  }
}

// ---------------------------------------------------------
// Expense Items used by Menu Consumption
// ---------------------------------------------------------

const fetchExpenseItems = async () => {
  loadingExpenseItems.value = true

  try {
    const response = await fetch('/api/expense-items', {
      headers: getHeaders()
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Error fetching expense items'
      )
    }

    expenseItems.value = Array.isArray(data) ? data : []
  } catch (error) {
    showError(error.message)
  } finally {
    loadingExpenseItems.value = false
  }
}

// ---------------------------------------------------------
// Menus
// ---------------------------------------------------------

const fetchMenus = async () => {
  loadingMenus.value = true

  try {
    const response = await fetch('/api/menus', {
      headers: getHeaders()
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Error fetching menus')
    }

    menus.value = Array.isArray(data) ? data : []
  } catch (error) {
    showError(error.message)
  } finally {
    loadingMenus.value = false
  }
}

const resetMenuForm = () => {
  menuForm.value = {
    id: null,
    name: '',
    category: '',
    price: 0,
    stock: 0,
    isAvailable: true,
    consumptions: []
  }
}

const getCategoryName = menu => {
  if (menu?.category?.name) {
    return menu.category.name
  }

  const category = categories.value.find(
    item =>
      item._id ===
      (typeof menu.category === 'object'
        ? menu.category?._id
        : menu.category)
  )

  return category?.name || 'Uncategorized'
}

const getExpenseItemName = consumption => {
  if (consumption?.expenseItem?.name) {
    return consumption.expenseItem.name
  }

  const expenseItem = expenseItems.value.find(
    item =>
      item._id ===
      (typeof consumption.expenseItem === 'object'
        ? consumption.expenseItem?._id
        : consumption.expenseItem)
  )

  return expenseItem?.name || 'Unknown Item'
}

const getExpenseItemCategory = consumption => {
  if (consumption?.expenseItem?.category) {
    return consumption.expenseItem.category
  }

  const expenseItem = expenseItems.value.find(
    item =>
      item._id ===
      (typeof consumption.expenseItem === 'object'
        ? consumption.expenseItem?._id
        : consumption.expenseItem)
  )

  return expenseItem?.category || ''
}

const getConsumptionUnit = consumption => {
  if (consumption?.unit) {
    return consumption.unit
  }

  if (consumption?.expenseItem?.unit) {
    return consumption.expenseItem.unit
  }

  const expenseItem = expenseItems.value.find(
    item =>
      item._id ===
      (typeof consumption.expenseItem === 'object'
        ? consumption.expenseItem?._id
        : consumption.expenseItem)
  )

  return expenseItem?.unit || ''
}

const getMasterExpenseItem = expenseItemId => {
  if (!expenseItemId) {
    return null
  }

  return expenseItems.value.find(
    item => item._id === expenseItemId
  ) || null
}

const editMenu = menu => {
  clearMessages()

  const categoryId =
    typeof menu.category === 'object'
      ? menu.category?._id
      : menu.category

  const consumptions = Array.isArray(menu.consumptions)
    ? menu.consumptions.map(item => {
        const expenseItemId =
          typeof item.expenseItem === 'object'
            ? item.expenseItem?._id
            : item.expenseItem

        const masterItem = expenseItems.value.find(
          expenseItem => expenseItem._id === expenseItemId
        )

        return {
          expenseItem: expenseItemId || '',
          quantity: Number(item.quantity) || 0,
          unit:
            item.unit ||
            item.expenseItem?.unit ||
            masterItem?.unit ||
            ''
        }
      })
    : []

  menuForm.value = {
    id: menu._id,
    name: menu.name || '',
    category: categoryId || '',
    price: Number(menu.price) || 0,
    stock: Number(menu.stock) || 0,
    isAvailable: menu.isAvailable !== false,
    consumptions
  }

  activeTab.value = 'menus'
}

const addConsumption = () => {
  menuForm.value.consumptions.push({
    expenseItem: '',
    quantity: 0,
    unit: ''
  })
}

const removeConsumption = index => {
  menuForm.value.consumptions.splice(index, 1)
}

const onConsumptionItemChange = index => {
  const row =
    menuForm.value.consumptions[index]

  if (!row) {
    return
  }

  const masterItem =
    getMasterExpenseItem(
      row.expenseItem
    )

  if (!masterItem) {
    row.unit = ''
    return
  }

  row.unit =
    String(
      masterItem.unit || ''
    ).trim()
}

const getSelectableExpenseItems = index => {
  const selectedByOtherRows = menuForm.value.consumptions
    .map((row, rowIndex) =>
      rowIndex === index ? null : row.expenseItem
    )
    .filter(Boolean)

  return availableExpenseItems.value.filter(item => {
    if (
      item._id ===
      menuForm.value.consumptions[index]?.expenseItem
    ) {
      return true
    }

    return !selectedByOtherRows.includes(item._id)
  })
}

const validateMenuForm = () => {
  const name = menuForm.value.name.trim()

  if (!name) {
    return 'Menu item name is required.'
  }

  if (!menuForm.value.category) {
    return 'Please select a menu category.'
  }

  const price = Number(menuForm.value.price)

  if (!Number.isFinite(price) || price < 0) {
    return 'Menu price must be 0 or greater.'
  }

  const stock = Number(menuForm.value.stock)

  if (!Number.isFinite(stock) || stock < 0) {
    return 'Stock must be 0 or greater.'
  }

  for (
    let index = 0;
    index < menuForm.value.consumptions.length;
    index++
  ) {
    const row = menuForm.value.consumptions[index]

    if (!row.expenseItem) {
      return `Please select an ingredient or material for consumption row ${index + 1}.`
    }

    const quantity = Number(row.quantity)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return `Consumption quantity on row ${index + 1} must be greater than 0.`
    }
  }

  return ''
}

const saveMenu = async () => {
  clearMessages()

  const validationError = validateMenuForm()

  if (validationError) {
    showError(validationError)
    return
  }

  savingMenu.value = true

  try {
    const isEdit = Boolean(menuForm.value.id)

    const url = isEdit
      ? `/api/menus/${menuForm.value.id}`
      : '/api/menus'

    const method = isEdit ? 'PUT' : 'POST'

    const payload = {
      name: menuForm.value.name.trim(),
      category: menuForm.value.category,
      price: Number(menuForm.value.price),
      stock: Number(menuForm.value.stock),
      isAvailable: menuForm.value.isAvailable,
      consumptions: menuForm.value.consumptions.map(row => ({
        expenseItem: row.expenseItem,
        quantity: Number(row.quantity),
        unit: String(row.unit || '').trim()
      }))
    }

    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Error saving menu item'
      )
    }

    await fetchMenus()

    resetMenuForm()

    showSuccess(
      isEdit
        ? 'Menu item updated successfully.'
        : 'Menu item added successfully.'
    )
  } catch (error) {
    showError(error.message)
  } finally {
    savingMenu.value = false
  }
}

const deleteMenu = async menu => {
  clearMessages()

  const confirmed = window.confirm(
    `Delete menu item "${menu.name}"?`
  )

  if (!confirmed) {
    return
  }

  try {
    const response = await fetch(
      `/api/menus/${menu._id}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Error deleting menu item'
      )
    }

    await fetchMenus()

    if (menuForm.value.id === menu._id) {
      resetMenuForm()
    }

    showSuccess('Menu item deleted successfully.')
  } catch (error) {
    showError(error.message)
  }
}

const formatCurrency = value => {
  const amount = Number(value) || 0

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount)
}

const formatQuantity = value => {
  const amount = Number(value) || 0

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4
  }).format(amount)
}

onMounted(async () => {
  if (!isAdmin.value) {
    return
  }

  await Promise.all([
    fetchCategories(),
    fetchMenus(),
    fetchExpenseItems()
  ])
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 p-4 md:p-6">
    <div class="mx-auto max-w-7xl space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">
            Menu Management
          </h1>

          <p class="mt-1 text-sm text-slate-500">
            Manage categories, menu items, prices, and inventory consumption per sale.
          </p>
        </div>

        <div
          v-if="isAdmin"
          class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
        >
          <span class="font-semibold text-slate-900">
            Admin
          </span>
          access only
        </div>
      </div>

      <!-- Access denied -->
      <div
        v-if="!isAdmin"
        class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
      >
        <div class="text-lg font-semibold text-red-700">
          Access Denied
        </div>

        <p class="mt-2 text-sm text-red-600">
          Only Admin users can access Menu Management.
        </p>
      </div>

      <template v-else>
        <!-- Messages -->
        <div
          v-if="errorMessage"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <div
          v-if="successMessage"
          class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {{ successMessage }}
        </div>

        <!-- Tabs -->
        <div class="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition"
            :class="
              activeTab === 'menus'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            "
            @click="activeTab = 'menus'"
          >
            Menu Items
          </button>

          <button
            type="button"
            class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition"
            :class="
              activeTab === 'categories'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            "
            @click="activeTab = 'categories'"
          >
            Categories
          </button>
        </div>

        <!-- =====================================================
             MENU TAB
        ====================================================== -->
        <template v-if="activeTab === 'menus'">
          <div class="grid gap-6 xl:grid-cols-[380px_1fr]">
            <!-- Menu Form -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-bold text-slate-900">
                    {{ menuFormTitle }}
                  </h2>

                  <p class="mt-1 text-xs text-slate-500">
                    Consumption is based on one sale of the menu item.
                  </p>
                </div>

                <button
                  v-if="menuForm.id"
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  @click="resetMenuForm"
                >
                  New
                </button>
              </div>

              <form
                class="space-y-4"
                @submit.prevent="saveMenu"
              >
                <!-- Name -->
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">
                    Menu Item Name
                  </label>

                  <input
                    v-model="menuForm.name"
                    type="text"
                    placeholder="e.g. Pancit Bihon"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <!-- Category -->
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">
                    Category
                  </label>

                  <select
                    v-model="menuForm.category"
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      Select category
                    </option>

                    <option
                      v-for="category in categories"
                      :key="category._id"
                      :value="category._id"
                    >
                      {{ category.name }}
                    </option>
                  </select>

                  <p
                    v-if="categories.length === 0"
                    class="mt-1 text-xs text-amber-600"
                  >
                    Add a category first.
                  </p>
                </div>

                <!-- Price / Stock -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">
                      Selling Price
                    </label>

                    <input
                      v-model.number="menuForm.price"
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">
                      Stock
                    </label>

                    <input
                      v-model.number="menuForm.stock"
                      type="number"
                      min="0"
                      step="1"
                      class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <!-- Availability -->
                <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    v-model="menuForm.isAvailable"
                    type="checkbox"
                    class="h-4 w-4 rounded"
                  />

                  <span>
                    <span class="block text-sm font-medium text-slate-800">
                      Available for Sale
                    </span>

                    <span class="block text-xs text-slate-500">
                      Uncheck to hide this item from active sales.
                    </span>
                  </span>
                </label>

                <!-- Consumption -->
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div class="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 class="text-sm font-bold text-slate-900">
                        Ingredients & Materials Consumption
                      </h3>

                      <p class="mt-1 text-xs text-slate-500">
                        Quantity consumed for 1 menu sale.
                      </p>
                    </div>

                    <button
                      type="button"
                      class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      @click="addConsumption"
                    >
                      + Add
                    </button>
                  </div>

                  <div
                    v-if="loadingExpenseItems"
                    class="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500"
                  >
                    Loading ingredients and materials...
                  </div>

                  <div
                    v-else-if="menuForm.consumptions.length === 0"
                    class="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center"
                  >
                    <p class="text-xs text-slate-500">
                      No consumption items yet.
                    </p>

                    <p class="mt-1 text-xs text-slate-400">
                      Add ingredients and materials used per sale.
                    </p>
                  </div>

                  <div
                    v-else
                    class="space-y-3"
                  >
                    <div
                      v-for="(row, index) in menuForm.consumptions"
                      :key="index"
                      class="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div class="grid gap-3 md:grid-cols-[1fr_90px_90px_auto] md:items-end">
                        <div>
                          <label class="mb-1 block text-xs font-medium text-slate-600">
                            Ingredient / Material
                          </label>

                          <select
                            v-model="row.expenseItem"
                            class="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            @change="onConsumptionItemChange(index)"
                          >
                            <option value="">
                              Select item
                            </option>

                            <option
                              v-for="item in getSelectableExpenseItems(index)"
                              :key="item._id"
                              :value="item._id"
                            >
                              {{ item.name }} ({{ item.category }})
                            </option>
                          </select>
                        </div>

                        <div>
                          <label class="mb-1 block text-xs font-medium text-slate-600">
                            Quantity
                          </label>

                          <input
                            v-model.number="row.quantity"
                            type="number"
                            min="0"
                            step="0.0001"
                            class="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>

                        <div>
                          <label class="mb-1 block text-xs font-medium text-slate-600">
                            Unit
                          </label>

                          <input
                            :value="getConsumptionUnit(row)"
                            type="text"
                            readonly
                            :disabled="!row.expenseItem"
                            class="w-full rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-2 text-xs text-slate-600 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
                          />

                          <p
                            v-if="row.expenseItem"
                            class="mt-1 text-[10px] text-slate-400"
                          >
                            Unit comes from Inventory Master.
                          </p>
                        </div>

                        <button
                          type="button"
                          class="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                          @click="removeConsumption(index)"
                        >
                          Remove
                        </button>
                      </div>

                      <div
                        v-if="row.expenseItem"
                        class="mt-2 text-[11px] text-slate-400"
                      >
                        {{ getExpenseItemName(row) }}
                        ·
                        {{ getExpenseItemCategory(row) }}
                        <span
                          v-if="getConsumptionUnit(row)"
                        >
                          · Master unit: {{ getConsumptionUnit(row) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Save -->
                <button
                  type="submit"
                  :disabled="savingMenu"
                  class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {{
                    savingMenu
                      ? 'Saving...'
                      : menuForm.id
                        ? 'Update Menu Item'
                        : 'Add Menu Item'
                  }}
                </button>
              </form>
            </div>

            <!-- Menu List -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 class="text-lg font-bold text-slate-900">
                    Menu Items
                  </h2>

                  <p class="mt-1 text-xs text-slate-500">
                    {{ filteredMenus.length }} item(s)
                  </p>
                </div>

                <div class="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
                  <input
                    v-model="menuSearch"
                    type="text"
                    placeholder="Search menu..."
                    class="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />

                  <select
                    v-model="menuCategoryFilter"
                    class="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      All categories
                    </option>

                    <option
                      v-for="category in categories"
                      :key="category._id"
                      :value="category._id"
                    >
                      {{ category.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div
                v-if="loadingMenus"
                class="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500"
              >
                Loading menu items...
              </div>

              <div
                v-else-if="filteredMenus.length === 0"
                class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
              >
                <p class="text-sm font-medium text-slate-600">
                  No menu items found.
                </p>

                <p class="mt-1 text-xs text-slate-400">
                  Add your first menu item using the form.
                </p>
              </div>

              <div
                v-else
                class="space-y-3"
              >
                <div
                  v-for="menu in filteredMenus"
                  :key="menu._id"
                  class="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-base font-bold text-slate-900">
                          {{ menu.name }}
                        </h3>

                        <span
                          class="rounded-full px-2 py-1 text-[10px] font-semibold"
                          :class="
                            menu.isAvailable !== false
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          "
                        >
                          {{
                            menu.isAvailable !== false
                              ? 'Available'
                              : 'Unavailable'
                          }}
                        </span>
                      </div>

                      <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>
                          Category: {{ getCategoryName(menu) }}
                        </span>

                        <span>
                          Price: {{ formatCurrency(menu.price) }}
                        </span>

                        <span>
                          Stock: {{ formatQuantity(menu.stock) }}
                        </span>
                      </div>

                      <div class="mt-3">
                        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Consumption per sale
                        </p>

                        <div
                          v-if="!menu.consumptions?.length"
                          class="text-xs text-slate-400"
                        >
                          No ingredients/materials configured.
                        </div>

                        <div
                          v-else
                          class="flex flex-wrap gap-2"
                        >
                          <span
                            v-for="(consumption, index) in menu.consumptions"
                            :key="`${menu._id}-${index}`"
                            class="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700"
                          >
                            {{ getExpenseItemName(consumption) }}
                            ×
                            {{ formatQuantity(consumption.quantity) }}
                            {{ getConsumptionUnit(consumption) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="flex gap-2 lg:shrink-0">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        @click="editMenu(menu)"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        class="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        @click="deleteMenu(menu)"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- =====================================================
             CATEGORY TAB
        ====================================================== -->
        <template v-else>
          <div class="grid gap-6 lg:grid-cols-[380px_1fr]">
            <!-- Category Form -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-bold text-slate-900">
                    {{ categoryFormTitle }}
                  </h2>

                  <p class="mt-1 text-xs text-slate-500">
                    Create and organize your menu categories.
                  </p>
                </div>

                <button
                  v-if="categoryForm.id"
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  @click="resetCategoryForm"
                >
                  New
                </button>
              </div>

              <form
                class="space-y-4"
                @submit.prevent="saveCategory"
              >
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">
                    Category Name
                  </label>

                  <input
                    v-model="categoryForm.name"
                    type="text"
                    placeholder="e.g. Rice Meals"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <textarea
                    v-model="categoryForm.description"
                    rows="4"
                    placeholder="Optional description"
                    class="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  :disabled="savingCategory"
                  class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {{
                    savingCategory
                      ? 'Saving...'
                      : categoryForm.id
                        ? 'Update Category'
                        : 'Add Category'
                  }}
                </button>
              </form>
            </div>

            <!-- Category List -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-5">
                <h2 class="text-lg font-bold text-slate-900">
                  Menu Categories
                </h2>

                <p class="mt-1 text-xs text-slate-500">
                  {{ categories.length }} category(s)
                </p>
              </div>

              <div
                v-if="loadingCategories"
                class="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500"
              >
                Loading categories...
              </div>

              <div
                v-else-if="categories.length === 0"
                class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
              >
                <p class="text-sm font-medium text-slate-600">
                  No categories yet.
                </p>

                <p class="mt-1 text-xs text-slate-400">
                  Add your first menu category.
                </p>
              </div>

              <div
                v-else
                class="grid gap-3 sm:grid-cols-2"
              >
                <div
                  v-for="category in categories"
                  :key="category._id"
                  class="rounded-2xl border border-slate-200 p-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h3 class="truncate text-sm font-bold text-slate-900">
                        {{ category.name }}
                      </h3>

                      <p
                        v-if="category.description"
                        class="mt-1 line-clamp-3 text-xs text-slate-500"
                      >
                        {{ category.description }}
                      </p>

                      <p
                        v-else
                        class="mt-1 text-xs italic text-slate-400"
                      >
                        No description
                      </p>
                    </div>

                    <div class="flex shrink-0 gap-2">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        @click="editCategory(category)"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        class="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        @click="deleteCategory(category)"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
