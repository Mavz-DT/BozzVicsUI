<script setup>
import {
  computed,
  onMounted,
  ref
} from 'vue'

import axios from 'axios'

import { useAuthStore } from '../stores/auth'

const authStore =
  useAuthStore()

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API =
  'http://localhost:5000/api'

const getAuthHeaders = () => {
  const token =
    authStore.getToken?.() ||
    localStorage.getItem('token') ||
    ''

  return token
    ? {
        Authorization:
          `Bearer ${token}`
      }
    : {}
}

/*
|--------------------------------------------------------------------------
| Tabs
|--------------------------------------------------------------------------
*/

const activeTab =
  ref('inventory')

/*
|--------------------------------------------------------------------------
| Inventory State
|--------------------------------------------------------------------------
*/

const inventoryItems =
  ref([])

const isLoadingInventory =
  ref(false)

const inventoryError =
  ref('')

const inventorySuccess =
  ref('')

const inventorySearch =
  ref('')

const inventoryCategory =
  ref('All')

const showLowStockOnly =
  ref(false)

/*
|--------------------------------------------------------------------------
| Menu Stock State
|--------------------------------------------------------------------------
*/

const menuItems =
  ref([])

const isLoadingMenus =
  ref(false)

const menuError =
  ref('')

const menuSuccess =
  ref('')

const menuSearch =
  ref('')

const savingMenuMonitoringId =
  ref(null)

/*
|--------------------------------------------------------------------------
| Movement Modal
|--------------------------------------------------------------------------
*/

const showMovementModal =
  ref(false)

const movementType =
  ref('Stock In')

const selectedInventoryItem =
  ref(null)

const isSavingMovement =
  ref(false)

const movementError =
  ref('')

const movementForm =
  ref({
    quantity: '',
    unit: '',
    unitCost: '',
    reason: '',
    remarks: ''
  })

/*
|--------------------------------------------------------------------------
| Settings Modal
|--------------------------------------------------------------------------
*/

const showSettingsModal =
  ref(false)

const selectedSettingsItem =
  ref(null)

const isSavingSettings =
  ref(false)

const settingsError =
  ref('')

const settingsForm =
  ref({
    unit: '',
    minimumStock: 0,
    isActive: true
  })

/*
|--------------------------------------------------------------------------
| Transaction History Modal
|--------------------------------------------------------------------------
*/

const showHistoryModal =
  ref(false)

const historyItem =
  ref(null)

const transactions =
  ref([])

const isLoadingTransactions =
  ref(false)

const transactionError =
  ref('')

/*
|--------------------------------------------------------------------------
| Menu Stock Modal
|--------------------------------------------------------------------------
*/

const showMenuStockModal =
  ref(false)

const selectedMenu =
  ref(null)

const menuStockToAdd =
  ref('')

const isSavingMenuStock =
  ref(false)

const menuStockError =
  ref('')

/*
|--------------------------------------------------------------------------
| Computed
|--------------------------------------------------------------------------
*/

const filteredInventoryItems =
  computed(() => {
    const search =
      inventorySearch.value
        .trim()
        .toLowerCase()

    return inventoryItems.value
      .filter(item => {
        if (
          inventoryCategory.value !==
          'All'
        ) {
          return (
            item.category ===
            inventoryCategory.value
          )
        }

        return true
      })
      .filter(item => {
        if (
          !showLowStockOnly.value
        ) {
          return true
        }

        return (
          Number(
            item.currentStock || 0
          ) <=
          Number(
            item.minimumStock || 0
          )
        )
      })
      .filter(item => {
        if (!search) {
          return true
        }

        return String(
          item.name || ''
        )
          .toLowerCase()
          .includes(search)
      })
  })

const filteredMenuItems =
  computed(() => {
    const search =
      menuSearch.value
        .trim()
        .toLowerCase()

    if (!search) {
      return menuItems.value
    }

    return menuItems.value.filter(
      item => {
        const name =
          String(
            item.name || ''
          ).toLowerCase()

        const category =
          String(
            item.category?.name || ''
          ).toLowerCase()

        return (
          name.includes(search) ||
          category.includes(search)
        )
      }
    )
  })

const totalInventoryItems =
  computed(() => {
    return inventoryItems.value.length
  })

const lowStockCount =
  computed(() => {
    return inventoryItems.value
      .filter(
        item =>
          Number(
            item.currentStock || 0
          ) <=
          Number(
            item.minimumStock || 0
          )
      )
      .length
  })

const totalInventoryValue =
  computed(() => {
    return inventoryItems.value.reduce(
      (total, item) => {
        return (
          total +
          Number(
            item.stockValue || 0
          )
        )
      },
      0
    )
  })

const movementTitle =
  computed(() => {
    if (
      movementType.value ===
      'Stock In'
    ) {
      return 'Stock In'
    }

    if (
      movementType.value ===
      'Stock Out'
    ) {
      return 'Stock Out'
    }

    if (
      movementType.value ===
      'Adjustment'
    ) {
      return 'Inventory Adjustment'
    }

    return 'Wastage'
  })

const movementButtonText =
  computed(() => {
    if (
      isSavingMovement.value
    ) {
      return 'Saving...'
    }

    if (
      movementType.value ===
      'Stock In'
    ) {
      return 'Save Stock In'
    }

    if (
      movementType.value ===
      'Stock Out'
    ) {
      return 'Save Stock Out'
    }

    if (
      movementType.value ===
      'Adjustment'
    ) {
      return 'Save Adjustment'
    }

    return 'Save Wastage'
  })

/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
*/

const formatCurrency =
  value => {
    return Number(
      value || 0
    ).toLocaleString(
      'en-PH',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )
  }

const formatNumber =
  value => {
    const number =
      Number(value || 0)

    return number.toLocaleString(
      'en-US',
      {
        maximumFractionDigits: 3
      }
    )
  }

