<script setup>
import { ref, computed, onMounted } from 'vue'
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
    console.error('Error fetching kitchen orders:', err)

    error.value =
      err.response?.data?.message ||
      'Hindi makuha ang kitchen orders.'
  } finally {
    isLoading.value = false
  }
}

const kitchenOrders = computed(() => {
  const query = search.value.trim().toLowerCase()

  return orders.value
    .filter(order =>
      ['Active', 'Preparing', 'Ready'].includes(order.status)
    )
    .filter(order => {
      if (!query) return true

      const orderNumber = String(order.orderNumber || '')
      const orderType = order.orderType?.toLowerCase() || ''
      const customerName = order.customer?.name?.toLowerCase() || ''

      return (
        orderNumber.includes(query) ||
        orderType.includes(query) ||
        customerName.includes(query)
      )
    })
})

const formatDate = date => {
  if (!date) return ''

  return new Date(date).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const getStatusClass = status => {
  switch (status) {
    case 'Preparing':
      return 'bg-yellow-100 text-yellow-700'

    case 'Ready':
      return 'bg-green-100 text-green-700'

    case 'Active':
    default:
      return 'bg-blue-100 text-blue-700'
  }
}

const printOrder = order => {
  const printWindow = window.open('', '_blank', 'width=400,height=700')

  if (!printWindow) {
    alert('Hindi mabuksan ang print window. I-check ang browser popup blocker.')
    return
  }

  const orderNumber = order.orderNumber
    ? `#${order.orderNumber}`
    : 'DELIVERY'

  const customerName = order.customer?.name || ''
  const orderType = order.orderType || ''

  const itemsHtml = order.items
    .map(item => `
      <div class="item">
        <div class="qty">${item.quantity}x</div>
        <div class="name">
          ${item.name}

          ${
            item.specialInstructions
              ? `<div class="instruction">${item.specialInstructions}</div>`
              : ''
          }
        </div>
      </div>
    `)
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Kitchen Order Ticket</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 12px;
            width: 80mm;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
          }

          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }

          .business {
            font-size: 16px;
            font-weight: 900;
            margin-bottom: 4px;
          }

          .title {
            font-size: 18px;
            font-weight: 900;
            margin-top: 6px;
          }

          .meta {
            margin-bottom: 10px;
          }

          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-size: 13px;
            margin-bottom: 4px;
          }

          .meta-label {
            font-weight: 700;
          }

          .items {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 10px 0;
          }

          .item {
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
            font-size: 16px;
            line-height: 1.2;
          }

          .item:last-child {
            margin-bottom: 0;
          }

          .qty {
            width: 35px;
            flex-shrink: 0;
            font-weight: 900;
          }

          .name {
            flex: 1;
            font-weight: 700;
          }

          .instruction {
            margin-top: 4px;
            font-size: 12px;
            font-weight: 400;
            border-left: 3px solid #000;
            padding-left: 6px;
          }

          .footer {
            text-align: center;
            font-size: 11px;
            margin-top: 12px;
          }

          @media print {
            body {
              width: 80mm;
            }
          }
        </style>
      </head>

      <body>

        <div class="header">
          <div class="business">
            ${settingsStore.businessName}
          </div>

          <div class="title">
            KITCHEN ORDER TICKET
          </div>
        </div>

        <div class="meta">

          <div class="meta-row">
            <span class="meta-label">Order</span>
            <span>${orderNumber}</span>
          </div>

          <div class="meta-row">
            <span class="meta-label">Date</span>
            <span>
              ${new Date(order.createdAt).toLocaleDateString('en-PH')}
            </span>
          </div>

          <div class="meta-row">
            <span class="meta-label">Time</span>
            <span>
              ${new Date(order.createdAt).toLocaleTimeString('en-PH', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>

          ${
            customerName
              ? `
                <div class="meta-row">
                  <span class="meta-label">Customer</span>
                  <span>${customerName}</span>
                </div>
              `
              : ''
          }

          <div class="meta-row">
            <span class="meta-label">Time</span>
            <span>${formatDate(order.createdAt)}</span>
          </div>

        </div>

        <div class="items">
          ${itemsHtml}
        </div>

        <div class="footer">
          Please prepare the order carefully.
        </div>

        <script>
          window.onload = function () {
            window.print()
          }

          window.onafterprint = function () {
            window.close()
          }
        <\/script>

      </body>
    </html>
  `)

  printWindow.document.close()
}

const refreshOrders = async () => {
  await fetchOrders()
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
          Kitchen Orders
        </h1>

        <p class="text-sm text-gray-500 mt-1">
          Mga order na kailangang ihanda sa kitchen.
        </p>
      </div>

      <button
        @click="refreshOrders"
        type="button"
        class="px-4 py-3 rounded-xl text-white font-bold shadow-sm"
        :style="{ backgroundColor: settingsStore.themeColor }"
      >
        Refresh
      </button>

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
        placeholder="Search order number, customer, or order type..."
        class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-200"
      />
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500"
    >
      Loading kitchen orders...
    </div>

    <!-- Empty -->
    <div
      v-else-if="kitchenOrders.length === 0"
      class="bg-white border border-gray-200 rounded-2xl p-12 text-center"
    >
      <div class="text-4xl mb-3">
        🍽️
      </div>

      <h2 class="font-black text-gray-700">
        No Kitchen Orders
      </h2>

      <p class="text-sm text-gray-400 mt-1">
        Walang kasalukuyang order na kailangang ihanda.
      </p>
    </div>

    <!-- Orders -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >

      <div
        v-for="order in kitchenOrders"
        :key="order._id"
        class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >

        <!-- Ticket Header -->
        <div
          class="px-4 py-4 flex items-center justify-between"
          :style="{ borderTop: `5px solid ${settingsStore.themeColor}` }"
        >

          <div>
            <p class="text-xs text-gray-400 font-semibold uppercase">
              {{ order.orderType }}
            </p>

            <h2 class="text-2xl font-black text-gray-800">
              {{ order.orderNumber ? `#${order.orderNumber}` : 'DELIVERY' }}
            </h2>
          </div>

          <span
            class="px-3 py-1.5 rounded-full text-xs font-bold"
            :class="getStatusClass(order.status)"
          >
            {{ order.status }}
          </span>

        </div>

        <!-- Customer -->
        <div
          v-if="order.orderType === 'Delivery' && order.customer?.name"
          class="px-4 pb-3"
        >
          <p class="text-xs text-gray-400">
            Customer
          </p>

          <p class="font-bold text-gray-800">
            {{ order.customer.name }}
          </p>
        </div>

        <!-- Items -->
        <div class="px-4 py-3 border-t border-gray-100">

          <div
            v-for="item in order.items"
            :key="item._id"
            class="flex gap-3 py-3 border-b border-gray-100 last:border-b-0"
          >

            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center font-black text-gray-700 shrink-0">
              {{ item.quantity }}x
            </div>

            <div class="flex-1 min-w-0">

              <p class="font-bold text-gray-800">
                {{ item.name }}
              </p>

              <p
                v-if="item.specialInstructions"
                class="text-xs text-red-600 mt-1 font-semibold"
              >
                Note: {{ item.specialInstructions }}
              </p>

            </div>

          </div>

        </div>

        <!-- Footer -->
        <div class="px-4 py-4 bg-gray-50 border-t border-gray-100">

          <div class="flex items-center justify-between gap-3">

            <div>
              <p class="text-xs text-gray-400">
                Order Time
              </p>

              <p class="text-sm font-semibold text-gray-700">
                {{ formatDate(order.createdAt) }}
              </p>
            </div>

            <button
              @click="printOrder(order)"
              type="button"
              title="Print kitchen ticket"
              class="px-4 py-2.5 rounded-xl text-white font-bold shadow-sm"
              :style="{ backgroundColor: settingsStore.themeColor }"
            >
              Print KOT
            </button>

          </div>

        </div>

      </div>

    </div>

  </div>
</template>
