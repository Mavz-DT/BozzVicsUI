<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()

// =========================
// API
// =========================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API = `${API_BASE_URL}/api`

// =========================
// RESPONSE HELPERS
// =========================

const extractArray = data => {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.orders)) {
    return data.orders
  }

  if (Array.isArray(data?.settledOrders)) {
    return data.settledOrders
  }

  if (Array.isArray(data?.salesRecords)) {
    return data.salesRecords
  }

  if (Array.isArray(data?.records)) {
    return data.records
  }

  if (Array.isArray(data?.payments)) {
    return data.payments
  }

  if (Array.isArray(data?.menus)) {
    return data.menus
  }

  if (Array.isArray(data?.addOns)) {
    return data.addOns
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  return []
}

const getPaymentsArray = sale => {
  return Array.isArray(sale?.payments)
    ? sale.payments
    : []
}

// =========================
// UNSETTLED ORDERS
// =========================

const orders = ref([])
const isLoading = ref(true)
const error = ref('')
const success = ref('')
const search = ref('')

// =========================
// SETTLED ORDERS
// =========================

const settledOrders = ref([])
const isSettledLoading = ref(false)
const settledError = ref('')

// =========================
// SETTLE MODAL
// =========================

const isSettleOpen = ref(false)
const isSettling = ref(false)
const selectedOrder = ref(null)

// =========================
// RIDER SETTLEMENT MODAL
// =========================

const isRiderSettlementOpen =
  ref(false)

const isRiderSettling =
  ref(false)

const selectedRiderOrder =
  ref(null)

const riderName =
  ref('')

const riderSettlementError =
  ref('')

// =========================
// PAYMENT
// =========================

const paymentMethod = ref('Cash')

// Normal Cash
const amountTendered = ref('')

// Normal GCash
const referenceNumber = ref('')

// Split Payment
const splitCashAmount = ref('')
const splitGCashAmount = ref('')
const splitCashTendered = ref('')
const splitGCashReference = ref('')

// Touchscreen keypad target
const keypadTarget = ref(
  'amountTendered'
)

// =========================
// DATE
// =========================

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

const selectedDate = ref(
  getTodayPH()
)

const isAdmin = computed(() => {
  return (
    authStore.user?.role ===
    'Admin'
  )
})

// =========================
// FETCH UNSETTLED ORDERS
// =========================

const fetchUnsettledOrders =
  async () => {
    try {
      isLoading.value = true
      error.value = ''

      const res =
        await axios.get(
          `${API}/orders/unsettled`
        )

      orders.value =
        extractArray(
          res.data
        )
    } catch (err) {
      console.error(
        'Error fetching unsettled orders:',
        err
      )

      error.value =
        err.response?.data?.message ||
        'Hindi makuha ang unsettled orders.'

      orders.value = []
    } finally {
      isLoading.value = false
    }
  }

// =========================
// FETCH SETTLED DELIVERY ORDERS
// =========================

const fetchSettledOrders =
  async () => {
    try {
      isSettledLoading.value =
        true

      settledError.value = ''

      const token =
        authStore.getToken()

      const config = {
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }

      let res

      if (isAdmin.value) {
        res =
          await axios.get(
            `${API}/payments/sales-records?date=${selectedDate.value}`,
            config
          )
      } else {
        res =
          await axios.get(
            `${API}/payments/sales-records`,
            config
          )
      }

      const records =
        extractArray(
          res.data
        )

      settledOrders.value =
        records.filter(
          sale =>
            sale.order?.orderType ===
            'Delivery'
        )
    } catch (err) {
      console.error(
        'Error fetching settled orders:',
        err
      )

      settledError.value =
        err.response?.data?.message ||
        'Hindi makuha ang settled delivery orders.'

      settledOrders.value = []
    } finally {
      isSettledLoading.value =
        false
    }
  }

// =========================
// REFRESH BOTH SECTIONS
// =========================

const refreshOrders =
  async () => {
    await Promise.all([
      fetchUnsettledOrders(),
      fetchSettledOrders()
    ])
  }

// =========================
// SEARCH UNSETTLED
// =========================

const filteredOrders =
  computed(() => {
    const query =
      search.value
        .trim()
        .toLowerCase()

    if (!query) {
      return Array.isArray(
        orders.value
      )
        ? orders.value
        : []
    }

    return (
      Array.isArray(
        orders.value
      )
        ? orders.value
        : []
    ).filter(order => {
      const customerName =
        order.customer?.name?.toLowerCase() ||
        ''

      const contact =
        order.customer?.contactNumber?.toLowerCase() ||
        ''

      const address =
        order.customer?.address?.toLowerCase() ||
        ''

      return (
        customerName.includes(query) ||
        contact.includes(query) ||
        address.includes(query)
      )
    })
  })

// =========================
// SEARCH SETTLED
// =========================

const filteredSettledOrders =
  computed(() => {
    const query =
      search.value
        .trim()
        .toLowerCase()

    const records =
      Array.isArray(
        settledOrders.value
      )
        ? settledOrders.value
        : []

    if (!query) {
      return records
    }

    return records.filter(
      sale => {
        const customerName =
          sale.order?.customer?.name?.toLowerCase() ||
          ''

        const contact =
          sale.order?.customer?.contactNumber?.toLowerCase() ||
          ''

        const address =
          sale.order?.customer?.address?.toLowerCase() ||
          ''

        const paymentMethod =
          sale.paymentMethod?.toLowerCase() ||
          ''

        const deliveryFeePaidBy =
          sale.order?.deliveryFeePaidBy?.toLowerCase() ||
          ''

        const riderName =
          sale.order?.riderSettlement?.riderName?.toLowerCase() ||
          ''

        const payments =
          getPaymentsArray(
            sale
          )

        const hasPaymentMethod =
          payments.some(
            payment =>
              payment.paymentMethod
                ?.toLowerCase()
                .includes(query)
          )

        return (
          customerName.includes(query) ||
          contact.includes(query) ||
          address.includes(query) ||
          paymentMethod.includes(query) ||
          deliveryFeePaidBy.includes(query) ||
          riderName.includes(query) ||
          hasPaymentMethod
        )
      }
    )
  })

// =========================
// TOTALS
// =========================

const totalUnsettled =
  computed(() => {
    const records =
      Array.isArray(
        filteredOrders.value
      )
        ? filteredOrders.value
        : []

    return records.reduce(
      (sum, order) =>
        sum +
        Number(
          order.netAmount || 0
        ),
      0
    )
  })

const totalSettled =
  computed(() => {
    const records =
      Array.isArray(
        filteredSettledOrders.value
      )
        ? filteredSettledOrders.value
        : []

    return records.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.amount || 0
        ),
      0
    )
  })

// =========================
// SETTLE AMOUNT
// =========================

const settleAmount =
  computed(() => {
    return Number(
      selectedOrder.value?.netAmount ||
        0
    )
  })

// =========================
// NORMAL CASH CHANGE
// =========================

const change =
  computed(() => {
    const tendered =
      Number(
        amountTendered.value ||
          0
      )

    return tendered >=
      settleAmount.value
      ? tendered -
          settleAmount.value
      : 0
  })

// =========================
// SPLIT PAYMENT
// =========================

const splitCash =
  computed(() => {
    return Number(
      splitCashAmount.value ||
        0
    )
  })

const splitGCash =
  computed(() => {
    return Number(
      splitGCashAmount.value ||
        0
    )
  })

const splitCashTenderedValue =
  computed(() => {
    const tendered =
      Number(
        splitCashTendered.value ||
          0
      )

    return tendered > 0
      ? tendered
      : splitCash.value
  })

const splitTotal =
  computed(() => {
    return (
      splitCash.value +
      splitGCash.value
    )
  })

const splitRemaining =
  computed(() => {
    return Math.max(
      0,
      settleAmount.value -
        splitTotal.value
    )
  })

const splitChange =
  computed(() => {
    if (
      splitCash.value <= 0
    ) {
      return 0
    }

    return Math.max(
      0,
      splitCashTenderedValue.value -
        splitCash.value
    )
  })

const isSplitExact =
  computed(() => {
    return (
      Math.abs(
        splitTotal.value -
          settleAmount.value
      ) < 0.01
    )
  })

// =========================
// RIDER SETTLEMENT HELPERS
// =========================

const getRiderSettlementStatus =
  sale => {
    return (
      sale?.order?.riderSettlement?.status ||
      'Not Required'
    )
  }

const getRiderSettlementAmount =
  sale => {
    return Number(
      sale?.order?.riderSettlement?.amount ||
        sale?.order?.deliveryFee ||
        0
    )
  }

const isStoreDeliveryFee =
  sale => {
    return (
      sale?.order?.deliveryFeePaidBy ===
      'Store'
    )
  }

const canPayRider =
  sale => {
    return (
      isStoreDeliveryFee(
        sale
      ) &&
      getRiderSettlementStatus(
        sale
      ) === 'Pending' &&
      getRiderSettlementAmount(
        sale
      ) > 0
    )
  }

const riderSettlementAmount =
  computed(() => {
    return Number(
      selectedRiderOrder.value
        ?.deliveryFee ||
        0
    )
  })

// =========================
// RIDER SETTLEMENT MODAL
// =========================

