<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const orders = ref([])
const isLoading = ref(true)
const error = ref('')
const search = ref('')

const fetchOrders = async () => {
  try {
    isLoading.value = true
    error.value = ''

    const res = await axios.get('/api/orders')
    orders.value = res.data
  } catch (err) {
    console.error('Error fetching orders:', err)

    error.value =
      err.response?.data?.message ||
      'Hindi makuha ang active orders.'
  } finally {
    isLoading.value = false
  }
}

const updateStatus = async (order, status) => {
  try {
    await axios.put(
      `/api/orders/${order._id}/status`,
      { status }
    )

    await fetchOrders()
  } catch (err) {
    console.error('Error updating order status:', err)

    alert(
      err.response?.data?.message ||
      'Hindi ma-update ang order status.'
    )
  }
}

const releaseOrderNumber = async order => {
  if (!order.orderNumber) {
    return
  }

  const confirmed = window.confirm(
    `Release Order #${order.orderNumber}?`
  )

  if (!confirmed) {
    return
  }

  try {
    await axios.put(
      `/api/order-numbers/${order.orderNumber}/release`
    )

    await fetchOrders()
  } catch (err) {
    console.error(
      'Error releasing order number:',
      err
    )

    alert(
      err.response?.data?.message ||
      'Hindi ma-release ang order number.'
    )
  }
}

const filteredOrders = computed(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) {
    return orders.value
  }

  return orders.value.filter(order => {
    const customerName =
      order.customer?.name?.toLowerCase() || ''

    const contact =
      order.customer?.contactNumber?.toLowerCase() || ''

    const orderNumber =
      String(order.orderNumber || '')

    const orderType =
      order.orderType?.toLowerCase() || ''

    return (
      customerName.includes(query) ||
      contact.includes(query) ||
      orderNumber.includes(query) ||
      orderType.includes(query)
    )
  })
})

const activeCount = computed(() => {
  return filteredOrders.value.length
})

const formatAmount = amount => {
  return '₱' + Number(amount || 0).toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )
}

const formatDate = date => {
  if (!date) return ''

  return new Date(date).toLocaleString(
    'en-PH',
    {
      dateStyle: 'medium',
      timeStyle: 'short'
    }
  )
}

const getStatusClass = status => {
  switch (status) {
    case 'Preparing':
      return 'bg-yellow-100 text-yellow-700'

    case 'Ready':
      return 'bg-green-100 text-green-700'

    case 'Unsettled':
      return 'bg-orange-100 text-orange-700'

    case 'Active':
    default:
      return 'bg-blue-100 text-blue-700'
  }
}

