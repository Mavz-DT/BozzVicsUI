<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()

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
const keypadTarget = ref('amountTendered')

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
    authStore.user?.role === 'Admin'
  )
})

// =========================
// FETCH UNSETTLED ORDERS
// =========================

const fetchUnsettledOrders = async () => {
  try {
    isLoading.value = true

    error.value = ''

    const res =
      await axios.get(
        '/api/orders/unsettled'
      )

    orders.value = res.data
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

const fetchSettledOrders = async () => {
  try {
    isSettledLoading.value = true
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
      res = await axios.get(
        `/api/payments/sales-records?date=${selectedDate.value}`,
        config
      )
    } else {
      res = await axios.get(
        '/api/payments/sales-records',
        config
      )
    }

    // Only show Delivery orders
    settledOrders.value =
      (res.data || []).filter(
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

const refreshOrders = async () => {
  await Promise.all([
    fetchUnsettledOrders(),
    fetchSettledOrders()
  ])
}

// =========================
// SEARCH UNSETTLED
// =========================

const filteredOrders = computed(() => {
  const query =
    search.value
      .trim()
      .toLowerCase()

  if (!query) {
    return orders.value
  }

  return orders.value.filter(
    order => {
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
    }
  )
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

    if (!query) {
      return settledOrders.value
    }

    return settledOrders.value.filter(
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

        return (
          customerName.includes(query) ||
          contact.includes(query) ||
          address.includes(query) ||
          paymentMethod.includes(query)
        )
      }
    )
  })

// =========================
// TOTALS
// =========================

const totalUnsettled = computed(() => {
  return filteredOrders.value.reduce(
    (sum, order) =>
      sum +
      Number(
        order.netAmount || 0
      ),
    0
  )
})

const totalSettled = computed(() => {
  return filteredSettledOrders.value.reduce(
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

const settleAmount = computed(() => {
  return Number(
    selectedOrder.value?.netAmount ||
      0
  )
})

// =========================
// NORMAL CASH CHANGE
// =========================

const change = computed(() => {
  const tendered =
    Number(
      amountTendered.value || 0
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

const splitCash = computed(() => {
  return Number(
    splitCashAmount.value || 0
  )
})

const splitGCash = computed(() => {
  return Number(
    splitGCashAmount.value || 0
  )
})

const splitCashTenderedValue =
  computed(() => {
    const tendered =
      Number(
        splitCashTendered.value || 0
      )

    // If no separate tendered amount,
    // use Cash Amount itself.
    return tendered > 0
      ? tendered
      : splitCash.value
  })

const splitTotal = computed(() => {
  return (
    splitCash.value +
    splitGCash.value
  )
})

const splitRemaining = computed(() => {
  return Math.max(
    0,
    settleAmount.value -
      splitTotal.value
  )
})

const splitChange = computed(() => {
  if (splitCash.value <= 0) {
    return 0
  }

  return Math.max(
    0,
    splitCashTenderedValue.value -
      splitCash.value
  )
})

const isSplitExact = computed(() => {
  return (
    Math.abs(
      splitTotal.value -
        settleAmount.value
    ) < 0.01
  )
})

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
      if (!isSplitExact.value) {
        return false
      }

      if (splitTotal.value <= 0) {
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

const keypadValue = computed({
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
    }
  }
})

// =========================
// KEYPAD TARGET
// =========================

const setKeypadTarget = target => {
  keypadTarget.value = target
}

// =========================
// NUMERIC KEYPAD
// =========================

const appendKey = key => {
  if (key === 'clear') {
    keypadValue.value = ''
    return
  }

  if (key === 'backspace') {
    keypadValue.value =
      keypadValue.value.slice(
        0,
        -1
      )

    return
  }

  if (key === '.') {
    if (
      keypadValue.value.includes('.')
    ) {
      return
    }

    if (!keypadValue.value) {
      keypadValue.value = '0.'
      return
    }

    keypadValue.value += '.'
    return
  }

  // Maximum 2 decimal places
  if (
    keypadValue.value.includes('.')
  ) {
    const decimalPart =
      keypadValue.value.split(
        '.'
      )[1] || ''

    if (
      decimalPart.length >= 2
    ) {
      return
    }
  }

  // Prevent unnecessary leading zeroes
  if (
    keypadValue.value === '0' &&
    key !== '.'
  ) {
    keypadValue.value = key
    return
  }

  keypadValue.value += key
}

// =========================
// PAYMENT METHOD
// =========================

const selectPaymentMethod =
  method => {
    paymentMethod.value =
      method

    if (method === 'Cash') {
      keypadTarget.value =
        'amountTendered'
    }

    if (method === 'Split') {
      keypadTarget.value =
        'splitCashAmount'
    }
  }

// =========================
// FORMAT AMOUNT
// =========================

const formatAmount = amount => {
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

const formatDate = date => {
  if (!date) {
    return ''
  }

  return new Date(
    date
  ).toLocaleString(
    'en-PH',
    {
      dateStyle: 'medium',
      timeStyle: 'short'
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

const viewOrder = order => {
  const items =
    order.items
      .map(
        item =>
          `${item.name} x${item.quantity}`
      )
      .join('\n')

  alert(
    `Customer: ${order.customer?.name || '—'}\n` +
    `Contact: ${order.customer?.contactNumber || '—'}\n` +
    `Address: ${order.customer?.address || '—'}\n\n` +
    `Items:\n${items}\n\n` +
    `Amount Due: ${formatAmount(
      order.netAmount
    )}`
  )
}

// =========================
// VIEW SETTLED ORDER
// =========================

const viewSettledOrder = sale => {
  const order =
    sale.order || {}

  const items =
    (order.items || [])
      .map(
        item =>
          `${item.name} x${item.quantity}`
      )
      .join('\n')

  const paymentText =
    sale.paymentMethod ||
    '-'

  alert(
    `Customer: ${order.customer?.name || '—'}\n` +
    `Contact: ${order.customer?.contactNumber || '—'}\n` +
    `Address: ${order.customer?.address || '—'}\n\n` +
    `Items:\n${items}\n\n` +
    `Amount: ${formatAmount(
      sale.amount
    )}\n` +
    `Payment: ${paymentText}\n` +
    `Settled: ${formatDate(
      getSettlementDate(sale)
    )}`
  )
}

const printSettledReceipt = sale => {
  const order = sale?.order

  if (!order) {
    return
  }

  const printWindow = window.open(
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
    getSettlementDate(sale)

  const itemsHtml =
    (order.items || [])
      .map(item => {
        const addOnTotal =
          (item.addOns || []).reduce(
            (total, addOn) =>
              total +
              Number(
                addOn.price || 0
              ),
            0
          )

        const unitPrice =
          Number(item.price || 0) +
          addOnTotal

        const addOnsHtml =
          item.addOns?.length
            ? `
              <div class="sub-item">
                + ${item.addOns
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
    sale.payments || []

  let paymentHtml = ''

  if (payments.length > 1) {
    paymentHtml = `
      <div class="section-title">
        PAYMENT DETAILS
      </div>

      ${payments
        .map(
          (payment, index) => `
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
          ${payment?.paymentMethod || sale.paymentMethod || '-'}
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

          .payment-block:first-of-type {
            border-top: none;
            padding-top: 0;
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
              ${receiptDate
                ? new Date(
                    receiptDate
                  ).toLocaleString(
                    'en-PH'
                  )
                : '-'}
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

const openSettleModal = order => {
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

const closeSettleModal = (
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
  if (
    !isSettleFormValid.value ||
    !selectedOrder.value
  ) {
    return
  }

  try {
    isSettling.value =
      true

    error.value = ''
    success.value = ''

    // =========================
    // BUILD PAYMENTS
    // =========================

    let payments = []

    // CASH
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

    // GCASH
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

    // SPLIT
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
        (total, payment) =>
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
    // SAVE PAYMENT
    // =========================

    const res =
      await axios.post(
        '/api/payments',
        {
          orderId:
            selectedOrder.value._id,

          receivedBy:
            authStore.user._id,

          payments
        }
      )

    success.value =
      res.data?.message ||
      'Order settled successfully.'

    // Force close because
    // isSettling is still true.
    closeSettleModal(true)

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

const handleDateChange = async () => {
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

          <p class="text-xs text-white/70">
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
      v-if="error && !isSettleOpen"
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
        placeholder="Search customer, contact, address, or payment..."
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
        v-else-if="filteredOrders.length === 0"
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

                  <p class="truncate">
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

                  <!-- Payment Method -->

                  <div
                    class="flex flex-wrap gap-1.5"
                  >

                    <span
                      v-for="method in [
                        ...new Set(
                          (sale.payments || [])
                            .filter(
                              payment =>
                                payment.type !== 'Refund'
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

                    <!-- Fallback for old records -->

                    <span
                      v-if="
                        !sale.payments?.length
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

                  <!-- GCash Reference -->

                  <div
                    v-if="
                      sale.payments?.some(
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
                      v-for="payment in sale.payments.filter(
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
    <!-- SETTLE MODAL -->
    <!-- ========================= -->

    <div
      v-if="isSettleOpen"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >

      <div
        class="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-xl overflow-y-auto"
      >

        <!-- MODAL HEADER -->

        <div
          class="p-5 text-white flex justify-between items-center sticky top-0 z-10"
          :style="{
            backgroundColor:
              settingsStore.themeColor
          }"
        >

          <div>

            <h2
              class="text-xl font-black"
            >
              Settle Order
            </h2>

            <p
              class="text-xs text-white/70 mt-1"
            >
              Record the payment for this delivery order.
            </p>

          </div>

          <button
            @click="
              closeSettleModal()
            "
            type="button"
            class="text-white/80 hover:text-white text-2xl leading-none"
            :disabled="isSettling"
          >
            &times;
          </button>

        </div>

        <!-- MODAL BODY -->

        <div class="p-6 space-y-5">

          <!-- ERROR -->

          <div
            v-if="error"
            class="bg-red-100 text-red-700 p-3 rounded-lg text-sm font-medium"
          >
            {{ error }}
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
                selectedOrder?.customer?.name ||
                '—'
              }}
            </p>

          </div>

          <!-- AMOUNT -->

          <div class="text-center">

            <p
              class="text-sm text-gray-500"
            >
              Amount Due
            </p>

            <p
              class="text-4xl font-black mt-1"
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

          <div>

            <label
              class="block text-sm font-bold text-gray-700 mb-2"
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
                :class="[
                  'py-3 rounded-xl border font-bold transition-all',
                  paymentMethod === 'Cash'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                :class="[
                  'py-3 rounded-xl border font-bold transition-all',
                  paymentMethod === 'GCash'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                :class="[
                  'py-3 rounded-xl border font-bold transition-all',
                  paymentMethod === 'Split'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
            class="space-y-4"
          >

            <div>

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
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
                class="w-full p-3.5 border border-gray-300 rounded-xl outline-none text-2xl font-black text-right bg-gray-50"
              />

            </div>

            <!-- KEYPAD -->

            <div
              class="bg-gray-100 rounded-2xl p-3"
            >

              <div
                class="grid grid-cols-3 gap-2"
              >

                <button
                  type="button"
                  @click="
                    appendKey('1')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  1
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('2')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  2
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('3')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  3
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('4')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  4
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('5')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  5
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('6')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  6
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('7')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  7
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('8')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  8
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('9')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  9
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('clear')
                  "
                  class="h-14 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base font-black shadow-sm"
                >
                  C
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('0')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black shadow-sm"
                >
                  0
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('backspace')
                  "
                  class="h-14 rounded-xl bg-gray-200 border border-gray-300 text-lg font-black shadow-sm"
                >
                  ←
                </button>

              </div>

              <button
                type="button"
                @click="
                  appendKey('.')
                "
                class="w-full h-12 mt-2 rounded-xl bg-white border border-gray-200 text-lg font-black"
              >
                .
              </button>

            </div>

            <!-- CHANGE -->

            <div
              class="flex justify-between items-center text-lg"
            >

              <span
                class="text-gray-600 font-bold"
              >
                Change
              </span>

              <span
                :class="[
                  'font-black',
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
            class="space-y-4"
          >

            <div>

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                Reference Number
              </label>

              <input
                v-model="
                  referenceNumber
                "
                type="text"
                inputmode="numeric"
                placeholder="e.g. 10023456789"
                class="w-full p-3.5 border border-gray-300 rounded-xl outline-none focus:ring-2 font-bold text-lg"
              />

            </div>

            <p
              class="text-xs text-gray-500"
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
            class="space-y-5"
          >

            <!-- SUMMARY -->

            <div
              class="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2"
            >

              <div class="flex justify-between">

                <span
                  class="text-sm text-gray-600"
                >
                  Amount Due
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  {{
                    formatAmount(
                      settleAmount
                    )
                  }}
                </span>

              </div>

              <div class="flex justify-between">

                <span
                  class="text-sm text-gray-600"
                >
                  Cash + GCash
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
                class="pt-2 border-t border-blue-200 flex justify-between"
              >

                <span
                  class="text-sm font-bold text-gray-600"
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

            </div>

            <!-- CASH AMOUNT -->

            <div
              class="border border-gray-200 rounded-xl p-4"
            >

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
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
                class="w-full p-3.5 border rounded-xl text-2xl font-black text-right transition-colors"
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

            <!-- GCASH AMOUNT -->

            <div
              class="border border-gray-200 rounded-xl p-4"
            >

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
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
                class="w-full p-3.5 border rounded-xl text-2xl font-black text-right transition-colors"
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
              class="border border-gray-200 rounded-xl p-4"
            >

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                Cash Amount Tendered
              </label>

              <button
                type="button"
                @click="
                  setKeypadTarget(
                    'splitCashTendered'
                  )
                "
                class="w-full p-3.5 border rounded-xl text-2xl font-black text-right transition-colors"
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
                class="mt-3 flex justify-between text-sm"
              >

                <span
                  class="text-gray-500"
                >
                  Cash Change
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
            >

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                GCash Reference Number
              </label>

              <input
                v-model="
                  splitGCashReference
                "
                type="text"
                inputmode="numeric"
                placeholder="Enter GCash reference number"
                class="w-full p-3.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 font-bold text-lg"
              />

            </div>

            <!-- KEYPAD -->

            <div
              class="bg-gray-100 rounded-2xl p-3"
            >

              <p
                class="text-xs font-bold text-gray-500 mb-2 text-center"
              >
                Editing:
                {{
                  keypadTarget ===
                  'splitCashAmount'
                    ? 'Cash Amount'
                    : keypadTarget ===
                        'splitGCashAmount'
                      ? 'GCash Amount'
                      : 'Cash Tendered'
                }}
              </p>

              <div
                class="grid grid-cols-3 gap-2"
              >

                <button
                  type="button"
                  @click="
                    appendKey('1')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  1
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('2')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  2
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('3')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  3
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('4')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  4
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('5')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  5
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('6')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  6
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('7')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  7
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('8')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  8
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('9')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
                >
                  9
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('clear')
                  "
                  class="h-14 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base font-black"
                >
                  C
                </button>

                <button
                  type="button"
                  @click="
                    appendKey('0')
                  "
                  class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
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
                  class="h-14 rounded-xl bg-gray-200 border border-gray-300 text-lg font-black"
                >
                  ←
                </button>

              </div>

              <button
                type="button"
                @click="
                  appendKey('.')
                "
                class="w-full h-12 mt-2 rounded-xl bg-white border border-gray-200 text-lg font-black"
              >
                .
              </button>

            </div>

            <!-- VALIDATION -->

            <div
              v-if="
                splitTotal <
                settleAmount
              "
              class="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700 font-bold"
            >
              Kulang pa ng
              {{
                formatAmount(
                  splitRemaining
                )
              }}
              para mabuo ang amount due.
            </div>

            <div
              v-else-if="
                splitTotal >
                settleAmount
              "
              class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-bold"
            >
              Sobra ng
              {{
                formatAmount(
                  splitTotal -
                    settleAmount
                )
              }}
              ang Cash + GCash.
            </div>

            <div
              v-else-if="
                splitCash > 0 &&
                splitGCash > 0
              "
              class="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-bold"
            >
              Cash + GCash = exact amount due.
            </div>

          </div>

        </div>

        <!-- FOOTER -->

        <div
          class="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 sticky bottom-0"
        >

          <button
            @click="
              closeSettleModal()
            "
            type="button"
            :disabled="isSettling"
            class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50"
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
            class="flex-1 py-3 text-white rounded-xl font-bold shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
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

  </div>
</template>