const formatDateTime =
  value => {
    if (!value) {
      return '-'
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-'
    }

    return date.toLocaleString(
      'en-PH',
      {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    )
  }

  const getTransactionReference =
    transaction => {
      const referenceType =
        transaction?.referenceType

      if (!referenceType) {
        return '-'
      }

      if (
        referenceType === 'Order'
      ) {
        const referenceId =
          String(
            transaction.referenceId || ''
          )

        if (!referenceId) {
          return 'Order'
        }

        return `Order • ${referenceId.slice(-6).toUpperCase()}`
      }

      if (
        referenceType === 'Expense'
      ) {
        return 'Expense'
      }

      if (
        referenceType === 'System'
      ) {
        return 'System'
      }

      return 'Manual'
    }

  const getTransactionTypeClass =
    transaction => {
      const type =
        transaction?.transactionType

      if (
        type === 'Sale'
      ) {
        return 'bg-blue-100 text-blue-700'
      }

      if (
        type === 'Void'
      ) {
        return 'bg-emerald-100 text-emerald-700'
      }

      if (
        type === 'Stock In'
      ) {
        return 'bg-green-100 text-green-700'
      }

      if (
        type === 'Stock Out'
      ) {
        return 'bg-orange-100 text-orange-700'
      }

      if (
        type === 'Adjustment'
      ) {
        return 'bg-purple-100 text-purple-700'
      }

      if (
        type === 'Wastage'
      ) {
        return 'bg-red-100 text-red-700'
      }

      return 'bg-gray-100 text-gray-700'
    }

/*
|--------------------------------------------------------------------------
| Inventory Fetch
|--------------------------------------------------------------------------
*/

const fetchInventory =
  async () => {
    try {
      isLoadingInventory.value =
        true

      inventoryError.value =
        ''

      const res =
        await axios.get(
          `${API}/inventory`,
          {
            headers:
              getAuthHeaders()
          }
        )

      inventoryItems.value =
        Array.isArray(
          res.data
        )
          ? res.data
          : []

    } catch (error) {
      console.error(
        'fetchInventory error:',
        error
      )

      inventoryError.value =
        error.response?.data
          ?.message ||
        'Failed to load inventory.'
    } finally {
      isLoadingInventory.value =
        false
    }
  }

/*
|--------------------------------------------------------------------------
| Menu Fetch
|--------------------------------------------------------------------------
*/

const fetchMenus =
  async () => {
    try {
      isLoadingMenus.value =
        true

      menuError.value =
        ''

      const res =
        await axios.get(
          `${API}/menus`,
          {
            headers:
              getAuthHeaders()
          }
        )

      menuItems.value =
        Array.isArray(
          res.data
        )
          ? res.data
          : []

    } catch (error) {
      console.error(
        'fetchMenus error:',
        error
      )

      menuError.value =
        error.response?.data
          ?.message ||
        'Failed to load menu stock.'
    } finally {
      isLoadingMenus.value =
        false
    }
  }

/*
|--------------------------------------------------------------------------
| Refresh
|--------------------------------------------------------------------------
*/

const refreshCurrentTab =
  async () => {
    if (
      activeTab.value ===
      'inventory'
    ) {
      await fetchInventory()
      return
    }

    await fetchMenus()
  }

/*
|--------------------------------------------------------------------------
| Movement Modal
|--------------------------------------------------------------------------
*/

const openMovementModal =
  (
    type,
    item
  ) => {
    selectedInventoryItem.value =
      item

    movementType.value =
      type

    movementForm.value = {
      quantity: '',
      unit:
        item.unit || '',
      unitCost:
        type === 'Stock In'
          ? (
              item.unitCost ||
              ''
            )
          : item.unitCost || '',
      reason:
        type === 'Stock In'
          ? 'Purchase'
          : type === 'Stock Out'
            ? 'Manual Stock Out'
            : type === 'Adjustment'
              ? 'Inventory Adjustment'
              : 'Wastage',
      remarks: ''
    }

    movementError.value =
      ''

    showMovementModal.value =
      true
  }

const closeMovementModal =
  (
    force = false
  ) => {
    if (
      isSavingMovement.value &&
      !force
    ) {
      return
    }

    showMovementModal.value =
      false

    selectedInventoryItem.value =
      null

    movementError.value =
      ''
  }

/*
|--------------------------------------------------------------------------
| Save Movement
|--------------------------------------------------------------------------
*/

const saveMovement =
  async () => {
    const item =
      selectedInventoryItem.value

    if (!item) {
      return
    }

    const rawQuantity =
      String(
        movementForm.value.quantity ?? ''
      ).trim()

    const quantity =
      Number(rawQuantity)

    if (
      movementType.value !==
        'Adjustment' &&
      (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      )
    ) {
      movementError.value =
        'Maglagay ng quantity na greater than zero.'

      return
    }

    if (
      movementType.value ===
        'Adjustment' &&
      (
        !Number.isFinite(
          quantity
        ) ||
        quantity === 0
      )
    ) {
      movementError.value =
        'Ang adjustment quantity ay hindi puwedeng zero.'

      return
    }

    if (
      !movementForm.value.unit.trim()
    ) {
      movementError.value =
        'Required ang unit.'

      return
    }

    if (
      movementType.value ===
        'Stock In' &&
      (
        movementForm.value.unitCost === '' ||
        Number(
          movementForm.value.unitCost
        ) < 0
      )
    ) {
      movementError.value =
        'Maglagay ng valid unit cost.'

      return
    }

    try {
      isSavingMovement.value =
        true

      movementError.value =
        ''

      const payload = {
        quantity,
        unit:
          movementForm.value.unit
            .trim(),
        unitCost:
          Number(
            movementForm.value.unitCost ||
            0
          ),
        reason:
          movementForm.value.reason
            .trim(),
        remarks:
          movementForm.value.remarks
            .trim()
      }

      let endpoint =
        ''

      if (
        movementType.value ===
        'Stock In'
      ) {
        endpoint =
          `${API}/inventory/${item._id}/stock-in`
      } else if (
        movementType.value ===
        'Stock Out'
      ) {
        endpoint =
          `${API}/inventory/${item._id}/stock-out`
      } else if (
        movementType.value ===
        'Adjustment'
      ) {
        endpoint =
          `${API}/inventory/${item._id}/adjustment`
      } else {
        endpoint =
          `${API}/inventory/${item._id}/wastage`
      }

      await axios.post(
        endpoint,
        payload,
        {
          headers:
            getAuthHeaders()
        }
      )

      inventorySuccess.value =
        `${item.name} inventory updated successfully.`

      closeMovementModal(true)

      await fetchInventory()

      window.setTimeout(
        () => {
          inventorySuccess.value =
            ''
        },
        3000
      )

    } catch (error) {
      console.error(
        'saveMovement error:',
        error
      )

      movementError.value =
        error.response?.data
          ?.message ||
        'Failed to save inventory movement.'
    } finally {
      isSavingMovement.value =
        false
    }
  }

/*
|--------------------------------------------------------------------------
| Inventory Settings
|--------------------------------------------------------------------------
*/

const openSettingsModal =
  item => {
    selectedSettingsItem.value =
      item

    settingsForm.value = {
      unit:
        item.unit || '',
      minimumStock:
        Number(
          item.minimumStock || 0
        ),
      isActive:
        item.isActive !== false
    }

    settingsError.value =
      ''

    showSettingsModal.value =
      true
  }

const closeSettingsModal =
  (
    force = false
  ) => {
    if (
      isSavingSettings.value &&
      !force
    ) {
      return
    }

    showSettingsModal.value =
      false

    selectedSettingsItem.value =
      null

    settingsError.value =
      ''
  }

const saveInventorySettings =
  async () => {
    const item =
      selectedSettingsItem.value

    if (!item) {
      return
    }

    const minimumStock =
      Number(
        settingsForm.value
          .minimumStock
      )

    if (
      !Number.isFinite(
        minimumStock
      ) ||
      minimumStock < 0
    ) {
      settingsError.value =
        'Minimum stock must be zero or greater.'

      return
    }

    if (
      !settingsForm.value.unit.trim()
    ) {
      settingsError.value =
        'Required ang unit.'

      return
    }

    try {
      isSavingSettings.value =
        true

      settingsError.value =
        ''

      await axios.put(
        `${API}/inventory/${item._id}/settings`,
        {
          unit:
            settingsForm.value.unit
              .trim(),
          minimumStock,
          isActive:
            settingsForm.value.isActive
        },
        {
          headers:
            getAuthHeaders()
        }
      )

      inventorySuccess.value =
        `${item.name} settings updated successfully.`

      closeSettingsModal(true)

      await fetchInventory()

      window.setTimeout(
        () => {
          inventorySuccess.value =
            ''
        },
        3000
      )

    } catch (error) {
      console.error(
        'saveInventorySettings error:',
        error
      )

      settingsError.value =
        error.response?.data
          ?.message ||
        'Failed to update inventory settings.'
    } finally {
      isSavingSettings.value =
        false
    }
  }

/*
|--------------------------------------------------------------------------
| Transaction History
|--------------------------------------------------------------------------
*/

const openHistoryModal =
  async item => {
    historyItem.value =
      item

    transactions.value =
      []

    transactionError.value =
      ''

    showHistoryModal.value =
      true

    try {
      isLoadingTransactions.value =
        true

      const res =
        await axios.get(
          `${API}/inventory/transactions`,
          {
            params: {
              expenseItem:
                item._id,
              limit: 100
            },
            headers:
              getAuthHeaders()
          }
        )

      transactions.value =
        Array.isArray(
          res.data
        )
          ? res.data
          : []

    } catch (error) {
      console.error(
        'openHistoryModal error:',
        error
      )

      transactionError.value =
        error.response?.data
          ?.message ||
        'Failed to load transaction history.'
    } finally {
      isLoadingTransactions.value =
        false
    }
  }

const closeHistoryModal =
  () => {
    showHistoryModal.value =
      false

    historyItem.value =
      null

    transactions.value =
      []

    transactionError.value =
      ''
  }

/*
|--------------------------------------------------------------------------
| Menu Stock
|--------------------------------------------------------------------------
*/

const openMenuStockModal =
  menu => {
    selectedMenu.value =
      menu

    menuStockToAdd.value =
      ''

    menuStockError.value =
      ''

    showMenuStockModal.value =
      true
  }

const closeMenuStockModal =
  (
    force = false
  ) => {
    if (
      isSavingMenuStock.value &&
      !force
    ) {
      return
    }

    showMenuStockModal.value =
      false

    selectedMenu.value =
      null

    menuStockError.value =
      ''
  }

/*
|--------------------------------------------------------------------------
| Toggle Menu Stock Monitoring
|--------------------------------------------------------------------------
*/

const toggleMenuStockMonitoring =
  async menu => {
    if (
      savingMenuMonitoringId.value
    ) {
      return
    }

    const newValue =
      menu.stockMonitoring !== true

    try {
      savingMenuMonitoringId.value =
        menu._id

      menuError.value =
        ''

      await axios.put(
        `${API}/menus/${menu._id}`,
        {
          stockMonitoring:
            newValue
        },
        {
          headers:
            getAuthHeaders()
        }
      )

      menuSuccess.value =
        newValue
          ? `${menu.name} is now monitored by stock.`
          : `${menu.name} is no longer monitored by stock.`

      await fetchMenus()

      window.setTimeout(
        () => {
          menuSuccess.value =
            ''
        },
        3000
      )

    } catch (error) {
      console.error(
        'toggleMenuStockMonitoring error:',
        error
      )

      menuError.value =
        error.response?.data
          ?.message ||
        'Failed to update menu stock monitoring.'
    } finally {
      savingMenuMonitoringId.value =
        null
    }
  }

const saveMenuStock =
  async () => {
    const menu =
      selectedMenu.value

    if (!menu) {
      return
    }

    const quantity =
      Number(
        menuStockToAdd.value
      )

    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0
    ) {
      menuStockError.value =
        'Maglagay ng whole number greater than zero.'

      return
    }

    try {
      isSavingMenuStock.value =
        true

      menuStockError.value =
        ''

      const newStock =
        Number(
          menu.stock || 0
        ) +
        quantity

      await axios.put(
        `${API}/menus/${menu._id}`,
        {
          stock:
            newStock
        },
        {
          headers:
            getAuthHeaders()
        }
      )

      menuSuccess.value =
        `${menu.name} stock updated successfully.`

      closeMenuStockModal(true)

      menuError.value =
        ''

      await fetchMenus()

      window.setTimeout(
        () => {
          menuSuccess.value =
            ''
        },
        3000
      )

    } catch (error) {
      console.error(
        'saveMenuStock error:',
        error
      )

      menuStockError.value =
        error.response?.data
          ?.message ||
        'Failed to update menu stock.'
    } finally {
      isSavingMenuStock.value =
        false
    }
  }