const viewOrder = order => {
  const items = order.items
    .map(item => `${item.name} x${item.quantity}`)
    .join('\n')

  alert(
    `Order Type: ${order.orderType}\n` +
    `Order Number: ${order.orderNumber || '—'}\n` +
    `Customer: ${order.customer?.name || '—'}\n\n` +
    `Items:\n${items}\n\n` +
    `Total: ${formatAmount(order.netAmount)}\n` +
    `Status: ${order.status}`
  )
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

      <div>
        <h1 class="text-2xl md:text-3xl font-black text-gray-800">
          Active Orders
        </h1>

        <p class="text-sm text-gray-500 mt-1">
          Monitor current dine-in, take-out, and delivery orders.
        </p>
      </div>

      <div
        class="px-4 py-3 rounded-xl text-white shadow-sm"
        :style="{ backgroundColor: settingsStore.themeColor }"
      >
        <p class="text-xs text-white/70">
          Active Orders
        </p>

        <p class="font-black text-lg">
          {{ activeCount }}
        </p>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-100 text-red-700 p-4 rounded-xl text-sm font-medium"
    >
      {{ error }}
    </div>

    <!-- Search -->
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <input
        v-model="search"
        type="text"
        placeholder="Search order number, customer, contact, or type..."
        class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-200"
      />
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500"
    >
      Loading active orders...
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="bg-white border border-gray-200 rounded-2xl p-12 text-center"
    >
      <div class="text-4xl mb-3">
        ✓
      </div>

      <h2 class="font-black text-gray-700">
        No Active Orders
      </h2>

      <p class="text-sm text-gray-400 mt-1">
        Walang kasalukuyang active orders.
      </p>
    </div>

    <!-- Orders -->
    <div
      v-else
      class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
    >

      <div
        v-for="order in filteredOrders"
        :key="order._id"
        class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
      >

        <!-- Card Header -->
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">

          <div>
            <p class="text-xs text-gray-400 font-semibold uppercase tracking-wide">
              {{ order.orderType }}
            </p>

            <h2 class="text-lg font-black text-gray-800 mt-1">
              <span v-if="order.orderNumber">
                Order #{{ order.orderNumber }}
              </span>

              <span v-else>
                Delivery Order
              </span>
            </h2>
          </div>

          <span
            class="px-3 py-1 rounded-full text-xs font-bold"
            :class="getStatusClass(order.status)"
          >
            {{ order.status }}
          </span>

        </div>

        <!-- Customer -->
        <div class="p-4 space-y-3">

          <div v-if="order.orderType === 'Delivery'">
            <p class="text-xs text-gray-400">
              Customer
            </p>

            <p class="font-bold text-gray-800">
              {{ order.customer?.name || '—' }}
            </p>

            <p class="text-sm text-gray-500">
              {{ order.customer?.contactNumber || '—' }}
            </p>

            <p class="text-sm text-gray-500 mt-1">
              {{ order.customer?.address || '—' }}
            </p>
          </div>

          <!-- Items -->
          <div>
            <p class="text-xs text-gray-400 mb-2">
              Order Items
            </p>

            <div class="space-y-2">
              <div
                v-for="item in order.items"
                :key="item._id"
                class="flex justify-between gap-3 text-sm"
              >
                <span class="text-gray-700">
                  {{ item.name }}
                  <span class="text-gray-400">
                    × {{ item.quantity }}
                  </span>
                </span>

                <span class="font-semibold text-gray-800">
                  {{ formatAmount(item.subtotal) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Total -->
          <div class="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span class="font-bold text-gray-600">
              Total
            </span>

            <span
              class="text-xl font-black"
              :style="{ color: settingsStore.themeColor }"
            >
              {{ formatAmount(order.netAmount) }}
            </span>
          </div>

          <!-- Metadata -->
          <div class="text-xs text-gray-400">
            Created {{ formatDate(order.createdAt) }}
          </div>

        </div>

        <!-- Actions -->
        <div class="p-4 bg-gray-50 border-t border-gray-100">
          <div class="space-y-2">

            <button
              @click="viewOrder(order)"
              type="button"
              class="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-bold transition-colors"
            >
              View Order
            </button>

            <button
              v-if="order.status === 'Active'"
              @click="updateStatus(order, 'Preparing')"
              type="button"
              class="w-full py-2.5 rounded-xl text-white font-bold"
              :style="{ backgroundColor: settingsStore.themeColor }"
            >
              Start Preparing
            </button>

            <button
              v-if="order.status === 'Preparing'"
              @click="updateStatus(order, 'Ready')"
              type="button"
              class="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              Mark Ready
            </button>

            <button
              v-if="order.status === 'Ready'"
              @click="updateStatus(order, 'Preparing')"
              type="button"
              class="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
            >
              Back to Preparing
            </button>
            <button
              v-if="
                order.orderNumber &&
                (
                  order.orderType === 'Dine-In' ||
                  order.orderType === 'Take-Out'
                )
              "
              @click="releaseOrderNumber(order)"
              type="button"
              class="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold transition-colors"
            >
              Release #{{ order.orderNumber }}
            </button>

          </div>
        </div>

      </div>

    </div>

  </div>
</template>