const openRiderSettlementModal =
  sale => {
    const order =
      sale?.order

    if (!order) {
      return
    }

    if (
      order.orderType !==
      'Delivery'
    ) {
      return
    }

    if (
      order.deliveryFeePaidBy !==
      'Store'
    ) {
      return
    }

    const status =
      order.riderSettlement?.status ||
      'Not Required'

    const amount =
      Number(
        order.riderSettlement?.amount ||
          order.deliveryFee ||
          0
      )

    if (
      status !== 'Pending' ||
      amount <= 0
    ) {
      return
    }

    selectedRiderOrder.value =
      order

    riderName.value = ''

    riderSettlementError.value =
      ''

    isRiderSettlementOpen.value =
      true
  }

const closeRiderSettlementModal =
  (
    force = false
  ) => {
    if (
      isRiderSettling.value &&
      !force
    ) {
      return
    }

    isRiderSettlementOpen.value =
      false

    selectedRiderOrder.value =
      null

    riderName.value = ''

    riderSettlementError.value =
      ''
  }

const markRiderSettlementPaid =
  async () => {
    const order =
      selectedRiderOrder.value

    const cleanedRiderName =
      riderName.value
        .trim()

    if (!order) {
      return
    }

    if (!cleanedRiderName) {
      riderSettlementError.value =
        'Rider name is required.'
      return
    }

    if (
      order.deliveryFeePaidBy !==
      'Store'
    ) {
      riderSettlementError.value =
        'This delivery fee is not assigned to the store.'
      return
    }

    const currentStatus =
      order.riderSettlement?.status ||
      'Not Required'

    if (
      currentStatus !==
      'Pending'
    ) {
      riderSettlementError.value =
        'Rider settlement is not pending.'
      return
    }

    try {
      isRiderSettling.value =
        true

      riderSettlementError.value =
        ''

      success.value = ''

      const token =
        authStore.getToken()

      const config = {
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }

      const res =
        await axios.put(
          `${API}/orders/${order._id}/rider-settlement`,
          {
            riderName:
              cleanedRiderName
          },
          config
        )

      success.value =
        res.data?.message ||
        'Rider payment recorded successfully.'

      closeRiderSettlementModal(
        true
      )

      await refreshOrders()

      setTimeout(() => {
        success.value = ''
      }, 3000)
    } catch (err) {
      console.error(
        'Error marking rider settlement as paid:',
        err
      )

      riderSettlementError.value =
        err.response?.data?.message ||
        err.message ||
        'Hindi ma-record ang rider payment.'
    } finally {
      isRiderSettling.value =
        false
    }
  }

// =========================
// FORM VALIDATION
// =========================

const isSettleFormValid =
  computed(() => {
    if (!selectedOrder.value) {
      return false
    }

    if (
      settleAmount.value <= 0
    ) {
      return false
    }

    // CASH

    if (
      paymentMethod.value ===
      'Cash'
    ) {
      return (
        Number(
          amountTendered.value ||
            0
        ) >=
        settleAmount.value
      )
    }

    // GCASH

    if (
      paymentMethod.value ===
      'GCash'
    ) {
      return (
        referenceNumber.value
          .trim()
          .length > 3
      )
    }

    // SPLIT

    if (
      paymentMethod.value ===
      'Split'
    ) {
      if (
        !isSplitExact.value
      ) {
        return false
      }

      if (
        splitTotal.value <= 0
      ) {
        return false
      }

      if (
        splitCash.value > 0 &&
        splitCashTenderedValue.value <
          splitCash.value
      ) {
        return false
      }

      if (
        splitGCash.value > 0 &&
        splitGCashReference.value
          .trim()
          .length <= 3
      ) {
        return false
      }

      return true
    }

    return false
  })

// =========================
// KEYPAD VALUE
// =========================

const keypadValue =
  computed({
    get() {
      if (
        keypadTarget.value ===
        'amountTendered'
      ) {
        return amountTendered.value
      }

      if (
        keypadTarget.value ===
        'splitCashAmount'
      ) {
        return splitCashAmount.value
      }

      if (
        keypadTarget.value ===
        'splitGCashAmount'
      ) {
        return splitGCashAmount.value
      }

      if (
        keypadTarget.value ===
        'splitCashTendered'
      ) {
        return splitCashTendered.value
      }

      // IMPORTANT:
      // GCash reference must also
      // be supported by keypad.
      if (
        keypadTarget.value ===
        'splitGCashReference'
      ) {
        return splitGCashReference.value
      }

      return ''
    },

    set(value) {
      if (
        keypadTarget.value ===
        'amountTendered'
      ) {
        amountTendered.value =
          value

        return
      }

      if (
        keypadTarget.value ===
        'splitCashAmount'
      ) {
        splitCashAmount.value =
          value

        return
      }

      if (
        keypadTarget.value ===
        'splitGCashAmount'
      ) {
        splitGCashAmount.value =
          value

        return
      }

      if (
        keypadTarget.value ===
        'splitCashTendered'
      ) {
        splitCashTendered.value =
          value

        return
      }

      // IMPORTANT:
      // GCash reference keypad input
      if (
        keypadTarget.value ===
        'splitGCashReference'
      ) {
        splitGCashReference.value =
          value
      }
    }
  })

// =========================
// KEYPAD TARGET
// =========================

const setKeypadTarget =
  target => {
    keypadTarget.value =
      target
  }

// =========================
// NUMERIC KEYPAD
// =========================

const appendKey =
  key => {
    if (
      key === 'clear'
    ) {
      keypadValue.value = ''
      return
    }

    if (
      key === 'backspace'
    ) {
      keypadValue.value =
        keypadValue.value.slice(
          0,
          -1
        )

      return
    }

    // =========================
    // GCASH REFERENCE
    // =========================
    //
    // Reference number is numeric only.
    // Decimal point is not allowed.
    //
    if (
      keypadTarget.value ===
      'splitGCashReference'
    ) {
      if (
        !/^\d$/.test(key)
      ) {
        return
      }

      keypadValue.value +=
        key

      return
    }

    // =========================
    // DECIMAL POINT
    // =========================

    if (
      key === '.'
    ) {
      if (
        keypadValue.value.includes(
          '.'
        )
      ) {
        return
      }

      if (
        !keypadValue.value
      ) {
        keypadValue.value =
          '0.'
        return
      }

      keypadValue.value +=
        '.'

      return
    }

    // =========================
    // MAXIMUM 2 DECIMALS
    // =========================

    if (
      keypadValue.value.includes(
        '.'
      )
    ) {
      const decimalPart =
        keypadValue.value.split(
          '.'
        )[1] || ''

      if (
        decimalPart.length >=
        2
      ) {
        return
      }
    }

    // =========================
    // PREVENT LEADING ZEROES
    // =========================

    if (
      keypadValue.value ===
        '0' &&
      key !== '.'
    ) {
      keypadValue.value =
        key

      return
    }

    keypadValue.value +=
      key
  }

// =========================
// PAYMENT METHOD
// =========================

const selectPaymentMethod =
  method => {
    if (
      isSettling.value
    ) {
      return
    }

    paymentMethod.value =
      method

    if (
      method === 'Cash'
    ) {
      keypadTarget.value =
        'amountTendered'
    }

    if (
      method === 'Split'
    ) {
      keypadTarget.value =
        'splitCashAmount'
    }
  }

// =========================
// FORMAT AMOUNT
// =========================

const formatAmount =
  amount => {
    return (
      '₱' +
      Number(
        amount || 0
      ).toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    )
  }

// =========================
// FORMAT DATE
// =========================

const formatDate =
  date => {
    if (!date) {
      return ''
    }

    return new Date(
      date
    ).toLocaleString(
      'en-PH',
      {
        dateStyle:
          'medium',
        timeStyle:
          'short'
      }
    )
  }

// =========================
// FORMAT SETTLEMENT TIME
// =========================

const getSettlementDate =
  sale => {
    return (
      sale.settledAt ||
      sale.paymentCreatedAt ||
      sale.createdAt ||
      sale.order?.createdAt
    )
  }

// =========================
// VIEW UNSETTLED ORDER
// =========================

const viewOrder =
  order => {
    const items =
      Array.isArray(
        order?.items
      )
        ? order.items
        : []

    const itemText =
      items
        .map(
          item =>
            `${item.name} x${item.quantity}`
        )
        .join('\n')

    alert(
      `Customer: ${order.customer?.name || '—'}\n` +
      `Contact: ${order.customer?.contactNumber || '—'}\n` +
      `Address: ${order.customer?.address || '—'}\n\n` +
      `Items:\n${itemText}\n\n` +
      `Amount Due: ${formatAmount(
        order.netAmount
      )}\n` +
      `Delivery Fee: ${formatAmount(
        order.deliveryFee
      )}\n` +
      `Delivery Fee Paid By: ${
        order.deliveryFeePaidBy ===
        'Store'
          ? 'Store'
          : 'Customer'
      }`
    )
  }

// =========================
// VIEW SETTLED ORDER
// =========================

const viewSettledOrder =
  sale => {
    const order =
      sale.order || {}

    const items =
      Array.isArray(
        order.items
      )
        ? order.items
        : []

    const itemText =
      items
        .map(
          item =>
            `${item.name} x${item.quantity}`
        )
        .join('\n')

    const paymentText =
      sale.paymentMethod ||
      '-'

    const riderStatus =
      getRiderSettlementStatus(
        sale
      )

    const riderAmount =
      getRiderSettlementAmount(
        sale
      )

    const riderNameText =
      order.riderSettlement
        ?.riderName ||
      '—'

    alert(
      `Customer: ${order.customer?.name || '—'}\n` +
      `Contact: ${order.customer?.contactNumber || '—'}\n` +
      `Address: ${order.customer?.address || '—'}\n\n` +
      `Items:\n${itemText}\n\n` +
      `Amount: ${formatAmount(
        sale.amount
      )}\n` +
      `Payment: ${paymentText}\n` +
      `Delivery Fee: ${formatAmount(
        order.deliveryFee
      )}\n` +
      `Delivery Fee Paid By: ${
        order.deliveryFeePaidBy ===
        'Store'
          ? 'Store'
          : 'Customer'
      }\n` +
      `Rider Settlement: ${riderStatus}\n` +
      `${
        riderStatus === 'Paid'
          ? `Rider: ${riderNameText}\n` +
            `Rider Amount: ${formatAmount(
              riderAmount
            )}\n`
          : ''
      }` +
      `Settled: ${formatDate(
        getSettlementDate(
          sale
        )
      )}`
    )
  }