/*
|--------------------------------------------------------------------------
| Menu Stock Status
|--------------------------------------------------------------------------
*/

const menuStockStatusClass =
  menu => {
    const isMonitoring =
      menu.stockMonitoring === true

    const stock =
      Number(
        menu.stock || 0
      )

    if (!isMonitoring) {
      return 'bg-gray-100 text-gray-600'
    }

    if (stock <= 0) {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-emerald-100 text-emerald-700'
  }

const menuStockStatusLabel =
  menu => {
    const isMonitoring =
      menu.stockMonitoring === true

    const stock =
      Number(
        menu.stock || 0
      )

    if (!isMonitoring) {
      return 'Not Monitored'
    }

    if (stock <= 0) {
      return 'Out of Stock'
    }

    return 'In Stock'
  }

/*
|--------------------------------------------------------------------------
| Inventory Status
|--------------------------------------------------------------------------
*/

const inventoryStatusClass =
  item => {
    const stock =
      Number(
        item.currentStock || 0
      )

    const minimum =
      Number(
        item.minimumStock || 0
      )

    if (
      stock <= minimum
    ) {
      return 'bg-red-100 text-red-700'
    }

    if (
      stock <=
      minimum * 2 &&
      minimum > 0
    ) {
      return 'bg-amber-100 text-amber-700'
    }

    return 'bg-emerald-100 text-emerald-700'
  }

const inventoryStatusLabel =
  item => {
    const stock =
      Number(
        item.currentStock || 0
      )

    const minimum =
      Number(
        item.minimumStock || 0
      )

    if (
      stock <= minimum
    ) {
      return 'Low Stock'
    }

    if (
      stock <=
      minimum * 2 &&
      minimum > 0
    ) {
      return 'Near Minimum'
    }

    return 'In Stock'
  }

/*
|--------------------------------------------------------------------------
| Initial Load
|--------------------------------------------------------------------------
*/

onMounted(
  async () => {
    await Promise.all([
      fetchInventory(),
      fetchMenus()
    ])
  }
)
</script>

<template>
  <div
    class="h-full overflow-y-auto bg-gray-50"
  >
    <div
      class="max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
    >
      <!-- ========================================================= -->
      <!-- HEADER -->
      <!-- ========================================================= -->

      <div
        class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6"
      >
        <div>
          <div
            class="flex items-center gap-3"
          >
            <div
              class="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm"
            >
              📦
            </div>

            <div>
              <h1
                class="text-2xl md:text-3xl font-black text-gray-900"
              >
                Inventory Management
              </h1>

              <p
                class="text-sm md:text-base text-gray-500"
              >
                Ingredients, materials at menu stock
              </p>
            </div>
          </div>
        </div>

        <button
          @click="refreshCurrentTab"
          class="w-full md:w-auto px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition shadow-sm"
        >
          ↻ Refresh
        </button>
      </div>

      <!-- ========================================================= -->
      <!-- SUMMARY CARDS -->
      <!-- ========================================================= -->

      <div
        v-if="activeTab === 'inventory'"
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6"
      >
        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >
          <div
            class="text-xs uppercase tracking-wider font-bold text-gray-400"
          >
            Inventory Items
          </div>

          <div
            class="mt-2 text-3xl font-black text-gray-900"
          >
            {{ totalInventoryItems }}
          </div>

          <div
            class="mt-1 text-sm text-gray-500"
          >
            Ingredients & Materials
          </div>
        </div>

        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >
          <div
            class="text-xs uppercase tracking-wider font-bold text-gray-400"
          >
            Low Stock
          </div>

          <div
            class="mt-2 text-3xl font-black text-red-600"
          >
            {{ lowStockCount }}
          </div>

          <div
            class="mt-1 text-sm text-gray-500"
          >
            Items at or below minimum
          </div>
        </div>

        <div
          class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm sm:col-span-2 xl:col-span-1"
        >
          <div
            class="text-xs uppercase tracking-wider font-bold text-gray-400"
          >
            Current Inventory Value
          </div>

          <div
            class="mt-2 text-3xl font-black text-blue-600"
          >
            ₱{{ formatCurrency(totalInventoryValue) }}
          </div>

          <div
            class="mt-1 text-sm text-gray-500"
          >
            Based on latest unit cost
          </div>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- TABS -->
      <!-- ========================================================= -->

      <div
        class="bg-white border border-gray-200 rounded-2xl p-2 shadow-sm mb-6"
      >
        <div
          class="grid grid-cols-2 gap-2"
        >
          <button
            @click="activeTab = 'inventory'"
            :class="[
              'py-3 px-4 rounded-xl font-bold transition',
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            📦 Ingredients & Materials
          </button>

          <button
            @click="activeTab = 'menu'"
            :class="[
              'py-3 px-4 rounded-xl font-bold transition',
              activeTab === 'menu'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            🍽️ Menu Stock
          </button>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- INVENTORY SUCCESS -->
      <!-- ========================================================= -->

      <div
        v-if="
          activeTab === 'inventory' &&
          inventorySuccess
        "
        class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold"
      >
        {{ inventorySuccess }}
      </div>

      <!-- ========================================================= -->
      <!-- MENU SUCCESS -->
      <!-- ========================================================= -->

      <div
        v-if="
          activeTab === 'menu' &&
          menuSuccess
        "
        class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold"
      >
        {{ menuSuccess }}
      </div>

      <!-- ========================================================= -->
      <!-- INVENTORY TAB -->
      <!-- ========================================================= -->

      <div
        v-if="activeTab === 'inventory'"
      >
        <!-- Filters -->

        <div
          class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-5"
        >
          <div
            class="grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <div
              class="md:col-span-2"
            >
              <label
                class="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1"
              >
                Search
              </label>

              <input
                v-model="inventorySearch"
                type="text"
                placeholder="Search ingredient or material..."
                class="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                class="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1"
              >
                Category
              </label>

              <select
                v-model="inventoryCategory"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">
                  All
                </option>

                <option value="Ingredient">
                  Ingredient
                </option>

                <option value="Material">
                  Material
                </option>
              </select>
            </div>

            <div
              class="flex items-end"
            >
              <label
                class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50"
              >
                <input
                  v-model="showLowStockOnly"
                  type="checkbox"
                  class="w-5 h-5"
                />

                <span
                  class="font-bold text-gray-700"
                >
                  Low Stock Only
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- Error -->

        <div
          v-if="inventoryError"
          class="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold"
        >
          {{ inventoryError }}
        </div>

        <!-- Table -->

        <div
          class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div
            class="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
          >
            <div>
              <h2
                class="text-lg font-black text-gray-900"
              >
                Inventory Items
              </h2>

              <p
                class="text-sm text-gray-500"
              >
                Actual stock ng ingredients at materials
              </p>
            </div>

            <div
              class="text-sm font-bold text-gray-500"
            >
              {{ filteredInventoryItems.length }} item(s)
            </div>
          </div>

          <div
            v-if="isLoadingInventory"
            class="p-12 text-center text-gray-500"
          >
            <div
              class="text-3xl mb-3"
            >
              ⏳
            </div>

            Loading inventory...
          </div>

          <div
            v-else-if="filteredInventoryItems.length === 0"
            class="p-12 text-center text-gray-500"
          >
            <div
              class="text-4xl mb-3"
            >
              📦
            </div>

            <div
              class="font-bold text-gray-700"
            >
              No inventory items found.
            </div>

            <div
              class="text-sm mt-1"
            >
              Ingredient at Material expense masters will appear here.
            </div>
          </div>

          <div
            v-else
            class="overflow-x-auto"
          >
            <table
              class="w-full min-w-[1050px] text-left"
            >
              <thead>
                <tr
                  class="bg-gray-50 border-b border-gray-200"
                >
                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Item
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Category
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-right"
                  >
                    Current Stock
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-right"
                  >
                    Minimum
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-right"
                  >
                    Unit Cost
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-right"
                  >
                    Stock Value
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-center"
                  >
                    Status
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-center"
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="item in filteredInventoryItems"
                  :key="item._id"
                  class="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td
                    class="px-5 py-4"
                  >
                    <div
                      class="font-black text-gray-900"
                    >
                      {{ item.name }}
                    </div>

                    <div
                      class="text-xs text-gray-400 mt-1"
                    >
                      {{ item.isActive ? 'Active' : 'Inactive' }}
                    </div>
                  </td>

                  <td
                    class="px-5 py-4"
                  >
                    <span
                      :class="[
                        'inline-flex px-3 py-1 rounded-full text-xs font-bold',
                        item.category === 'Ingredient'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      ]"
                    >
                      {{ item.category }}
                    </span>
                  </td>

                  <td
                    class="px-5 py-4 text-right"
                  >
                    <div
                      class="font-black text-gray-900"
                    >
                      {{ formatNumber(item.currentStock) }}
                      {{ item.unit || 'pcs' }}
                    </div>
                  </td>

                  <td
                    class="px-5 py-4 text-right text-gray-500 font-semibold"
                  >
                    {{ formatNumber(item.minimumStock) }}
                    {{ item.unit || 'pcs' }}
                  </td>

                  <td
                    class="px-5 py-4 text-right"
                  >
                    <span
                      class="font-bold text-gray-800"
                    >
                      ₱{{ formatCurrency(item.unitCost) }}
                    </span>
                  </td>

                  <td
                    class="px-5 py-4 text-right"
                  >
                    <span
                      class="font-black text-blue-600"
                    >
                      ₱{{ formatCurrency(item.stockValue) }}
                    </span>
                  </td>

                  <td
                    class="px-5 py-4 text-center"
                  >
                    <span
                      :class="[
                        'inline-flex px-3 py-1.5 rounded-full text-xs font-black',
                        inventoryStatusClass(item)
                      ]"
                    >
                      {{ inventoryStatusLabel(item) }}
                    </span>
                  </td>

                  <td
                    class="px-5 py-4"
                  >
                    <div
                      class="flex justify-center gap-2"
                    >
                      <button
                        @click="openMovementModal('Stock In', item)"
                        class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                      >
                        + In
                      </button>

                      <button
                        @click="openMovementModal('Stock Out', item)"
                        class="px-3 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600"
                      >
                        - Out
                      </button>

                      <button
                        @click="openMovementModal('Adjustment', item)"
                        class="px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
                      >
                        Adjust
                      </button>

                      <button
                        @click="openMovementModal('Wastage', item)"
                        class="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                      >
                        Waste
                      </button>

                      <button
                        @click="openHistoryModal(item)"
                        class="px-3 py-2 rounded-lg bg-gray-700 text-white text-xs font-bold hover:bg-gray-800"
                      >
                        History
                      </button>

                      <button
                        @click="openSettingsModal(item)"
                        class="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold hover:bg-gray-200"
                      >
                        Settings
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- MENU STOCK TAB -->
      <!-- ========================================================= -->

      <div
        v-else
      >
        <div
          class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-5"
        >
          <div
            class="flex flex-col md:flex-row gap-3 md:items-end md:justify-between"
          >
            <div
              class="flex-1"
            >
              <label
                class="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1"
              >
                Search Menu
              </label>

              <input
                v-model="menuSearch"
                type="text"
                placeholder="Search menu item or category..."
                class="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div
              class="text-sm font-bold text-gray-500"
            >
              {{ filteredMenuItems.length }} menu item(s)
            </div>
          </div>
        </div>

        <div
          v-if="menuError"
          class="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold"
        >
          {{ menuError }}
        </div>

        <div
          class="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5"
        >
          <div
            class="font-black text-blue-900"
          >
            Stock Monitoring
          </div>

          <div
            class="text-sm text-blue-800 mt-1"
          >
            By default, hindi monitored ang menu. I-ON lang ang monitoring para sa menu na gusto mong maubusan ng stock at maging Out of Stock kapag zero na.
          </div>
        </div>

        <div
          class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div
            class="px-5 py-4 border-b border-gray-200"
          >
            <h2
              class="text-lg font-black text-gray-900"
            >
              Finished Menu Stock
            </h2>

            <p
              class="text-sm text-gray-500"
            >
              Ito ang serving/item stock na ginagamit ng POS.
            </p>
          </div>

          <div
            v-if="isLoadingMenus"
            class="p-12 text-center text-gray-500"
          >
            <div
              class="text-3xl mb-3"
            >
              ⏳
            </div>

            Loading menu stock...
          </div>

          <div
            v-else-if="filteredMenuItems.length === 0"
            class="p-12 text-center text-gray-500"
          >
            <div
              class="text-4xl mb-3"
            >
              🍽️
            </div>

            <div
              class="font-bold text-gray-700"
            >
              No menu items found.
            </div>
          </div>

          <div
            v-else
            class="overflow-x-auto"
          >
            <table
              class="w-full min-w-[1150px] text-left"
            >
              <thead>
                <tr
                  class="bg-gray-50 border-b border-gray-200"
                >
                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Menu Item
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Category
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-right"
                  >
                    Price
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-center"
                  >
                    Current Stock
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-center"
                  >
                    Monitoring
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-center"
                  >
                    Stock Status
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-center"
                  >
                    POS
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-center"
                  >
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="item in filteredMenuItems"
                  :key="item._id"
                  class="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td
                    class="px-5 py-4"
                  >
                    <div
                      class="font-black text-gray-900"
                    >
                      {{ item.name }}
                    </div>
                  </td>

                  <td
                    class="px-5 py-4 text-gray-600"
                  >
                    {{ item.category?.name || 'Uncategorized' }}
                  </td>

                  <td
                    class="px-5 py-4 text-right"
                  >
                    <span
                      class="font-black text-blue-600"
                    >
                      ₱{{ formatCurrency(item.price) }}
                    </span>
                  </td>

                  <td
                    class="px-5 py-4 text-center"
                  >
                    <span
                      :class="[
                        'inline-flex px-3 py-1.5 rounded-full text-xs font-black',
                        item.stockMonitoring === true
                          ? Number(item.stock || 0) <= 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      ]"
                    >
                      {{ formatNumber(item.stock) }} pcs
                    </span>
                  </td>

                  <td
                    class="px-5 py-4 text-center"
                  >
                    <button
                      type="button"
                      @click="toggleMenuStockMonitoring(item)"
                      :disabled="
                        savingMenuMonitoringId === item._id
                      "
                      :class="[
                        'relative inline-flex h-8 w-14 items-center rounded-full transition disabled:opacity-50 disabled:cursor-wait',
                        item.stockMonitoring === true
                          ? 'bg-blue-600'
                          : 'bg-gray-300'
                      ]"
                      :title="
                        item.stockMonitoring === true
                          ? 'Turn stock monitoring OFF'
                          : 'Turn stock monitoring ON'
                      "
                    >
                      <span
                        :class="[
                          'inline-block h-6 w-6 transform rounded-full bg-white shadow transition',
                          item.stockMonitoring === true
                            ? 'translate-x-7'
                            : 'translate-x-1'
                        ]"
                      ></span>
                    </button>

                    <div
                      class="mt-1 text-xs font-bold"
                      :class="
                        item.stockMonitoring === true
                          ? 'text-blue-700'
                          : 'text-gray-500'
                      "
                    >
                      {{
                        item.stockMonitoring === true
                          ? 'ON'
                          : 'OFF'
                      }}
                    </div>
                  </td>

                  <td
                    class="px-5 py-4 text-center"
                  >
                    <span
                      :class="[
                        'inline-flex px-3 py-1.5 rounded-full text-xs font-black',
                        menuStockStatusClass(item)
                      ]"
                    >
                      {{ menuStockStatusLabel(item) }}
                    </span>
                  </td>

                  <td
                    class="px-5 py-4 text-center"
                  >
                    <span
                      :class="[
                        'inline-flex px-3 py-1 rounded-full text-xs font-bold',
                        item.isAvailable
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      ]"
                    >
                      {{
                        item.isAvailable
                          ? 'Available'
                          : 'Unavailable'
                      }}
                    </span>
                  </td>

                  <td
                    class="px-5 py-4 text-center"
                  >
                    <button
                      @click="openMenuStockModal(item)"
                      class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
                    >
                      + Add Stock
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- MOVEMENT MODAL -->
    <!-- ========================================================= -->

    <div
      v-if="showMovementModal"
      class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    >
      <div
        class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
      >
        <div
          :class="[
            'px-6 py-5 text-white',
            movementType === 'Stock In'
              ? 'bg-emerald-600'
              : movementType === 'Stock Out'
                ? 'bg-orange-500'
                : movementType === 'Adjustment'
                  ? 'bg-purple-600'
                  : 'bg-red-600'
          ]"
        >
          <div
            class="flex items-center justify-between"
          >
            <div>
              <h2
                class="text-xl font-black"
              >
                {{ movementTitle }}
              </h2>

              <p
                class="text-white/80 text-sm mt-1"
              >
                {{ selectedInventoryItem?.name }}
              </p>
            </div>

            <button
              @click="closeMovementModal"
              class="text-white/80 hover:text-white text-3xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <form
          @submit.prevent="saveMovement"
          class="p-6 space-y-4"
        >
          <div
            class="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200"
          >
            <div>
              <div
                class="text-xs font-bold uppercase text-gray-400"
              >
                Current Stock
              </div>

              <div
                class="mt-1 text-xl font-black text-gray-900"
              >
                {{ formatNumber(selectedInventoryItem?.currentStock) }}
                {{ selectedInventoryItem?.unit || 'pcs' }}
              </div>
            </div>

            <div>
              <div
                class="text-xs font-bold uppercase text-gray-400"
              >
                Unit Cost
              </div>

              <div
                class="mt-1 text-xl font-black text-blue-600"
              >
                ₱{{ formatCurrency(selectedInventoryItem?.unitCost) }}
              </div>
            </div>
          </div>

          <div
            v-if="movementError"
            class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold"
          >
            {{ movementError }}
          </div>

          <div>
            <label
              class="block text-sm font-bold text-gray-700 mb-1"
            >
              Quantity
            </label>

            <input
              v-model="movementForm.quantity"
              type="number"
              :min="movementType === 'Adjustment' ? undefined : 0"
              step="0.001"
              inputmode="decimal"
              autofocus
              class="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />

            <p
              v-if="movementType === 'Adjustment'"
              class="mt-1 text-xs text-gray-500"
            >
              Halimbawa: <strong>5</strong> o <strong>+5</strong> = dagdag stock.
              <strong>-5</strong> = bawas stock.
            </p>
          </div>

          <div
            class="grid grid-cols-2 gap-3"
          >
            <div>
              <label
                class="block text-sm font-bold text-gray-700 mb-1"
              >
                Unit
              </label>

              <input
                v-model="movementForm.unit"
                type="text"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="kg / pcs / liter"
              />
            </div>

            <div>
              <label
                class="block text-sm font-bold text-gray-700 mb-1"
              >
                Unit Cost
              </label>

              <input
                v-model="movementForm.unitCost"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                :disabled="movementType !== 'Stock In'"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label
              class="block text-sm font-bold text-gray-700 mb-1"
            >
              Reason
            </label>

            <input
              v-model="movementForm.reason"
              type="text"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reason..."
            />
          </div>

          <div>
            <label
              class="block text-sm font-bold text-gray-700 mb-1"
            >
              Remarks
            </label>

            <textarea
              v-model="movementForm.remarks"
              rows="3"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional remarks..."
            ></textarea>
          </div>

          <div
            class="flex gap-3 pt-2"
          >
            <button
              type="button"
              @click="closeMovementModal"
              class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="isSavingMovement"
              :class="[
                'flex-1 py-3 rounded-xl text-white font-bold disabled:bg-gray-300',
                movementType === 'Stock In'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : movementType === 'Stock Out'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : movementType === 'Adjustment'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-red-600 hover:bg-red-700'
              ]"
            >
              {{ movementButtonText }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- SETTINGS MODAL -->
    <!-- ========================================================= -->

    <div
      v-if="showSettingsModal"
      class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    >
      <div
        class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >
        <div
          class="bg-gray-800 text-white px-6 py-5 flex items-center justify-between"
        >
          <div>
            <h2
              class="text-xl font-black"
            >
              Inventory Settings
            </h2>

            <p
              class="text-white/70 text-sm mt-1"
            >
              {{ selectedSettingsItem?.name }}
            </p>
          </div>

          <button
            @click="closeSettingsModal"
            class="text-white/80 hover:text-white text-3xl"
          >
            &times;
          </button>
        </div>

        <form
          @submit.prevent="saveInventorySettings"
          class="p-6 space-y-4"
        >
          <div
            v-if="settingsError"
            class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold"
          >
            {{ settingsError }}
          </div>

          <div>
            <label
              class="block text-sm font-bold text-gray-700 mb-1"
            >
              Unit
            </label>

            <input
              v-model="settingsForm.unit"
              type="text"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              class="block text-sm font-bold text-gray-700 mb-1"
            >
              Minimum / Reorder Level
            </label>

            <input
              v-model="settingsForm.minimumStock"
              type="number"
              min="0"
              step="0.001"
              inputmode="decimal"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p
              class="text-xs text-gray-500 mt-1"
            >
              Mag-aalert ang inventory kapag current stock ay nasa o below this level.
            </p>
          </div>

          <label
            class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer"
          >
            <input
              v-model="settingsForm.isActive"
              type="checkbox"
              class="w-5 h-5"
            />

            <span
              class="font-bold text-gray-700"
            >
              Active inventory item
            </span>
          </label>

          <div
            class="flex gap-3 pt-2"
          >
            <button
              type="button"
              @click="closeSettingsModal"
              class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="isSavingSettings"
              class="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-gray-300"
            >
              {{
                isSavingSettings
                  ? 'Saving...'
                  : 'Save Settings'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- HISTORY MODAL -->
    <!-- ========================================================= -->

    <!-- ========================================================= -->
    <!-- HISTORY MODAL -->
    <!-- ========================================================= -->

    <div
      v-if="showHistoryModal"
      class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    >
      <div
        class="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >

        <!-- Header -->
        <div
          class="bg-gray-800 text-white px-6 py-5 flex items-center justify-between shrink-0"
        >
          <div>
            <h2
              class="text-xl font-black"
            >
              Inventory History
            </h2>

            <p
              class="text-white/70 text-sm mt-1"
            >
              {{ historyItem?.name }}
            </p>
          </div>

          <button
            type="button"
            @click="closeHistoryModal"
            class="text-white/80 hover:text-white text-3xl leading-none"
          >
            &times;
          </button>
        </div>

        <!-- Body -->
        <div
          class="flex-1 min-h-0 overflow-y-auto"
        >

          <!-- Error -->
          <div
            v-if="transactionError"
            class="m-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold"
          >
            {{ transactionError }}
          </div>

          <!-- Loading -->
          <div
            v-if="isLoadingTransactions"
            class="p-12 text-center text-gray-500"
          >
            <div
              class="text-3xl mb-3"
            >
              ⏳
            </div>

            Loading transaction history...
          </div>

          <!-- Empty -->
          <div
            v-else-if="transactions.length === 0"
            class="p-12 text-center text-gray-500"
          >
            <div
              class="text-4xl mb-3"
            >
              🧾
            </div>

            <div
              class="font-bold text-gray-700"
            >
              No inventory transactions found.
            </div>

            <div
              class="text-sm mt-1"
            >
              Kapag may purchase, sale, void, adjustment o wastage,
              lalabas dito ang movement.
            </div>
          </div>

          <!-- Transactions -->
          <div
            v-else
            class="overflow-x-auto"
          >
            <table
              class="w-full min-w-[1150px] text-left"
            >

              <thead
                class="bg-gray-50 border-b border-gray-200 sticky top-0 z-10"
              >
                <tr>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Date / Time
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Movement
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Reference
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-right"
                  >
                    Quantity
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-right"
                  >
                    Unit Cost
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500 text-right"
                  >
                    Balance
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Reason / Remarks
                  </th>

                  <th
                    class="px-5 py-4 text-xs uppercase tracking-wide font-black text-gray-500"
                  >
                    Performed By
                  </th>

                </tr>
              </thead>

              <tbody>

                <tr
                  v-for="transaction in transactions"
                  :key="transaction._id"
                  class="border-b border-gray-100 hover:bg-gray-50 transition"
                >

                  <!-- Date -->
                  <td
                    class="px-5 py-4 text-sm text-gray-600 whitespace-nowrap"
                  >
                    {{ formatDateTime(transaction.createdAt) }}
                  </td>

                  <!-- Movement -->
                  <td
                    class="px-5 py-4"
                  >
                    <div
                      class="flex flex-col items-start gap-1"
                    >

                      <span
                        :class="[
                          'inline-flex px-3 py-1.5 rounded-full text-xs font-black',
                          getTransactionTypeClass(transaction)
                        ]"
                      >
                        {{ transaction.transactionType }}
                      </span>

                      <span
                        :class="
                          transaction.direction === 'IN'
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        "
                        class="text-xs font-black"
                      >
                        {{
                          transaction.direction === 'IN'
                            ? 'STOCK IN'
                            : 'STOCK OUT'
                        }}
                      </span>

                    </div>
                  </td>

                  <!-- Reference -->
                  <td
                    class="px-5 py-4"
                  >
                    <div
                      class="font-bold text-gray-800"
                    >
                      {{ getTransactionReference(transaction) }}
                    </div>

                    <div
                      v-if="transaction.referenceId"
                      class="text-xs text-gray-400 mt-1"
                    >
                      ID:
                      {{
                        String(
                          transaction.referenceId
                        ).slice(-12)
                      }}
                    </div>
                  </td>

                  <!-- Quantity -->
                  <td
                    class="px-5 py-4 text-right"
                  >

                    <div
                      :class="
                        transaction.direction === 'IN'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      "
                      class="font-black whitespace-nowrap"
                    >
                      {{
                        transaction.direction === 'IN'
                          ? '+'
                          : '-'
                      }}{{ formatNumber(transaction.quantity) }}
                      {{ transaction.unit || '' }}
                    </div>

                  </td>

                  <!-- Unit Cost -->
                  <td
                    class="px-5 py-4 text-right text-gray-700 whitespace-nowrap"
                  >
                    ₱{{ formatCurrency(transaction.unitCost) }}
                  </td>

                  <!-- Balance -->
                  <td
                    class="px-5 py-4 text-right"
                  >

                    <div
                      class="font-black text-gray-900 whitespace-nowrap"
                    >
                      {{ formatNumber(transaction.balanceAfter) }}
                      {{ transaction.unit || '' }}
                    </div>

                  </td>

                  <!-- Reason -->
                  <td
                    class="px-5 py-4"
                  >

                    <div
                      class="font-semibold text-gray-700"
                    >
                      {{ transaction.reason || '-' }}
                    </div>

                    <div
                      v-if="transaction.remarks"
                      class="text-xs text-gray-400 mt-1 max-w-[300px]"
                    >
                      {{ transaction.remarks }}
                    </div>

                  </td>

                  <!-- Performed By -->
                  <td
                    class="px-5 py-4 text-sm text-gray-600 whitespace-nowrap"
                  >
                    {{
                      transaction.performedBy?.username ||
                      'System'
                    }}
                  </td>

                </tr>

              </tbody>

            </table>
          </div>

        </div>

        <!-- Footer -->
        <div
          class="shrink-0 p-4 border-t border-gray-200 bg-gray-50"
        >
          <button
            type="button"
            @click="closeHistoryModal"
            class="w-full md:w-auto md:min-w-[160px] px-5 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-900"
          >
            Close
          </button>
        </div>

      </div>
    </div>

    <!-- ========================================================= -->
    <!-- MENU STOCK MODAL -->
    <!-- ========================================================= -->

    <div
      v-if="showMenuStockModal"
      class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    >
      <div
        class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >
        <div
          class="bg-emerald-600 text-white px-6 py-5 flex items-center justify-between"
        >
          <div>
            <h2
              class="text-xl font-black"
            >
              Add Menu Stock
            </h2>

            <p
              class="text-white/80 text-sm mt-1"
            >
              {{ selectedMenu?.name }}
            </p>
          </div>

          <button
            @click="closeMenuStockModal"
            class="text-white/80 hover:text-white text-3xl"
          >
            &times;
          </button>
        </div>

        <form
          @submit.prevent="saveMenuStock"
          class="p-6 space-y-4"
        >
          <div
            class="p-4 rounded-xl bg-gray-50 border border-gray-200"
          >
            <div
              class="text-xs uppercase font-bold text-gray-400"
            >
              Current Stock
            </div>

            <div
              class="text-3xl font-black text-gray-900 mt-1"
            >
              {{ formatNumber(selectedMenu?.stock) }} pcs
            </div>

            <div
              class="mt-2 text-sm font-bold"
              :class="
                selectedMenu?.stockMonitoring === true
                  ? 'text-blue-700'
                  : 'text-gray-500'
              "
            >
              {{
                selectedMenu?.stockMonitoring === true
                  ? 'Stock Monitoring: ON'
                  : 'Stock Monitoring: OFF'
              }}
            </div>
          </div>

          <div
            v-if="menuStockError"
            class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold"
          >
            {{ menuStockError }}
          </div>

          <div>
            <label
              class="block text-sm font-bold text-gray-700 mb-1"
            >
              Quantity to Add
            </label>

            <input
              v-model="menuStockToAdd"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              autofocus
              class="w-full px-4 py-4 text-xl font-bold border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="0"
            />
          </div>

          <div
            class="flex gap-3 pt-2"
          >
            <button
              type="button"
              @click="closeMenuStockModal"
              class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="isSavingMenuStock"
              class="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:bg-gray-300"
            >
              {{
                isSavingMenuStock
                  ? 'Saving...'
                  : 'Add Stock'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>