// =========================
// PRINT SETTLED RECEIPT
// =========================

const printSettledReceipt =
  sale => {
    const order =
      sale?.order

    if (!order) {
      return
    }

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=400,height=700'
      )

    if (!printWindow) {
      alert(
        'Hindi mabuksan ang receipt print window. I-check ang browser popup blocker.'
      )
      return
    }

    const orderNumber =
      order.orderNumber
        ? `#${order.orderNumber}`
        : 'DELIVERY'

    const receiptDate =
      getSettlementDate(
        sale
      )

    const items =
      Array.isArray(
        order.items
      )
        ? order.items
        : []

    const itemsHtml =
      items
        .map(item => {
          const addOns =
            Array.isArray(
              item.addOns
            )
              ? item.addOns
              : []

          const addOnTotal =
            addOns.reduce(
              (
                total,
                addOn
              ) =>
                total +
                Number(
                  addOn.price || 0
                ),
              0
            )

          const unitPrice =
            Number(
              item.price || 0
            ) +
            addOnTotal

          const addOnsHtml =
            addOns.length
              ? `
                <div class="sub-item">
                  + ${addOns
                    .map(
                      addOn =>
                        `${addOn.name} (${Number(
                          addOn.price || 0
                        ).toFixed(2)})`
                    )
                    .join(', ')}
                </div>
              `
              : ''

          const instructionHtml =
            item.specialInstructions
              ? `
                <div class="instruction">
                  Note:
                  ${item.specialInstructions}
                </div>
              `
              : ''

          return `
            <div class="item">

              <div class="item-main">

                <span>
                  ${item.quantity}x
                  ${item.name}
                </span>

                <span>
                  ₱${Number(
                    item.subtotal || 0
                  ).toFixed(2)}
                </span>

              </div>

              <div class="unit-price">
                ₱${unitPrice.toFixed(2)} each
              </div>

              ${addOnsHtml}
              ${instructionHtml}

            </div>
          `
        })
        .join('')

    // =========================
    // PAYMENT DETAILS
    // =========================

    const payments =
      getPaymentsArray(
        sale
      )

    let paymentHtml = ''

    if (
      payments.length > 1
    ) {
      paymentHtml = `
        <div class="section-title">
          PAYMENT DETAILS
        </div>

        ${payments
          .map(
            (
              payment,
              index
            ) => `
              <div class="payment-block">

                <div class="summary-row">
                  <span>
                    Payment ${index + 1}
                  </span>

                  <span>
                    ${payment.paymentMethod}
                  </span>
                </div>

                <div class="summary-row">
                  <span>
                    Amount
                  </span>

                  <span>
                    ₱${Number(
                      payment.amount || 0
                    ).toFixed(2)}
                  </span>
                </div>

                ${
                  payment.paymentMethod ===
                  'Cash'
                    ? `
                      <div class="summary-row">
                        <span>
                          Tendered
                        </span>

                        <span>
                          ₱${Number(
                            payment.amountTendered || 0
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div class="summary-row">
                        <span>
                          Change
                        </span>

                        <span>
                          ₱${Number(
                            payment.change || 0
                          ).toFixed(2)}
                        </span>
                      </div>
                    `
                    : ''
                }

                ${
                  payment.paymentMethod ===
                    'GCash' &&
                  payment.referenceNumber
                    ? `
                      <div class="summary-row">
                        <span>
                          Reference
                        </span>

                        <span class="reference">
                          ${payment.referenceNumber}
                        </span>
                      </div>
                    `
                    : ''
                }

              </div>
            `
          )
          .join('')}
      `
    } else {
      const payment =
        payments[0] || null

      paymentHtml = `
        <div class="summary-row">

          <span>
            Payment
          </span>

          <span>
            ${
              payment?.paymentMethod ||
              sale.paymentMethod ||
              '-'
          }
          </span>

        </div>

        ${
          payment?.paymentMethod ===
          'Cash'
            ? `
              <div class="summary-row">

                <span>
                  Amount
                </span>

                <span>
                  ₱${Number(
                    payment.amount || 0
                  ).toFixed(2)}
                </span>

              </div>

              <div class="summary-row">

                <span>
                  Amount Tendered
                </span>

                <span>
                  ₱${Number(
                    payment.amountTendered || 0
                  ).toFixed(2)}
                </span>

              </div>

              <div class="summary-row">

                <span>
                  Change
                </span>

                <span>
                  ₱${Number(
                    payment.change || 0
                  ).toFixed(2)}
                </span>

              </div>
            `
            : ''
        }

        ${
          payment?.paymentMethod ===
            'GCash' &&
          payment.referenceNumber
            ? `
              <div class="summary-row">

                <span>
                  Reference
                </span>

                <span class="reference">
                  ${payment.referenceNumber}
                </span>

              </div>
            `
            : ''
        }
      `
    }

    const deliveryHtml = `
      <div class="section">

        <div class="section-title">
          DELIVERY DETAILS
        </div>

        ${
          order.customer?.name
            ? `
              <div class="info-row">
                <span>
                  Customer
                </span>

                <span>
                  ${order.customer.name}
                </span>
              </div>
            `
            : ''
        }

        ${
          order.customer?.contactNumber
            ? `
              <div class="info-row">
                <span>
                  Contact
                </span>

                <span>
                  ${order.customer.contactNumber}
                </span>
              </div>
            `
            : ''
        }

        ${
          order.customer?.address
            ? `
              <div class="info-row">
                <span>
                  Address
                </span>

                <span>
                  ${order.customer.address}
                </span>
              </div>
            `
            : ''
        }

        ${
          Number(
            order.deliveryFee || 0
          ) > 0
            ? `
              <div class="info-row">
                <span>
                  Delivery Fee
                </span>

                <span>
                  ₱${Number(
                    order.deliveryFee || 0
                  ).toFixed(2)}
                </span>
              </div>

              <div class="info-row">
                <span>
                  Fee Paid By
                </span>

                <span>
                  ${
                    order.deliveryFeePaidBy ===
                    'Store'
                      ? 'Store'
                      : 'Customer'
                  }
                </span>
              </div>
            `
            : ''
        }

      </div>
    `

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            Customer Receipt
          </title>

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 12px;
              width: 80mm;
              background: #fff;
              color: #000;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              font-size: 12px;
            }

            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }

            .business {
              font-size: 17px;
              font-weight: 900;
            }

            .subtitle {
              margin-top: 3px;
              font-size: 11px;
            }

            .receipt-title {
              margin-top: 7px;
              font-size: 15px;
              font-weight: 900;
            }

            .meta {
              margin-bottom: 10px;
            }

            .meta-row,
            .summary-row,
            .info-row {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 4px;
            }

            .summary-row span:last-child,
            .info-row span:last-child {
              text-align: right;
              word-break: break-word;
            }

            .label {
              font-weight: 700;
            }

            .items {
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              padding: 9px 0;
            }

            .item {
              margin-bottom: 9px;
            }

            .item:last-child {
              margin-bottom: 0;
            }

            .item-main {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              font-size: 13px;
              font-weight: 700;
            }

            .unit-price,
            .sub-item,
            .instruction {
              font-size: 10px;
              color: #333;
              margin-top: 2px;
            }

            .instruction {
              font-style: italic;
            }

            .summary {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px dashed #000;
            }

            .payment-block {
              margin-top: 7px;
              padding-top: 7px;
              border-top: 1px dotted #000;
            }

            .reference {
              text-align: right;
              word-break: break-all;
            }

            .net-total {
              font-size: 15px;
              font-weight: 900;
              margin-top: 6px;
              padding-top: 6px;
              border-top: 1px solid #000;
            }

            .section {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px dashed #000;
            }

            .section-title {
              font-weight: 900;
              margin-bottom: 6px;
            }

            .footer {
              text-align: center;
              border-top: 2px dashed #000;
              margin-top: 12px;
              padding-top: 10px;
              font-size: 11px;
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

            <div class="subtitle">
              ${settingsStore.businessSubtitle}
            </div>

            <div class="receipt-title">
              CUSTOMER RECEIPT
            </div>

          </div>

          <div class="meta">

            <div class="meta-row">

              <span class="label">
                Order
              </span>

              <span>
                ${orderNumber}
              </span>

            </div>

            <div class="meta-row">

              <span class="label">
                Type
              </span>

              <span>
                ${order.orderType}
              </span>

            </div>

            <div class="meta-row">

              <span class="label">
                Settled
              </span>

              <span>
                ${
                  receiptDate
                    ? new Date(
                        receiptDate
                      ).toLocaleString(
                        'en-PH'
                      )
                    : '-'
                }
              </span>

            </div>

          </div>

          ${deliveryHtml}

          <div class="items">
            ${itemsHtml}
          </div>

          <div class="summary">

            <div class="summary-row">

              <span>
                Gross Sales
              </span>

              <span>
                ₱${Number(
                  order.grossAmount || 0
                ).toFixed(2)}
              </span>

            </div>

            ${
              Number(
                order.discountAmount || 0
              ) > 0
                ? `
                  <div class="summary-row">

                    <span>
                      Discount
                    </span>

                    <span>
                      -₱${Number(
                        order.discountAmount || 0
                      ).toFixed(2)}
                    </span>

                  </div>
                `
                : ''
            }

            ${
              Number(
                order.deliveryFee || 0
              ) > 0
                ? `
                  <div class="summary-row">

                    <span>
                      Delivery Fee
                    </span>

                    <span>
                      ₱${Number(
                        order.deliveryFee || 0
                      ).toFixed(2)}
                    </span>

                  </div>
                `
                : ''
            }

            <div class="summary-row net-total">

              <span>
                NET TOTAL
              </span>

              <span>
                ₱${Number(
                  order.netAmount || 0
                ).toFixed(2)}
              </span>

            </div>

            ${paymentHtml}

          </div>

          <div class="footer">
            Thank you for your order!
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

// =========================
// OPEN SETTLE MODAL
// =========================

const openSettleModal =
  order => {
    if (
      isSettling.value
    ) {
      return
    }

    selectedOrder.value =
      order

    paymentMethod.value =
      'Cash'

    amountTendered.value =
      ''

    referenceNumber.value =
      ''

    splitCashAmount.value =
      ''

    splitGCashAmount.value =
      ''

    splitCashTendered.value =
      ''

    splitGCashReference.value =
      ''

    keypadTarget.value =
      'amountTendered'

    error.value = ''

    isSettleOpen.value =
      true
  }

// =========================
// CLOSE SETTLE MODAL
// =========================

const closeSettleModal =
  (
    force = false
  ) => {
    if (
      isSettling.value &&
      !force
    ) {
      return
    }

    isSettleOpen.value =
      false

    selectedOrder.value =
      null

    paymentMethod.value =
      'Cash'

    amountTendered.value =
      ''

    referenceNumber.value =
      ''

    splitCashAmount.value =
      ''

    splitGCashAmount.value =
      ''

    splitCashTendered.value =
      ''

    splitGCashReference.value =
      ''

    keypadTarget.value =
      'amountTendered'
  }

// =========================
// SETTLE ORDER
// =========================

const settleOrder = async () => {
  // Prevent double-click / duplicate payment requests
  if (
    isSettling.value
  ) {
    return
  }

  if (
    !isSettleFormValid.value ||
    !selectedOrder.value
  ) {
    return
  }

  try {
    isSettling.value = true

    error.value = ''
    success.value = ''

    let payments = []

    // =========================
    // CASH
    // =========================

    if (
      paymentMethod.value ===
      'Cash'
    ) {
      payments = [
        {
          paymentMethod:
            'Cash',

          amount:
            settleAmount.value,

          amountTendered:
            Number(
              amountTendered.value
            ),

          change:
            change.value,

          referenceNumber:
            ''
        }
      ]
    }

    // =========================
    // GCASH
    // =========================

    if (
      paymentMethod.value ===
      'GCash'
    ) {
      payments = [
        {
          paymentMethod:
            'GCash',

          amount:
            settleAmount.value,

          amountTendered:
            0,

          change:
            0,

          referenceNumber:
            referenceNumber.value.trim()
        }
      ]
    }

    // =========================
    // SPLIT
    // =========================

    if (
      paymentMethod.value ===
      'Split'
    ) {
      if (
        splitCash.value > 0
      ) {
        payments.push({
          paymentMethod:
            'Cash',

          amount:
            splitCash.value,

          amountTendered:
            splitCashTenderedValue.value,

          change:
            splitChange.value,

          referenceNumber:
            ''
        })
      }

      if (
        splitGCash.value > 0
      ) {
        payments.push({
          paymentMethod:
            'GCash',

          amount:
            splitGCash.value,

          amountTendered:
            0,

          change:
            0,

          referenceNumber:
            splitGCashReference.value.trim()
        })
      }
    }

    // =========================
    // VALIDATE PAYMENT TOTAL
    // =========================

    const paymentTotal =
      payments.reduce(
        (
          total,
          payment
        ) =>
          total +
          Number(
            payment.amount || 0
          ),
        0
      )

    if (
      Math.abs(
        paymentTotal -
          settleAmount.value
      ) > 0.01
    ) {
      throw new Error(
        'Ang payment total ay hindi tugma sa amount due.'
      )
    }

    // =========================
    // GENERATE PAYMENT REQUEST ID
    // =========================
    //
    // One ID = one complete
    // payment submission.
    //
    // This protects the settlement
    // flow from duplicate requests.
    //
    // For Split Payment, this same
    // request ID represents the
    // entire Cash + GCash submission.
    //
    // =========================

    let paymentRequestId = ''

    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID ===
        'function'
    ) {
      paymentRequestId =
        crypto.randomUUID()
    } else {
      paymentRequestId =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 11)}`
    }

    // =========================
    // AUTH CONFIG
    // =========================

    const token =
      authStore.getToken()

    const config = {
      headers: {
        Authorization:
          `Bearer ${token}`
      }
    }

    // =========================
    // SAVE PAYMENT
    // =========================

    const res =
      await axios.post(
        `${API}/payments`,
        {
          orderId:
            selectedOrder.value._id,

          receivedBy:
            authStore.user?._id,

          paymentRequestId,

          payments
        },
        config
      )

    // =========================
    // SUCCESS
    // =========================

    success.value =
      res.data?.message ||
      'Order settled successfully.'

    closeSettleModal(
      true
    )

    await refreshOrders()

    setTimeout(() => {
      success.value = ''
    }, 3000)

  } catch (err) {
    console.error(
      'Error settling order:',
      err
    )

    error.value =
      err.response?.data?.message ||
      err.message ||
      'Hindi ma-settle ang order.'
  } finally {
    isSettling.value =
      false
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

    await fetchSettledOrders()
  }

// =========================
// INITIAL LOAD
// =========================

onMounted(() => {
  refreshOrders()
})
</script>

<template>
  <div
    class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
  >

    <!-- ========================= -->
    <!-- HEADER -->
    <!-- ========================= -->

    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
    >

      <div>

        <h1
          class="text-2xl md:text-3xl font-black text-gray-800"
        >
          Unsettled Orders
        </h1>

        <p
          class="text-sm text-gray-500 mt-1"
        >
          Delivery orders waiting for payment.
        </p>

      </div>

      <div
        class="flex flex-col sm:flex-row gap-3"
      >

        <!-- ADMIN DATE PICKER -->

        <div
          v-if="isAdmin"
          class="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
        >

          <label
            class="block text-xs font-bold text-gray-500 mb-1"
          >
            Settled Date
          </label>

          <input
            v-model="selectedDate"
            @change="handleDateChange"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />

        </div>

        <!-- UNSETTLED TOTAL -->

        <div
          class="px-4 py-3 rounded-xl text-white shadow-sm"
          :style="{
            backgroundColor:
              settingsStore.themeColor
          }"
        >

          <p
            class="text-xs text-white/70"
          >
            Total Unsettled
          </p>

          <p
            class="font-black text-lg"
          >
            {{
              formatAmount(
                totalUnsettled
              )
            }}
          </p>

        </div>

      </div>

    </div>

    <!-- ========================= -->
    <!-- MESSAGES -->
    <!-- ========================= -->

    <div
      v-if="
        error &&
        !isSettleOpen &&
        !isRiderSettlementOpen
      "
      class="bg-red-100 text-red-700 p-4 rounded-xl text-sm font-medium"
    >
      {{ error }}
    </div>

    <div
      v-if="success"
      class="bg-green-100 text-green-700 p-4 rounded-xl text-sm font-medium"
    >
      {{ success }}
    </div>

    <!-- ========================= -->
    <!-- SEARCH -->
    <!-- ========================= -->

    <div
      class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
    >

      <input
        v-model="search"
        type="text"
        placeholder="Search customer, contact, address, payment, rider..."
        class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-200"
      />

    </div>

    <!-- ========================= -->
    <!-- UNSETTLED SECTION -->
    <!-- ========================= -->

    <section class="space-y-4">

      <div
        class="flex items-center justify-between gap-3"
      >

        <div>

          <h2
            class="text-xl font-black text-gray-800"
          >
            Unsettled Orders
          </h2>

          <p
            class="text-sm text-gray-500 mt-1"
          >
            Delivery orders that still need payment.
          </p>

        </div>

        <span
          class="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-black"
        >
          {{ filteredOrders.length }}
        </span>

      </div>

      <!-- LOADING -->

      <div
        v-if="isLoading"
        class="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500"
      >
        Loading unsettled orders...
      </div>

      <!-- EMPTY -->

      <div
        v-else-if="
          filteredOrders.length === 0
        "
        class="bg-white border border-gray-200 rounded-2xl p-12 text-center"
      >

        <div class="text-4xl mb-3">
          ✓
        </div>

        <h2
          class="font-black text-gray-700"
        >
          No Unsettled Orders
        </h2>

        <p
          class="text-sm text-gray-400 mt-1"
        >
          Walang pending delivery payment.
        </p>

      </div>

      <!-- TABLE -->

      <div
        v-else
        class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
      >

        <div class="overflow-x-auto">

          <table
            class="w-full text-sm text-left"
          >

            <thead
              class="bg-gray-50 border-b border-gray-200"
            >

              <tr>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Date
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Customer
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Contact
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Address
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700 text-right"
                >
                  Amount Due
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700 text-center"
                >
                  Status
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700 text-center"
                >
                  Actions
                </th>

              </tr>

            </thead>

            <tbody
              class="divide-y divide-gray-100"
            >

              <tr
                v-for="order in filteredOrders"
                :key="order._id"
                class="hover:bg-gray-50"
              >

                <td
                  class="px-4 py-4 text-gray-500 whitespace-nowrap"
                >
                  {{
                    formatDate(
                      order.createdAt
                    )
                  }}
                </td>

                <td
                  class="px-4 py-4"
                >

                  <p
                    class="font-bold text-gray-800"
                  >
                    {{
                      order.customer?.name ||
                      '—'
                    }}
                  </p>

                </td>

                <td
                  class="px-4 py-4 text-gray-600"
                >
                  {{
                    order.customer?.contactNumber ||
                    '—'
                  }}
                </td>

                <td
                  class="px-4 py-4 text-gray-600 max-w-xs"
                >

                  <p
                    class="truncate"
                  >
                    {{
                      order.customer?.address ||
                      '—'
                    }}
                  </p>

                </td>

                <td
                  class="px-4 py-4 text-right font-black text-gray-800 whitespace-nowrap"
                >
                  {{
                    formatAmount(
                      order.netAmount
                    )
                  }}
                </td>

                <td
                  class="px-4 py-4 text-center"
                >

                  <span
                    class="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold"
                  >
                    Unsettled
                  </span>

                </td>

                <td
                  class="px-4 py-4"
                >

                  <div
                    class="flex justify-center gap-2"
                  >

                    <!-- VIEW -->

                    <button
                      @click="
                        viewOrder(order)
                      "
                      type="button"
                      title="View order"
                      class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
                          d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6S2.25 12 2.25 12Z"
                        />

                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />

                      </svg>

                    </button>

                    <!-- SETTLE -->

                    <button
                      @click="
                        openSettleModal(
                          order
                        )
                      "
                      type="button"
                      title="Settle order"
                      :disabled="isSettling"
                      class="p-2 rounded-lg text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      :style="{
                        backgroundColor:
                          settingsStore.themeColor
                      }"
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
                          d="M12 6v12m-4-9h7a2 2 0 1 1 0 4H9a2 2 0 1 0 0 4h7"
                        />

                      </svg>

                    </button>

                  </div>

                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </section>

    <!-- ========================= -->
    <!-- SETTLED SECTION -->
    <!-- ========================= -->

    <section
      class="space-y-4 pt-4"
    >

      <div
        class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >

        <div>

          <h2
            class="text-xl font-black text-gray-800"
          >
            Settled Delivery Orders
          </h2>

          <p
            class="text-sm text-gray-500 mt-1"
          >
            {{
              isAdmin
                ? `Settled delivery orders for ${selectedDate}.`
                : 'Settled delivery orders for today.'
            }}
          </p>

        </div>

        <div
          class="px-4 py-3 rounded-xl bg-green-50 border border-green-200"
        >

          <p
            class="text-xs text-green-600 font-bold"
          >
            Total Settled
          </p>

          <p
            class="text-lg font-black text-green-700"
          >
            {{
              formatAmount(
                totalSettled
              )
            }}
          </p>

        </div>

      </div>

      <!-- SETTLED ERROR -->

      <div
        v-if="settledError"
        class="bg-red-100 text-red-700 border border-red-200 rounded-xl p-4 text-sm font-medium"
      >
        {{ settledError }}
      </div>

      <!-- LOADING -->

      <div
        v-if="isSettledLoading"
        class="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500"
      >
        Loading settled delivery orders...
      </div>

      <!-- EMPTY -->

      <div
        v-else-if="
          !settledError &&
          filteredSettledOrders.length === 0
        "
        class="bg-white border border-gray-200 rounded-2xl p-12 text-center"
      >

        <div class="text-4xl mb-3">
          —
        </div>

        <h2
          class="font-black text-gray-700"
        >
          No Settled Delivery Orders
        </h2>

        <p
          class="text-sm text-gray-400 mt-1"
        >
          Walang delivery order na na-settle para sa napiling araw.
        </p>

      </div>

      <!-- SETTLED TABLE -->

      <div
        v-else-if="
          !settledError &&
          filteredSettledOrders.length > 0
        "
        class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
      >

        <div class="overflow-x-auto">

          <table
            class="w-full text-sm text-left"
          >

            <thead
              class="bg-gray-50 border-b border-gray-200"
            >

              <tr>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Settled Time
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Customer
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Contact
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Payment
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700"
                >
                  Rider Settlement
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700 text-right"
                >
                  Amount
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700 text-center"
                >
                  Status
                </th>

                <th
                  class="px-4 py-3 font-bold text-gray-700 text-center"
                >
                  Action
                </th>

              </tr>

            </thead>

            <tbody
              class="divide-y divide-gray-100"
            >

              <tr
                v-for="sale in filteredSettledOrders"
                :key="sale._id"
                class="hover:bg-green-50"
              >

                <td
                  class="px-4 py-4 text-gray-500 whitespace-nowrap"
                >
                  {{
                    formatDate(
                      getSettlementDate(
                        sale
                      )
                    )
                  }}
                </td>

                <td
                  class="px-4 py-4"
                >

                  <p
                    class="font-bold text-gray-800"
                  >
                    {{
                      sale.order?.customer?.name ||
                      '—'
                    }}
                  </p>

                </td>

                <td
                  class="px-4 py-4 text-gray-600"
                >
                  {{
                    sale.order?.customer?.contactNumber ||
                    '—'
                  }}
                </td>

                <td
                  class="px-4 py-4 min-w-[180px]"
                >

                  <!-- PAYMENT METHOD -->

                  <div
                    class="flex flex-wrap gap-1.5"
                  >

                    <span
                      v-for="method in [
                        ...new Set(
                          getPaymentsArray(sale)
                            .filter(
                              payment =>
                                payment.type !==
                                'Refund'
                            )
                            .map(
                              payment =>
                                payment.paymentMethod
                            )
                        )
                      ]"
                      :key="method"
                      class="inline-flex px-2.5 py-1 rounded-full text-xs font-bold"
                      :class="
                        method === 'Cash'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      "
                    >
                      {{ method }}
                    </span>

                    <!-- FALLBACK FOR OLD RECORDS -->

                    <span
                      v-if="
                        getPaymentsArray(sale).length === 0
                      "
                      class="inline-flex px-2.5 py-1 rounded-full text-xs font-bold"
                      :class="
                        sale.paymentMethod === 'Cash'
                          ? 'bg-green-100 text-green-700'
                          : sale.paymentMethod === 'GCash'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                      "
                    >
                      {{
                        sale.paymentMethod ||
                        '-'
                      }}
                    </span>

                  </div>

                  <!-- GCASH REFERENCE -->

                  <div
                    v-if="
                      getPaymentsArray(sale).some(
                        payment =>
                          payment.paymentMethod ===
                            'GCash' &&
                          payment.referenceNumber
                      )
                    "
                    class="mt-2 space-y-1"
                  >

                    <p
                      class="text-[11px] font-bold text-purple-600"
                    >
                      GCash Ref:
                    </p>

                    <p
                      v-for="payment in getPaymentsArray(sale).filter(
                        payment =>
                          payment.paymentMethod ===
                            'GCash' &&
                          payment.referenceNumber
                      )"
                      :key="payment._id"
                      class="text-xs text-gray-600 break-all"
                    >
                      {{ payment.referenceNumber }}
                    </p>

                  </div>

                </td>

                <!-- RIDER SETTLEMENT -->

                <td
                  class="px-4 py-4 min-w-[220px]"
                >

                  <!-- CUSTOMER PAYS RIDER -->

                  <div
                    v-if="
                      sale.order?.deliveryFeePaidBy !==
                      'Store'
                    "
                    class="space-y-1"
                  >

                    <span
                      class="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold"
                    >
                      Customer → Rider
                    </span>

                    <p
                      v-if="
                        Number(
                          sale.order?.deliveryFee ||
                            0
                        ) > 0
                      "
                      class="text-xs text-gray-500"
                    >
                      {{
                        formatAmount(
                          sale.order?.deliveryFee
                        )
                      }}
                    </p>

                  </div>

                  <!-- STORE PAYS RIDER -->

                  <div
                    v-else
                    class="space-y-2"
                  >

                    <!-- PENDING -->

                    <div
                      v-if="
                        getRiderSettlementStatus(
                          sale
                        ) === 'Pending'
                      "
                    >

                      <span
                        class="inline-flex px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold"
                      >
                        Pending
                      </span>

                      <p
                        class="text-xs text-gray-500 mt-1"
                      >
                        Rider:
                        {{
                          formatAmount(
                            getRiderSettlementAmount(
                              sale
                            )
                          )
                        }}
                      </p>

                    </div>

                    <!-- PAID -->

                    <div
                      v-else-if="
                        getRiderSettlementStatus(
                          sale
                        ) === 'Paid'
                      "
                    >

                      <span
                        class="inline-flex px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"
                      >
                        Paid
                      </span>

                      <p
                        class="text-xs text-gray-700 mt-1 font-bold"
                      >
                        {{
                          sale.order?.riderSettlement?.riderName ||
                          'Rider'
                        }}
                      </p>

                      <p
                        class="text-xs text-gray-500"
                      >
                        {{
                          formatAmount(
                            getRiderSettlementAmount(
                              sale
                            )
                          )
                        }}
                      </p>

                      <p
                        v-if="
                          sale.order?.riderSettlement?.paidAt
                        "
                        class="text-[11px] text-gray-400"
                      >
                        {{
                          formatDate(
                            sale.order.riderSettlement.paidAt
                          )
                        }}
                      </p>

                    </div>

                    <!-- FALLBACK -->

                    <div
                      v-else
                    >

                      <span
                        class="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold"
                      >
                        Not Required
                      </span>

                    </div>

                  </div>

                </td>

                <td
                  class="px-4 py-4 text-right font-black text-gray-800 whitespace-nowrap"
                >
                  {{
                    formatAmount(
                      sale.amount
                    )
                  }}
                </td>

                <td
                  class="px-4 py-4 text-center"
                >

                  <span
                    class="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"
                  >
                    Settled
                  </span>

                </td>

                <td
                  class="px-4 py-4 text-center"
                >

                  <div
                    class="flex justify-center gap-2"
                  >

                    <!-- VIEW -->

                    <button
                      @click="
                        viewSettledOrder(
                          sale
                        )
                      "
                      type="button"
                      title="View settled order"
                      class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
                          d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6S2.25 12 2.25 12Z"
                        />

                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />

                      </svg>

                    </button>

                    <!-- PAY RIDER -->

                    <button
                      v-if="
                        canPayRider(
                          sale
                        )
                      "
                      @click="
                        openRiderSettlementModal(
                          sale
                        )
                      "
                      type="button"
                      title="Pay rider"
                      :disabled="isRiderSettling"
                      class="px-3 py-2 rounded-lg text-white text-xs font-black shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      :style="{
                        backgroundColor:
                          settingsStore.themeColor
                      }"
                    >
                      Pay Rider
                    </button>

                    <!-- REPRINT RECEIPT -->

                    <button
                      @click="
                        printSettledReceipt(
                          sale
                        )
                      "
                      type="button"
                      title="Reprint receipt"
                      class="p-2 rounded-lg text-white transition-colors"
                      :style="{
                        backgroundColor:
                          settingsStore.themeColor
                      }"
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
                          d="M6.75 9V4.5h10.5V9"
                        />

                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M6 18.75h12v-6H6v6Z"
                        />

                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M6.75 13.5H4.5A2.25 2.25 0 0 1 2.25 11.25v-1.5A2.25 2.25 0 0 1 4.5 7.5h15A2.25 2.25 0 0 1 21.75 9.75v1.5A2.25 2.25 0 0 1 19.5 13.5h-2.25"
                        />

                      </svg>

                    </button>

                  </div>

                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </section>

    <!-- ========================= -->
    <!-- SETTLE ORDER MODAL -->
    <!-- ========================= -->

    <div
      v-if="isSettleOpen"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-3 md:p-4"
    >

      <div
        class="bg-white w-full max-w-5xl h-auto md:h-[calc(100vh-32px)] max-h-[94vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >

        <!-- MODAL HEADER -->

        <div
          class="shrink-0 px-4 py-3 md:px-5 md:py-3.5 text-white flex justify-between items-center"
          :style="{
            backgroundColor:
              settingsStore.themeColor
          }"
        >

          <div>

            <h2
              class="text-lg md:text-xl font-black"
            >
              Settle Order
            </h2>

            <p
              class="text-[11px] md:text-xs text-white/70 mt-0.5"
            >
              Record the payment for this delivery order.
            </p>

          </div>

          <button
            @click="
              closeSettleModal()
            "
            type="button"
            class="text-white/80 hover:text-white text-2xl leading-none w-9 h-9 rounded-lg hover:bg-white/10 transition-colors"
            :disabled="isSettling"
          >
            &times;
          </button>

        </div>

        <!-- MODAL BODY -->

        <div
          class="flex-1 min-h-0 overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-4"
        >

          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 h-full min-h-0"
          >

            <!-- ========================= -->
            <!-- LEFT COLUMN -->
            <!-- ========================= -->

            <div
              class="min-w-0 min-h-0 overflow-hidden space-y-3"
            >

              <!-- ERROR -->

              <div
                v-if="error"
                class="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-medium"
              >
                {{ error }}
              </div>

              <!-- ORDER INFO -->

              <div
                class="bg-gray-50 border border-gray-200 rounded-xl p-3"
              >

                <div
                  class="flex items-center justify-between gap-3"
                >

                  <div
                    class="min-w-0"
                  >

                    <p
                      class="text-[10px] text-gray-500"
                    >
                      Customer
                    </p>

                    <p
                      class="font-black text-gray-800 mt-0.5 text-sm truncate"
                    >
                      {{
                        selectedOrder?.customer?.name ||
                        '—'
                      }}
                    </p>

                  </div>

                  <span
                    class="shrink-0 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-black"
                  >
                    Unsettled
                  </span>

                </div>

                <div
                  class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200"
                >

                  <div>

                    <p
                      class="text-[10px] text-gray-500"
                    >
                      Order Type
                    </p>

                    <p
                      class="text-xs font-bold text-gray-800 mt-0.5"
                    >
                      {{
                        selectedOrder?.orderType ||
                        'Delivery'
                      }}
                    </p>

                  </div>

                  <div>

                    <p
                      class="text-[10px] text-gray-500"
                    >
                      Delivery Fee
                    </p>

                    <p
                      class="text-xs font-bold text-gray-800 mt-0.5"
                    >
                      {{
                        formatAmount(
                          selectedOrder?.deliveryFee
                        )
                      }}
                    </p>

                  </div>

                  <div
                    class="col-span-2 flex items-center justify-between gap-2"
                  >

                    <p
                      class="text-[10px] text-gray-500"
                    >
                      Delivery Fee Paid By
                    </p>

                    <span
                      class="px-2 py-1 rounded-full text-[10px] font-black"
                      :class="
                        selectedOrder?.deliveryFeePaidBy ===
                        'Store'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                      "
                    >
                      {{
                        selectedOrder?.deliveryFeePaidBy ===
                        'Store'
                          ? 'Store'
                          : 'Customer'
                      }}
                    </span>

                  </div>

                </div>

              </div>

              <!-- AMOUNT DUE -->

              <div
                class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center"
              >

                <p
                  class="text-xs text-gray-500"
                >
                  Amount Due
                </p>

                <p
                  class="text-3xl md:text-4xl font-black mt-0.5"
                  :style="{
                    color:
                      settingsStore.themeColor
                  }"
                >
                  {{
                    formatAmount(
                      settleAmount
                    )
                  }}
                </p>

              </div>

              <!-- PAYMENT METHOD -->

              <div
                class="border border-gray-200 rounded-xl p-3"
              >

                <label
                  class="block text-xs font-bold text-gray-700 mb-2"
                >
                  Payment Method
                </label>

                <div
                  class="grid grid-cols-3 gap-2"
                >

                  <!-- CASH -->

                  <button
                    type="button"
                    @click="
                      selectPaymentMethod(
                        'Cash'
                      )
                    "
                    :disabled="isSettling"
                    :class="[
                      'h-11 md:h-12 rounded-lg border font-bold transition-all text-xs md:text-sm',
                      paymentMethod === 'Cash'
                        ? 'bg-green-600 text-white border-green-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                      isSettling
                        ? 'cursor-not-allowed opacity-60'
                        : ''
                    ]"
                  >
                    💵 Cash
                  </button>

                  <!-- GCASH -->

                  <button
                    type="button"
                    @click="
                      selectPaymentMethod(
                        'GCash'
                      )
                    "
                    :disabled="isSettling"
                    :class="[
                      'h-11 md:h-12 rounded-lg border font-bold transition-all text-xs md:text-sm',
                      paymentMethod === 'GCash'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                      isSettling
                        ? 'cursor-not-allowed opacity-60'
                        : ''
                    ]"
                  >
                    📱 GCash
                  </button>

                  <!-- SPLIT -->

                  <button
                    type="button"
                    @click="
                      selectPaymentMethod(
                        'Split'
                      )
                    "
                    :disabled="isSettling"
                    :class="[
                      'h-11 md:h-12 rounded-lg border font-bold transition-all text-xs md:text-sm',
                      paymentMethod === 'Split'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                      isSettling
                        ? 'cursor-not-allowed opacity-60'
                        : ''
                    ]"
                  >
                    Split
                  </button>

                </div>

              </div>

              <!-- ========================= -->
              <!-- CASH -->
              <!-- ========================= -->

              <div
                v-if="
                  paymentMethod === 'Cash'
                "
                class="border border-gray-200 rounded-xl p-3 space-y-2"
              >

                <label
                  class="block text-xs font-bold text-gray-700"
                >
                  Amount Tendered
                </label>

                <input
                  :value="
                    amountTendered ||
                    '0'
                  "
                  type="text"
                  readonly
                  inputmode="none"
                  class="w-full p-3 border border-gray-300 rounded-lg outline-none text-2xl font-black text-right bg-gray-50"
                />

                <div
                  class="flex justify-between items-center pt-2 border-t border-gray-100"
                >

                  <span
                    class="text-sm font-bold text-gray-600"
                  >
                    Change
                  </span>

                  <span
                    :class="[
                      'text-xl font-black',
                      change > 0
                        ? 'text-green-600'
                        : 'text-gray-400'
                    ]"
                  >
                    {{
                      formatAmount(
                        change
                      )
                    }}
                  </span>

                </div>

              </div>

              <!-- ========================= -->
              <!-- GCASH -->
              <!-- ========================= -->

              <div
                v-if="
                  paymentMethod ===
                  'GCash'
                "
                class="border border-gray-200 rounded-xl p-3 space-y-2"
              >

                <label
                  class="block text-xs font-bold text-gray-700"
                >
                  GCash Reference Number
                </label>

                <input
                  v-model="
                    referenceNumber
                  "
                  type="text"
                  inputmode="numeric"
                  placeholder="e.g. 10023456789"
                  class="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 font-bold text-base"
                  :disabled="isSettling"
                />

                <p
                  class="text-[10px] text-gray-500"
                >
                  Enter the GCash reference number before confirming payment.
                </p>

              </div>

              <!-- ========================= -->
              <!-- SPLIT PAYMENT -->
              <!-- ========================= -->

              <div
                v-if="
                  paymentMethod ===
                  'Split'
                "
                class="space-y-2.5"
              >

                <!-- SPLIT STATUS -->

                <div
                  class="bg-blue-50 border border-blue-200 rounded-xl p-2.5"
                >

                  <div
                    class="grid grid-cols-3 gap-2 text-center"
                  >

                    <div>

                      <p
                        class="text-[9px] text-gray-500"
                      >
                        Amount Due
                      </p>

                      <p
                        class="text-sm font-black text-gray-800"
                      >
                        {{
                          formatAmount(
                            settleAmount
                          )
                        }}
                      </p>

                    </div>

                    <div>

                      <p
                        class="text-[9px] text-gray-500"
                      >
                        Cash + GCash
                      </p>

                      <p
                        class="text-sm font-black text-blue-700"
                      >
                        {{
                          formatAmount(
                            splitTotal
                          )
                        }}
                      </p>

                    </div>

                    <div>

                      <p
                        class="text-[9px] text-gray-500"
                      >
                        Remaining
                      </p>

                      <p
                        class="text-sm font-black"
                        :class="
                          splitRemaining > 0
                            ? 'text-orange-600'
                            : 'text-green-600'
                        "
                      >
                        {{
                          formatAmount(
                            splitRemaining
                          )
                        }}
                      </p>

                    </div>

                  </div>

                </div>

                <!-- AMOUNTS -->

                <div
                  class="grid grid-cols-2 gap-2"
                >

                  <!-- CASH -->

                  <div
                    class="border border-gray-200 rounded-xl p-2.5"
                  >

                    <label
                      class="block text-[11px] font-bold text-gray-700 mb-1.5"
                    >
                      Cash Amount
                    </label>

                    <button
                      type="button"
                      @click="
                        setKeypadTarget(
                          'splitCashAmount'
                        )
                      "
                      :disabled="isSettling"
                      class="w-full min-h-[52px] p-2.5 border rounded-lg text-xl font-black text-right disabled:cursor-not-allowed disabled:opacity-60"
                      :class="
                        keypadTarget ===
                        'splitCashAmount'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-gray-50'
                      "
                    >
                      ₱{{
                        splitCashAmount ||
                        '0'
                      }}
                    </button>

                  </div>

                  <!-- GCASH -->

                  <div
                    class="border border-gray-200 rounded-xl p-2.5"
                  >

                    <label
                      class="block text-[11px] font-bold text-gray-700 mb-1.5"
                    >
                      GCash Amount
                    </label>

                    <button
                      type="button"
                      @click="
                        setKeypadTarget(
                          'splitGCashAmount'
                        )
                      "
                      :disabled="isSettling"
                      class="w-full min-h-[52px] p-2.5 border rounded-lg text-xl font-black text-right disabled:cursor-not-allowed disabled:opacity-60"
                      :class="
                        keypadTarget ===
                        'splitGCashAmount'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 bg-gray-50'
                      "
                    >
                      ₱{{
                        splitGCashAmount ||
                        '0'
                      }}
                    </button>

                  </div>

                  <!-- CASH TENDERED -->

                  <div
                    v-if="
                      splitCash > 0
                    "
                    class="border border-gray-200 rounded-xl p-2.5"
                  >

                    <label
                      class="block text-[11px] font-bold text-gray-700 mb-1.5"
                    >
                      Cash Tendered
                    </label>

                    <button
                      type="button"
                      @click="
                        setKeypadTarget(
                          'splitCashTendered'
                        )
                      "
                      :disabled="isSettling"
                      class="w-full min-h-[52px] p-2.5 border rounded-lg text-xl font-black text-right disabled:cursor-not-allowed disabled:opacity-60"
                      :class="
                        keypadTarget ===
                        'splitCashTendered'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      "
                    >
                      ₱{{
                        splitCashTendered ||
                        '0'
                      }}
                    </button>

                    <div
                      class="mt-1.5 flex justify-between text-[10px]"
                    >

                      <span
                        class="text-gray-500"
                      >
                        Change
                      </span>

                      <span
                        class="font-black text-green-600"
                      >
                        {{
                          formatAmount(
                            splitChange
                          )
                        }}
                      </span>

                    </div>

                  </div>

                  <!-- GCASH REFERENCE -->

                  <div
                    v-if="
                      splitGCash > 0
                    "
                    class="border border-gray-200 rounded-xl p-2.5"
                  >

                    <label
                      class="block text-[11px] font-bold text-gray-700 mb-1.5"
                    >
                      GCash Reference
                    </label>

                    <input
                      v-model="
                        splitGCashReference
                      "
                      @focus="
                        setKeypadTarget(
                          'splitGCashReference'
                        )
                      "
                      @click="
                        setKeypadTarget(
                          'splitGCashReference'
                        )
                      "
                      type="text"
                      inputmode="numeric"
                      placeholder="Reference number"
                      :disabled="isSettling"
                      class="w-full min-h-[52px] p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <p
                      class="text-[10px] text-gray-500 mt-1"
                    >
                      Tap this field, then use the touchscreen keypad.
                    </p>

                  </div>

                </div>

              </div>

            </div>

            <!-- ========================= -->
            <!-- RIGHT COLUMN -->
            <!-- ========================= -->

            <div
              class="min-w-0 min-h-0 flex flex-col"
            >

              <!-- KEYPAD -->

              <div
                class="bg-gray-100 rounded-xl p-3 md:p-3.5"
              >

                <div
                  class="flex items-center justify-between gap-2 mb-2.5"
                >

                  <div>

                    <p
                      class="text-[10px] font-black uppercase tracking-wide text-gray-500"
                    >
                      Touchscreen Keypad
                    </p>

                    <p
                      class="text-xs font-bold text-gray-700 mt-0.5"
                    >
                      Editing:
                      {{
                        paymentMethod ===
                        'Cash'
                          ? 'Amount Tendered'
                          : paymentMethod ===
                              'Split'
                            ? keypadTarget ===
                                'splitCashAmount'
                              ? 'Cash Amount'
                              : keypadTarget ===
                                  'splitGCashAmount'
                                ? 'GCash Amount'
                                : keypadTarget ===
                                    'splitCashTendered'
                                  ? 'Cash Tendered'
                                  : keypadTarget ===
                                      'splitGCashReference'
                                    ? 'GCash Reference'
                                    : 'Payment Input'
                            : 'No keypad needed'
                      }}
                    </p>

                  </div>

                  <span
                    class="text-[10px] font-black px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600"
                  >
                    {{
                      paymentMethod
                    }}
                  </span>

                </div>

                <!-- KEYPAD -->

                <div
                  v-if="
                    paymentMethod ===
                      'Cash' ||
                    paymentMethod ===
                      'Split'
                  "
                  class="grid grid-cols-3 gap-1.5"
                >

                  <button
                    type="button"
                    @click="
                      appendKey('1')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    1
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('2')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    2
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('3')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    3
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('4')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    4
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('5')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    5
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('6')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    6
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('7')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    7
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('8')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    8
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('9')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    9
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('clear')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm md:text-base font-black shadow-sm hover:bg-red-100 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('0')
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-white border border-gray-200 text-xl md:text-2xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey(
                        'backspace'
                      )
                    "
                    :disabled="isSettling"
                    class="h-12 sm:h-14 md:h-14 rounded-lg bg-gray-200 border border-gray-300 text-lg md:text-xl font-black shadow-sm hover:bg-gray-300 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    @click="
                      appendKey('.')
                    "
                    :disabled="isSettling || keypadTarget === 'splitGCashReference'"
                    class="col-span-3 h-10 md:h-11 rounded-lg bg-white border border-gray-200 text-xl font-black shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    .
                  </button>

                </div>

                <!-- GCASH MESSAGE -->

                <div
                  v-else
                  class="bg-white border border-purple-200 rounded-xl p-4 text-center"
                >

                  <div
                    class="text-3xl mb-2"
                  >
                    📱
                  </div>

                  <p
                    class="font-black text-gray-800 text-sm"
                  >
                    GCash Reference
                  </p>

                  <p
                    class="text-[11px] text-gray-500 mt-1"
                  >
                    Enter the reference number in the left panel.
                  </p>

                </div>

              </div>

              <!-- RIGHT SUMMARY -->

              <div
                class="mt-3 bg-white border border-gray-200 rounded-xl p-3 space-y-2"
              >

                <div
                  class="flex justify-between items-center"
                >

                  <span
                    class="text-xs text-gray-500"
                  >
                    Amount Due
                  </span>

                  <span
                    class="font-black text-gray-800 text-sm"
                  >
                    {{
                      formatAmount(
                        settleAmount
                      )
                    }}
                  </span>

                </div>

                <div
                  class="flex justify-between items-center"
                >

                  <span
                    class="text-xs text-gray-500"
                  >
                    Payment Method
                  </span>

                  <span
                    class="font-black text-sm"
                    :class="
                      paymentMethod === 'Cash'
                        ? 'text-green-600'
                        : paymentMethod === 'GCash'
                          ? 'text-purple-600'
                          : 'text-blue-600'
                    "
                  >
                    {{
                      paymentMethod
                    }}
                  </span>

                </div>

                <!-- CASH SUMMARY -->

                <template
                  v-if="
                    paymentMethod ===
                    'Cash'
                  "
                >

                  <div
                    class="pt-2 border-t border-gray-100 flex justify-between items-center"
                  >

                    <span
                      class="text-xs text-gray-500"
                    >
                      Tendered
                    </span>

                    <span
                      class="font-black text-sm"
                    >
                      {{
                        formatAmount(
                          amountTendered
                        )
                      }}
                    </span>

                  </div>

                  <div
                    class="flex justify-between items-center"
                  >

                    <span
                      class="text-xs font-bold text-gray-600"
                    >
                      Change
                    </span>

                    <span
                      class="text-lg font-black"
                      :class="
                        change > 0
                          ? 'text-green-600'
                          : 'text-gray-400'
                      "
                    >
                      {{
                        formatAmount(
                          change
                        )
                      }}
                    </span>

                  </div>

                </template>

                <!-- GCASH SUMMARY -->

                <template
                  v-else-if="
                    paymentMethod ===
                    'GCash'
                  "
                >

                  <div
                    class="pt-2 border-t border-gray-100 flex justify-between items-center gap-2"
                  >

                    <span
                      class="text-xs text-gray-500"
                    >
                      Reference
                    </span>

                    <span
                      class="text-xs font-bold text-purple-600 text-right break-all max-w-[190px]"
                    >
                      {{
                        referenceNumber ||
                        'Not entered'
                      }}
                    </span>

                  </div>

                </template>

                <!-- SPLIT SUMMARY -->

                <template
                  v-else
                >

                  <div
                    class="pt-2 border-t border-gray-100 grid grid-cols-2 gap-y-1.5 text-xs"
                  >

                    <div
                      class="flex justify-between gap-2"
                    >

                      <span
                        class="text-gray-500"
                      >
                        Cash
                      </span>

                      <span
                        class="font-black"
                      >
                        {{
                          formatAmount(
                            splitCash
                          )
                        }}
                      </span>

                    </div>

                    <div
                      class="flex justify-between gap-2"
                    >

                      <span
                        class="text-gray-500"
                      >
                        GCash
                      </span>

                      <span
                        class="font-black"
                      >
                        {{
                          formatAmount(
                            splitGCash
                          )
                        }}
                      </span>

                    </div>

                    <div
                      class="flex justify-between gap-2"
                    >

                      <span
                        class="text-gray-500"
                      >
                        Total
                      </span>

                      <span
                        class="font-black text-blue-700"
                      >
                        {{
                          formatAmount(
                            splitTotal
                          )
                        }}
                      </span>

                    </div>

                    <div
                      class="flex justify-between gap-2"
                    >

                      <span
                        class="text-gray-500"
                      >
                        Remaining
                      </span>

                      <span
                        class="font-black"
                        :class="
                          splitRemaining > 0
                            ? 'text-orange-600'
                            : 'text-green-600'
                        "
                      >
                        {{
                          formatAmount(
                            splitRemaining
                          )
                        }}
                      </span>

                    </div>

                    <div
                      v-if="
                        splitCash > 0
                      "
                      class="flex justify-between gap-2"
                    >

                      <span
                        class="text-gray-500"
                      >
                        Tendered
                      </span>

                      <span
                        class="font-black"
                      >
                        {{
                          formatAmount(
                            splitCashTenderedValue
                          )
                        }}
                      </span>

                    </div>

                    <div
                      v-if="
                        splitCash > 0
                      "
                      class="flex justify-between gap-2"
                    >

                      <span
                        class="text-gray-500"
                      >
                        Change
                      </span>

                      <span
                        class="font-black text-green-600"
                      >
                        {{
                          formatAmount(
                            splitChange
                          )
                        }}
                      </span>

                    </div>

                  </div>

                </template>

              </div>

              <!-- SPLIT VALIDATION -->

              <div
                v-if="
                  paymentMethod ===
                  'Split'
                "
                class="mt-3"
              >

                <div
                  v-if="
                    splitTotal <
                    settleAmount
                  "
                  class="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700 font-bold"
                >
                  Kulang pa ng
                  {{
                    formatAmount(
                      splitRemaining
                    )
                  }}.
                </div>

                <div
                  v-else-if="
                    splitTotal >
                    settleAmount
                  "
                  class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-bold"
                >
                  Sobra ng
                  {{
                    formatAmount(
                      splitTotal -
                        settleAmount
                    )
                  }}.
                </div>

                <div
                  v-else
                  class="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-bold"
                >
                  Cash + GCash = exact amount due.
                </div>

              </div>

            </div>

          </div>

        </div>

        <!-- FOOTER -->

        <div
          class="shrink-0 p-3 md:p-3.5 bg-gray-50 border-t border-gray-200 flex gap-2.5"
        >

          <button
            @click="
              closeSettleModal()
            "
            type="button"
            :disabled="isSettling"
            class="flex-1 h-11 md:h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            @click="
              settleOrder
            "
            type="button"
            :disabled="
              !isSettleFormValid ||
              isSettling
            "
            class="flex-1 h-11 md:h-12 text-white rounded-xl font-black shadow-md text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            :style="
              isSettleFormValid &&
              !isSettling
                ? {
                    backgroundColor:
                      settingsStore.themeColor
                  }
                : {}
            "
          >
            {{
              isSettling
                ? 'Processing...'
                : paymentMethod ===
                    'Split'
                  ? 'Confirm Split Payment'
                  : 'Settle Payment'
            }}
          </button>

        </div>

      </div>

    </div>

    <!-- ========================= -->
    <!-- RIDER SETTLEMENT MODAL -->
    <!-- ========================= -->

    <div
      v-if="isRiderSettlementOpen"
      class="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
    >

      <div
        class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >

        <!-- HEADER -->

        <div
          class="p-5 text-white flex justify-between items-center"
          :style="{
            backgroundColor:
              settingsStore.themeColor
          }"
        >

          <div>

            <h2
              class="text-xl font-black"
            >
              Pay Rider
            </h2>

            <p
              class="text-xs text-white/70 mt-1"
            >
              Record the delivery fee paid to the rider.
            </p>

          </div>

          <button
            @click="
              closeRiderSettlementModal()
            "
            type="button"
            :disabled="isRiderSettling"
            class="text-white/80 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>

        </div>

        <!-- BODY -->

        <div
          class="p-6 space-y-5"
        >

          <!-- ERROR -->

          <div
            v-if="
              riderSettlementError
            "
            class="bg-red-100 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-bold"
          >
            {{
              riderSettlementError
            }}
          </div>

          <!-- CUSTOMER -->

          <div
            class="bg-gray-50 border border-gray-200 rounded-xl p-4"
          >

            <p
              class="text-xs text-gray-500"
            >
              Customer
            </p>

            <p
              class="font-black text-gray-800 mt-1"
            >
              {{
                selectedRiderOrder?.customer?.name ||
                '—'
              }}
            </p>

          </div>

          <!-- DELIVERY FEE -->

          <div
            class="bg-orange-50 border border-orange-200 rounded-xl p-5 text-center"
          >

            <p
              class="text-xs text-orange-600 font-bold uppercase tracking-wide"
            >
              Delivery Fee to Rider
            </p>

            <p
              class="text-4xl font-black text-orange-700 mt-2"
            >
              {{
                formatAmount(
                  riderSettlementAmount
                )
              }}
            </p>

            <p
              class="text-xs text-orange-600 mt-2"
            >
              Customer paid the delivery fee to the store.
            </p>

          </div>

          <!-- RIDER NAME -->

          <div>

            <label
              class="block text-sm font-bold text-gray-700 mb-2"
            >
              Rider Name
            </label>

            <input
              v-model="riderName"
              type="text"
              autocomplete="off"
              placeholder="Enter rider name"
              class="w-full p-4 border border-gray-300 rounded-xl outline-none focus:ring-2 font-bold text-lg"
              :disabled="isRiderSettling"
            />

            <p
              class="text-xs text-gray-500 mt-2"
            >
              Enter the rider who received the delivery fee.
            </p>

          </div>

          <!-- SUMMARY -->

          <div
            class="border border-gray-200 rounded-xl p-4 space-y-3"
          >

            <div
              class="flex justify-between"
            >

              <span
                class="text-sm text-gray-500"
              >
                Settlement Status
              </span>

              <span
                class="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-black"
              >
                Pending
              </span>

            </div>

            <div
              class="flex justify-between"
            >

              <span
                class="text-sm text-gray-500"
              >
                Amount to Pay
              </span>

              <span
                class="font-black text-gray-800"
              >
                {{
                  formatAmount(
                    riderSettlementAmount
                  )
                }}
              </span>

            </div>

          </div>

        </div>

        <!-- FOOTER -->

        <div
          class="p-4 bg-gray-50 border-t border-gray-200 flex gap-3"
        >

          <button
            @click="
              closeRiderSettlementModal()
            "
            type="button"
            :disabled="
              isRiderSettling
            "
            class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            @click="
              markRiderSettlementPaid
            "
            type="button"
            :disabled="
              !riderName.trim() ||
              isRiderSettling
            "
            class="flex-1 py-3 text-white rounded-xl font-black shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
            :style="
              riderName.trim() &&
              !isRiderSettling
                ? {
                    backgroundColor:
                      settingsStore.themeColor
                  }
                : {}
            "
          >
            {{
              isRiderSettling
                ? 'Processing...'
                : 'Confirm Rider Payment'
            }}
          </button>

        </div>

      </div>

    </div>

  </div>
</template>