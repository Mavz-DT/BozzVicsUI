<script setup>
import {
  ref,
  computed,
  onMounted
} from 'vue'

import axios from 'axios'

import Draggable from 'vuedraggable'

import { useCartStore } from '../stores/cart'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

import { storeToRefs } from 'pinia'

import CheckoutModal from '../components/CheckoutModal.vue'

const cartStore = useCartStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { cart, totalAmount } = storeToRefs(cartStore)

const isCheckoutOpen = ref(false)

const orderType = ref('')
const selectedOrderNumber = ref(null)
const deliverySetupConfirmed = ref(false)
const discountAmount = ref(0)
const orderNumbers = ref([])

const categories = ref([])
const menus = ref([])
const selectedCategory = ref('')

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

// =========================
// ADMIN
// =========================

const isAdmin = computed(() => {
  return authStore.user?.role === 'Admin'
})

// =========================
// LAYOUT EDITOR
// =========================

const editLayoutMode = ref(false)
const layoutSaving = ref(false)
const layoutMessage = ref('')
const layoutMessageType = ref('success')

let dragOriginalItems = {
  categories: [],
  menus: []
}

const showLayoutMessage = (
  message,
  type = 'success'
) => {
  layoutMessage.value = message
  layoutMessageType.value = type
}

const clearLayoutMessage = () => {
  layoutMessage.value = ''
}

const startLayoutEditor = () => {
  if (!isAdmin.value) {
    return
  }

  editLayoutMode.value = true
  clearLayoutMessage()

  showLayoutMessage(
    'Layout Editor active. Use the ☰ handle to drag categories or menu items.'
  )
}

const stopLayoutEditor = () => {
  editLayoutMode.value = false
  clearLayoutMessage()
}

const toggleEditLayoutMode = () => {
  if (!isAdmin.value) {
    return
  }

  if (editLayoutMode.value) {
    stopLayoutEditor()
  } else {
    startLayoutEditor()
  }
}

// =========================
// DRAG START / END
// =========================

const beginLayoutDrag = kind => {
  if (
    !editLayoutMode.value ||
    !isAdmin.value
  ) {
    return
  }

  dragOriginalItems = {
    categories: categories.value.map(
      category => ({
        ...category
      })
    ),

    menus: menus.value.map(
      menu => ({
        ...menu
      })
    )
  }

  clearLayoutMessage()

  showLayoutMessage(
    kind === 'category'
      ? 'Drag the category to its new position.'
      : 'Drag the menu item to its new position.'
  )
}

const finishLayoutDrag = async (
  kind,
  event
) => {
  if (
    !editLayoutMode.value ||
    !isAdmin.value
  ) {
    return
  }

  const oldIndex =
    Number(event?.oldIndex ?? -1)

  const newIndex =
    Number(event?.newIndex ?? -1)

  if (
    oldIndex < 0 ||
    newIndex < 0 ||
    oldIndex === newIndex
  ) {
    return
  }

  if (kind === 'category') {
    await saveCategoryOrder()
    return
  }

  if (kind === 'menu') {
    await saveMenuOrder()
  }
}

// =========================
// AUTH CONFIG
// =========================

const getAuthConfig = () => {
  const token =
    authStore.getToken()

  if (!token) {
    return {}
  }

  return {
    headers: {
      Authorization:
        `Bearer ${token}`
    }
  }
}

// =========================
// DELIVERY INFORMATION
// =========================

const delivery = ref({
  customerName: '',
  deliveryFee: 0,
  notes: ''
})

// =========================
// ADD-ONS
// =========================

const isAddOnModalOpen =
  ref(false)

const selectedMenuItem =
  ref(null)

const availableAddOns =
  ref([])

const selectedAddOnIds =
  ref([])

const addOnSpecialInstructions =
  ref('')

const fetchAddOns =
  async () => {
    try {
      const res =
        await axios.get(
          `${API}/add-ons`,
          getAuthConfig()
        )

      const data =
        Array.isArray(
          res.data
        )
          ? res.data
          : []

      availableAddOns.value =
        data.filter(
          addOn =>
            addOn.isAvailable
        )
    } catch (error) {
      console.error(
        'Error fetching add-ons:',
        error
      )
    }
  }

const openAddOnModal =
  item => {
    if (
      editLayoutMode.value
    ) {
      return
    }

    if (
      !isMenuOrderable(item)
    ) {
      return
    }

    selectedMenuItem.value =
      item

    selectedAddOnIds.value =
      []

    addOnSpecialInstructions.value =
      ''

    isAddOnModalOpen.value =
      true
  }

const closeAddOnModal =
  () => {
    if (
      isAddOnModalOpen.value
    ) {
      isAddOnModalOpen.value =
        false

      selectedMenuItem.value =
        null

      selectedAddOnIds.value =
        []

      addOnSpecialInstructions.value =
        ''
    }
  }

const toggleAddOn =
  addOnId => {
    const index =
      selectedAddOnIds.value.indexOf(
        addOnId
      )

    if (index === -1) {
      selectedAddOnIds.value.push(
        addOnId
      )
    } else {
      selectedAddOnIds.value.splice(
        index,
        1
      )
    }
  }

const selectedAddOns =
  computed(() => {
    return availableAddOns.value.filter(
      addOn =>
        selectedAddOnIds.value.includes(
          addOn._id
        )
    )
  })

const selectedAddOnTotal =
  computed(() => {
    return selectedAddOns.value.reduce(
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
  })

const addOnItemTotal =
  computed(() => {
    if (
      !selectedMenuItem.value
    ) {
      return 0
    }

    return (
      Number(
        selectedMenuItem.value.price ||
          0
      ) +
      selectedAddOnTotal.value
    )
  })

const confirmAddToCart =
  () => {
    if (
      !selectedMenuItem.value
    ) {
      return
    }

    const menuItem =
      selectedMenuItem.value

    if (
      !isMenuOrderable(
        menuItem
      )
    ) {
      return
    }

    const effectiveCartStock =
      menuItem.stockMonitoring === true
        ? Number(
            menuItem.stock || 0
          )
        : Number.MAX_SAFE_INTEGER

    cartStore.addToCart(
      {
        id:
          menuItem._id,

        name:
          menuItem.name,

        price:
          menuItem.price,

        stock:
          effectiveCartStock,

        actualStock:
          Number(
            menuItem.stock || 0
          ),

        stockMonitoring:
          menuItem.stockMonitoring === true
      },

      selectedAddOns.value,

      addOnSpecialInstructions.value
        .trim()
    )

    closeAddOnModal()
  }

// =========================
// ORDER NUMBERS
// =========================

const fetchOrderNumbers =
  async () => {
    try {
      const res =
        await axios.get(
          `${API}/order-numbers`,
          getAuthConfig()
        )

      orderNumbers.value =
        Array.isArray(
          res.data
        )
          ? res.data
          : []
    } catch (error) {
      console.error(
        'Error fetching order numbers:',
        error
      )
    }
  }

const resetDelivery = () => {
  delivery.value = {
    customerName: '',
    deliveryFee: 0,
    notes: ''
  }
}

const handleOrderTypeChange =
  type => {
    orderType.value = type

    selectedOrderNumber.value =
      null

    deliverySetupConfirmed.value =
      false

    cartStore.clearCart()

    discountAmount.value =
      0

    if (
      type === 'Dine-In' ||
      type === 'Take-Out'
    ) {
      resetDelivery()
      fetchOrderNumbers()
    } else {
      orderNumbers.value = []
    }
  }

const confirmDeliverySetup =
  () => {
    if (
      !delivery.value.customerName.trim()
    ) {
      alert(
        'Maglagay muna ng Customer Name.'
      )

      return
    }

    if (
      Number(
        delivery.value.deliveryFee
      ) < 0
    ) {
      alert(
        'Hindi puwedeng negative ang Delivery Fee.'
      )

      return
    }

    deliverySetupConfirmed.value =
      true
  }

const releaseOrderNumber =
  async number => {
    if (!number) {
      return
    }

    const confirmed =
      window.confirm(
        `Release Order #${number}?`
      )

    if (!confirmed) {
      return
    }

    try {
      await axios.put(
        `${API}/order-numbers/${number}/release`,
        {},
        getAuthConfig()
      )

      selectedOrderNumber.value =
        null

      await fetchOrderNumbers()

      alert(
        `Order #${number} is now available.`
      )
    } catch (error) {
      console.error(
        'Error releasing order number:',
        error
      )

      alert(
        error.response?.data?.message ||
          'Hindi ma-release ang order number.'
      )
    }
  }

// =========================
// ORDER SETUP
// =========================

const isOrderSetupComplete =
  computed(() => {
    if (!orderType.value) {
      return false
    }

    if (
      orderType.value ===
        'Dine-In' ||
      orderType.value ===
        'Take-Out'
    ) {
      return Boolean(
        selectedOrderNumber.value
      )
    }

    if (
      orderType.value ===
      'Delivery'
    ) {
      return (
        deliverySetupConfirmed.value
      )
    }

    return false
  })

const canProceedToCheckout =
  computed(() => {
    if (
      cart.value.length ===
      0
    ) {
      return false
    }

    if (
      !isOrderSetupComplete.value
    ) {
      return false
    }

    if (
      orderType.value ===
      'Delivery'
    ) {
      if (
        Number(
          delivery.value.deliveryFee
        ) < 0
      ) {
        return false
      }
    }

    return true
  })

const finalTotal =
  computed(() => {
    const grossAmount =
      Number(
        totalAmount.value || 0
      )

    const discount =
      Number(
        discountAmount.value ||
          0
      )

    const deliveryFee =
      Number(
        delivery.value
          .deliveryFee ||
          0
      )

    return Math.max(
      0,
      grossAmount -
        discount +
        deliveryFee
    )
  })

// =========================
// KITCHEN TICKET
// =========================

const printKitchenTicket =
  order => {
    const printWindow =
      window.open(
        '',
        '_blank',
        'width=400,height=700'
      )

    if (!printWindow) {
      alert(
        'Hindi mabuksan ang KOT print window. I-check ang browser popup blocker.'
      )

      return
    }

    const orderNumber =
      order.orderNumber
        ? `#${order.orderNumber}`
        : 'DELIVERY'

    const itemsHtml =
      order.items
        .map(
          item => `
            <div class="item">

              <div class="qty">
                ${item.quantity}x
              </div>

              <div class="name">

                ${item.name}

                ${
                  item.addOns?.length
                    ? `
                      <div class="instruction">
                        Add-ons:
                        ${item.addOns
                          .map(
                            addOn =>
                              `${addOn.name} (+₱${Number(
                                addOn.price
                              ).toFixed(2)})`
                          )
                          .join(', ')}
                      </div>
                    `
                    : ''
                }

                ${
                  item.specialInstructions
                    ? `
                      <div class="instruction">
                        Note:
                        ${item.specialInstructions}
                      </div>
                    `
                    : ''
                }

              </div>

            </div>
          `
        )
        .join('')

    const customerSection =
      order.orderType ===
        'Delivery' &&
      order.customer?.name
        ? `
          <div class="meta-row">

            <span class="label">
              Customer
            </span>

            <span>
              ${order.customer.name}
            </span>

          </div>
        `
        : ''

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            Kitchen Order Ticket
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
            }

            .title {
              font-size: 18px;
              font-weight: 900;
              margin-top: 5px;
            }

            .meta {
              margin-bottom: 10px;
            }

            .meta-row {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 4px;
              font-size: 13px;
            }

            .label {
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
              padding-left: 6px;
              border-left: 3px solid #000;
              font-size: 12px;
              font-weight: 400;
            }

            .footer {
              margin-top: 12px;
              text-align: center;
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

            <div class="title">
              KITCHEN ORDER TICKET
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
                Date
              </span>

              <span>
                ${new Date(
                  order.createdAt
                ).toLocaleDateString(
                  'en-PH'
                )}
              </span>

            </div>

            <div class="meta-row">

              <span class="label">
                Time
              </span>

              <span>
                ${new Date(
                  order.createdAt
                ).toLocaleTimeString(
                  'en-PH',
                  {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit'
                  }
                )}
              </span>

            </div>

            ${customerSection}

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

// =========================
// CUSTOMER RECEIPT
// =========================

const printCustomerReceipt =
  (
    order,
    paymentDetails = null
  ) => {
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

    const itemsHtml =
      order.items
        .map(item => {
          const addOnTotal =
            (item.addOns || [])
              .reduce(
                (
                  total,
                  addOn
                ) =>
                  total +
                  Number(
                    addOn.price ||
                      0
                  ),
                0
              )

          const unitPrice =
            Number(
              item.price || 0
            ) +
            addOnTotal

          const addOnsHtml =
            item.addOns?.length
              ? `
                <div class="sub-item">
                  + ${item.addOns
                    .map(
                      addOn =>
                        `${addOn.name} (${Number(
                          addOn.price
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
                    item.subtotal
                  ).toFixed(2)}
                </span>

              </div>

              <div class="unit-price">
                ₱${unitPrice.toFixed(2)}
                each
              </div>

              ${addOnsHtml}
              ${instructionHtml}

            </div>
          `
        })
        .join('')

    let paymentHtml =
      ''

    if (!paymentDetails) {
      paymentHtml = `
        <div class="summary-row">

          <span>
            Payment Status
          </span>

          <span>
            UNSETTLED
          </span>

        </div>
      `
    } else if (
      paymentDetails.payments?.length >
      1
    ) {
      paymentHtml = `
        <div class="section-title">
          PAYMENT DETAILS
        </div>
      `

      paymentHtml +=
        paymentDetails.payments
          .map(
            (
              payment,
              index
            ) => `
              <div class="payment-block">

                <div class="summary-row">

                  <span>
                    Payment
                    ${index + 1}
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
                      payment.amount ||
                        0
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
                            payment.amountTendered ||
                              0
                          ).toFixed(2)}
                        </span>

                      </div>

                      <div class="summary-row">

                        <span>
                          Change
                        </span>

                        <span>
                          ₱${Number(
                            payment.change ||
                              0
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
          .join('')
    } else {
      const payment =
        paymentDetails
          .payments?.[0] ||
        paymentDetails

      paymentHtml = `
        <div class="summary-row">

          <span>
            Payment
          </span>

          <span>
            ${payment.paymentMethod}
          </span>

        </div>

        ${
          payment.paymentMethod ===
          'Cash'
            ? `
              <div class="summary-row">

                <span>
                  Amount
                </span>

                <span>
                  ₱${Number(
                    payment.amount ||
                      order.netAmount ||
                      0
                  ).toFixed(2)}
                </span>

              </div>

              <div class="summary-row">

                <span>
                  Amount Tendered
                </span>

                <span>
                  ₱${Number(
                    payment.amountTendered ||
                      0
                  ).toFixed(2)}
                </span>

              </div>

              <div class="summary-row">

                <span>
                  Change
                </span>

                <span>
                  ₱${Number(
                    payment.change ||
                      0
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
      `
    }

    const deliveryHtml =
      order.orderType ===
      'Delivery'
        ? `
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

          </div>
        `
        : ''

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
                Date
              </span>

              <span>
                ${new Date(
                  order.createdAt
                ).toLocaleString(
                  'en-PH'
                )}
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
                  order.grossAmount ||
                    0
                ).toFixed(2)}
              </span>

            </div>

            ${
              Number(
                order.discountAmount ||
                  0
              ) > 0
                ? `
                  <div class="summary-row">

                    <span>
                      Discount
                    </span>

                    <span>
                      -₱${Number(
                        order.discountAmount ||
                          0
                      ).toFixed(2)}
                    </span>

                  </div>
                `
                : ''
            }

            ${
              Number(
                order.deliveryFee ||
                  0
              ) > 0
                ? `
                  <div class="summary-row">

                    <span>
                      Delivery Fee
                    </span>

                    <span>
                      ₱${Number(
                        order.deliveryFee ||
                          0
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
                  order.netAmount ||
                    0
                ).toFixed(2)}
              </span>

            </div>

            ${paymentHtml}

          </div>

          <div class="footer">
            Thank you for dining with us!
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
// HANDLE PAYMENT
// =========================

const handlePayment =
  async paymentDetails => {
    try {
      if (
        !canProceedToCheckout.value
      ) {
        alert(
          'Complete muna ang order details bago mag-checkout.'
        )

        return
      }

      const discount =
        Number(
          discountAmount.value ||
            0
        )

      if (discount < 0) {
        alert(
          'Hindi puwedeng negative ang discount.'
        )

        return
      }

      if (
        discount >
        Number(
          totalAmount.value ||
            0
        )
      ) {
        alert(
          'Hindi puwedeng mas mataas ang discount kaysa Gross Sales.'
        )

        return
      }

      // =========================
      // BUILD ORDER ITEMS
      // =========================

      const orderItems =
        cartStore.cart.map(
          item => ({
            menuId:
              item.menuId,

            name:
              item.name,

            quantity:
              item.quantity,

            price:
              item.price,

            addOns:
              (item.addOns || [])
                .map(
                  addOn => ({
                    addOnId:
                      addOn.addOnId,

                    name:
                      addOn.name,

                    price:
                      Number(
                        addOn.price ||
                          0
                      )
                  })
                ),

            subtotal:
              cartStore.getItemUnitPrice(
                item
              ) *
              item.quantity,

            specialInstructions:
              item.specialInstructions ||
              ''
          })
        )

      // =========================
      // BUILD ORDER
      // =========================

      const orderData = {
        cashier:
          authStore.user._id,

        items:
          orderItems,

        orderType:
          orderType.value,

        orderNumber:
          orderType.value ===
          'Delivery'
            ? null
            : selectedOrderNumber.value,

        customer:
          orderType.value ===
          'Delivery'
            ? {
                name:
                  delivery.value.customerName.trim(),

                notes:
                  delivery.value.notes.trim()
              }
            : {},

        deliveryFee:
          orderType.value ===
          'Delivery'
            ? Number(
                delivery.value.deliveryFee ||
                  0
              )
            : 0,

        discountAmount:
          discount,

        paymentStatus:
          paymentDetails.paymentStatus,

        notes:
          orderType.value ===
          'Delivery'
            ? delivery.value.notes.trim()
            : ''
      }

      // =========================
      // CREATE ORDER
      // =========================

      const orderResponse =
        await axios.post(
          `${API}/orders`,
          orderData,
          getAuthConfig()
        )

      const createdOrder =
        orderResponse.data.order

      // =========================
      // PRINT KOT
      // =========================

      printKitchenTicket(
        createdOrder
      )

      // =========================
      // UNSETTLED DELIVERY
      // =========================

      if (
        paymentDetails.paymentStatus ===
        'Unsettled'
      ) {
        alert(
          `Unsettled delivery order saved!\nOrder ID: ${createdOrder._id}`
        )
      } else {
        // =========================
        // NORMALIZE PAYMENT LIST
        // =========================

        const paymentList =
          Array.isArray(
            paymentDetails.payments
          ) &&
          paymentDetails.payments.length >
            0
            ? paymentDetails.payments
            : [
                {
                  paymentMethod:
                    paymentDetails.paymentMethod,

                  amount:
                    Number(
                      paymentDetails.amount ??
                        createdOrder.netAmount
                    ),

                  amountTendered:
                    Number(
                      paymentDetails.amountTendered ||
                        0
                    ),

                  change:
                    Number(
                      paymentDetails.change ||
                        0
                    ),

                  referenceNumber:
                    paymentDetails.referenceNumber ||
                    ''
                }
              ]

        // =========================
        // VALIDATE PAYMENT LIST
        // =========================

        if (
          paymentList.length ===
          0
        ) {
          throw new Error(
            'Walang payment information.'
          )
        }

        // =========================
        // VALIDATE TOTAL
        // =========================

        const paymentTotal =
          paymentList.reduce(
            (
              total,
              payment
            ) =>
              total +
              Number(
                payment.amount ||
                  0
              ),
            0
          )

        const orderTotal =
          Number(
            createdOrder.netAmount ||
              0
          )

        if (
          Math.abs(
            paymentTotal -
              orderTotal
          ) > 0.01
        ) {
          throw new Error(
            `Payment total (${paymentTotal.toFixed(2)}) does not match order total (${orderTotal.toFixed(2)}).`
          )
        }

        // =========================
        // CREATE ALL PAYMENTS
        // ONE REQUEST
        // =========================

        const paymentResponse =
          await axios.post(
            `${API}/payments`,
            {
              orderId:
                createdOrder._id,

              receivedBy:
                authStore.user._id,

              payments:
                paymentList.map(
                  payment => ({
                    paymentMethod:
                      payment.paymentMethod,

                    amount:
                      Number(
                        payment.amount ||
                          0
                      ),

                    amountTendered:
                      Number(
                        payment.amountTendered ||
                          0
                      ),

                    change:
                      Number(
                        payment.change ||
                          0
                      ),

                    referenceNumber:
                      payment.referenceNumber ||
                      ''
                  })
                )
            },
            getAuthConfig()
          )

        const createdPayments =
          paymentResponse.data
            ?.payments || []

        // =========================
        // SUCCESS
        // =========================

        alert(
          `Payment successful!\nOrder ID: ${createdOrder._id}\nPayments: ${createdPayments.length}`
        )
      }

      // =========================
      // PRINT RECEIPT
      // =========================

      if (
        paymentDetails.paymentStatus !==
        'Unsettled'
      ) {
        const shouldPrintReceipt =
          window.confirm(
            'Print customer receipt?'
          )

        if (
          shouldPrintReceipt
        ) {
          printCustomerReceipt(
            createdOrder,
            paymentDetails
          )
        }
      }

      // =========================
      // RESET POS
      // =========================

      cartStore.clearCart()

      isCheckoutOpen.value =
        false

      orderType.value =
        ''

      selectedOrderNumber.value =
        null

      deliverySetupConfirmed.value =
        false

      discountAmount.value =
        0

      resetDelivery()

      await fetchData()
      await fetchOrderNumbers()

    } catch (error) {
      console.error(
        'Error processing order:',
        error
      )

      alert(
        error.response?.data
          ?.message ||
          error.message ||
          'May naging problema sa pag-process ng order.'
      )
    }
  }

// =========================
// FETCH DATA
// =========================

const fetchData =
  async () => {
    try {
      const catRes =
        await axios.get(
          `${API}/categories`,
          getAuthConfig()
        )

      const menuRes =
        await axios.get(
          `${API}/menus`,
          getAuthConfig()
        )

      const categoryData =
        Array.isArray(
          catRes.data
        )
          ? catRes.data
          : []

      const menuData =
        Array.isArray(
          menuRes.data
        )
          ? menuRes.data
          : []

      categories.value =
        categoryData

      menus.value =
        menuData

      if (
        categories.value
          .length > 0
      ) {
        const categoryStillExists =
          categories.value.some(
            category =>
              category.name ===
              selectedCategory.value
          )

        if (
          !categoryStillExists
        ) {
          selectedCategory.value =
            categories.value[0].name
        }
      } else {
        selectedCategory.value =
          ''
      }

      console.log(
        'POS categories:',
        categories.value
      )

      console.log(
        'POS menus:',
        menus.value
      )
    } catch (error) {
      console.error(
        'Error fetching data:',
        error
      )

      console.error(
        'Status:',
        error.response?.status
      )

      console.error(
        'Response:',
        error.response?.data
      )
    }
  }

// =========================
// CATEGORY CLICK
// =========================

const handleCategoryClick =
  categoryName => {
    if (
      editLayoutMode.value
    ) {
      return
    }

    selectedCategory.value =
      categoryName
  }

// =========================
// SAVE CATEGORY ORDER
// =========================

const saveCategoryOrder =
  async () => {
    if (
      !isAdmin.value ||
      categories.value.length ===
        0
    ) {
      return
    }

    layoutSaving.value = true
    clearLayoutMessage()

    try {
      const categoryIds =
        categories.value.map(
          category =>
            category._id
        )

      const response =
        await axios.put(
          `${API}/categories/reorder`,
          {
            categoryIds
          },
          getAuthConfig()
        )

      if (
        Array.isArray(
          response.data?.categories
        )
      ) {
        categories.value =
          response.data.categories
      }

      showLayoutMessage(
        'Category layout saved.'
      )
    } catch (error) {
      console.error(
        'Error saving category layout:',
        error
      )

      categories.value =
        dragOriginalItems.categories.map(
          category => ({
            ...category
          })
        )

      showLayoutMessage(
        error.response?.data?.message ||
          'Hindi na-save ang category layout.',
        'error'
      )
    } finally {
      layoutSaving.value = false
    }
  }

// =========================
// SAVE MENU ORDER
// =========================

const getCurrentCategoryId = () => {
  const category =
    categories.value.find(
      item =>
        item.name ===
        selectedCategory.value
    )

  return category?._id || null
}

const saveMenuOrder =
  async () => {
    if (!isAdmin.value) {
      return
    }

    const categoryId =
      getCurrentCategoryId()

    if (!categoryId) {
      return
    }

    const menuIds =
      filteredMenus.value.map(
        menu =>
          menu._id
      )

    if (
      menuIds.length === 0
    ) {
      return
    }

    layoutSaving.value = true
    clearLayoutMessage()

    try {
      const response =
        await axios.put(
          `${API}/menus/reorder`,
          {
            categoryId,
            menuIds
          },
          getAuthConfig()
        )

      if (
        Array.isArray(
          response.data?.menus
        )
      ) {
        menus.value =
          response.data.menus
      }

      showLayoutMessage(
        'Menu item layout saved.'
      )
    } catch (error) {
      console.error(
        'Error saving menu layout:',
        error
      )

      menus.value =
        dragOriginalItems.menus.map(
          menu => ({
            ...menu
          })
        )

      showLayoutMessage(
        error.response?.data?.message ||
          'Hindi na-save ang menu item layout.',
        'error'
      )
    } finally {
      layoutSaving.value = false
    }
  }

// =========================
// FILTERED MENU
// Writable computed
// =========================

const filteredMenus =
  computed({
    get() {
      if (
        !selectedCategory.value
      ) {
        return []
      }

      return menus.value
        .filter(
          menu =>
            menu.category &&
            menu.category.name ===
              selectedCategory.value
        )
        .slice()
        .sort(
          (a, b) =>
            Number(
              a.sortOrder ?? 0
            ) -
            Number(
              b.sortOrder ?? 0
            )
        )
    },

    set(reorderedList) {
      const reorderedMenus =
        reorderedList.map(
          (
            menu,
            index
          ) => ({
            ...menu,
            sortOrder: index
          })
        )

      const reorderMap =
        new Map(
          reorderedMenus.map(
            menu => [
              menu._id,
              menu
            ]
          )
        )

      menus.value =
        menus.value.map(
          menu =>
            reorderMap.get(
              menu._id
            ) || menu
        )
    }
  })

// =========================
// MENU STOCK / AVAILABILITY
// =========================

const isMenuOrderable =
  item => {
    if (!item) {
      return false
    }

    if (
      item.isAvailable === false
    ) {
      return false
    }

    /*
     * Stock only matters when monitoring is ON.
     */
    if (
      item.stockMonitoring === true &&
      Number(item.stock || 0) <= 0
    ) {
      return false
    }

    return true
  }

const isMenuStockMonitored =
  item => {
    return item?.stockMonitoring === true
  }

const menuStockLabel =
  item => {
    if (
      item?.isAvailable === false
    ) {
      return 'Unavailable'
    }

    if (
      !isMenuStockMonitored(item)
    ) {
      return 'Not Monitored'
    }

    if (
      Number(item.stock || 0) <= 0
    ) {
      return 'Out of Stock'
    }

    return `${item.stock} in stock`
  }

// =========================
// MENU CARD CLICK
// =========================

const handleMenuCardClick =
  item => {
    if (
      editLayoutMode.value
    ) {
      return
    }

    if (
      !isMenuOrderable(item)
    ) {
      return
    }

    openAddOnModal(item)
  }

// =========================
// INITIAL LOAD
// =========================

onMounted(() => {
  fetchData()
  fetchAddOns()
  fetchOrderNumbers()
})
</script>

<template>
  <div
    class="flex flex-col md:flex-row-reverse h-full min-h-0 overflow-hidden bg-slate-50 font-sans"
  >

    <!-- ========================= -->
    <!-- ORDER SETUP / MAIN AREA -->
    <!-- ========================= -->

    <div
      class="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto"
    >

      <div class="max-w-7xl mx-auto">

        <!-- Page Header -->

        <div
          class="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
        >

          <div>

            <h1
              class="text-2xl md:text-3xl font-black text-gray-800"
            >
              Point of Sale
            </h1>

            <p
              v-if="editLayoutMode"
              class="text-sm text-gray-500 mt-1"
            >
              Layout Editor — arrange your categories and menu items visually.
            </p>

            <p
              v-else-if="!orderType"
              class="text-sm text-gray-500 mt-1"
            >
              Select order type to begin.
            </p>

            <p
              v-else-if="!isOrderSetupComplete"
              class="text-sm text-gray-500 mt-1"
            >
              Complete the order details before selecting menu items.
            </p>

            <p
              v-else
              class="text-sm text-gray-500 mt-1"
            >
              Select menu items to add to the current order.
            </p>

          </div>

          <!-- Admin Layout Button -->

          <button
            v-if="isAdmin"
            type="button"
            @click="toggleEditLayoutMode"
            class="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors shadow-sm"
            :class="
              editLayoutMode
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            "
          >
            {{
              editLayoutMode
                ? 'Exit Layout'
                : 'Edit Layout'
            }}
          </button>

        </div>

        <!-- ========================= -->
        <!-- ORDER SETUP -->
        <!-- ========================= -->

        <div
          v-if="
            !isOrderSetupComplete &&
            !editLayoutMode
          "
          class="max-w-3xl mx-auto"
        >

          <div
            class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
          >

            <!-- Header -->

            <div
              class="px-5 py-4 text-white"
              :style="{
                backgroundColor:
                  settingsStore.themeColor
              }"
            >

              <div
                class="flex items-center justify-between"
              >

                <div>

                  <h2
                    class="font-black text-lg"
                  >
                    Order Setup
                  </h2>

                  <p
                    class="text-sm text-white/70 mt-0.5"
                  >
                    Start by selecting the order type.
                  </p>

                </div>

                <span
                  v-if="orderType"
                  class="text-xs font-bold px-3 py-1 rounded-full bg-white/10"
                >
                  {{ orderType }}
                </span>

              </div>

            </div>

            <div class="p-5 space-y-5">

              <!-- Order Type -->

              <div>

                <h3
                  class="text-sm font-black text-gray-700 mb-3"
                >
                  Order Type
                </h3>

                <div
                  class="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >

                  <button
                    type="button"
                    @click="
                      handleOrderTypeChange(
                        'Dine-In'
                      )
                    "
                    :style="
                      orderType ===
                      'Dine-In'
                        ? {
                            backgroundColor:
                              settingsStore.themeColor,
                            borderColor:
                              settingsStore.themeColor
                          }
                        : {}
                    "
                    :class="[
                      'py-4 px-3 rounded-xl border text-sm font-bold transition-colors',
                      orderType ===
                      'Dine-In'
                        ? 'text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    ]"
                  >
                    Dine-In
                  </button>

                  <button
                    type="button"
                    @click="
                      handleOrderTypeChange(
                        'Take-Out'
                      )
                    "
                    :style="
                      orderType ===
                      'Take-Out'
                        ? {
                            backgroundColor:
                              settingsStore.themeColor,
                            borderColor:
                              settingsStore.themeColor
                          }
                        : {}
                    "
                    :class="[
                      'py-4 px-3 rounded-xl border text-sm font-bold transition-colors',
                      orderType ===
                      'Take-Out'
                        ? 'text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    ]"
                  >
                    Take-Out
                  </button>

                  <button
                    type="button"
                    @click="
                      handleOrderTypeChange(
                        'Delivery'
                      )
                    "
                    :style="
                      orderType ===
                      'Delivery'
                        ? {
                            backgroundColor:
                              settingsStore.themeColor,
                            borderColor:
                              settingsStore.themeColor
                          }
                        : {}
                    "
                    :class="[
                      'py-4 px-3 rounded-xl border text-sm font-bold transition-colors',
                      orderType ===
                      'Delivery'
                        ? 'text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    ]"
                  >
                    Delivery
                  </button>

                </div>

              </div>

              <!-- Order Numbers -->

              <div
                v-if="
                  orderType ===
                    'Dine-In' ||
                  orderType ===
                    'Take-Out'
                "
                class="pt-5 border-t border-gray-100"
              >

                <div
                  class="flex items-center justify-between mb-3"
                >

                  <div>

                    <h3
                      class="text-sm font-black text-gray-700"
                    >
                      Order Number
                    </h3>

                    <p
                      class="text-xs text-gray-400 mt-1"
                    >
                      Busy numbers can still be selected for another order.
                    </p>

                  </div>

                  <span
                    class="text-xs text-gray-400"
                  >
                    1–30
                  </span>

                </div>

                <div
                  class="grid grid-cols-5 sm:grid-cols-10 gap-3"
                >

                  <div
                    v-for="slot in orderNumbers"
                    :key="slot.number"
                    class="flex flex-col gap-1.5"
                  >

                    <button
                      type="button"
                      @click="
                        selectedOrderNumber =
                          slot.number
                      "
                      :class="[
                        'h-12 rounded-lg text-sm font-black border transition-colors',
                        selectedOrderNumber ===
                        slot.number
                          ? 'text-white border-transparent shadow-sm'
                          : slot.status ===
                              'Occupied'
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      ]"
                      :style="
                        selectedOrderNumber ===
                        slot.number
                          ? {
                              backgroundColor:
                                settingsStore.themeColor,
                              borderColor:
                                settingsStore.themeColor
                            }
                          : {}
                      "
                    >

                      <div
                        class="flex flex-col items-center justify-center leading-none"
                      >

                        <span>
                          {{ slot.number }}
                        </span>

                        <span
                          v-if="
                            slot.status ===
                            'Occupied'
                          "
                          class="text-[8px] mt-1 opacity-80"
                        >
                          BUSY
                        </span>

                        <span
                          v-else
                          class="text-[8px] mt-1 opacity-0"
                        >
                          AVAILABLE
                        </span>

                      </div>

                    </button>

                    <button
                      v-if="
                        slot.status ===
                        'Occupied'
                      "
                      type="button"
                      @click.stop="
                        releaseOrderNumber(
                          slot.number
                        )
                      "
                      class="w-full py-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-700 text-[9px] font-black transition-colors"
                    >
                      Release
                    </button>

                  </div>

                </div>

              </div>

              <!-- Delivery Information -->

              <div
                v-if="
                  orderType ===
                  'Delivery'
                "
                class="pt-5 border-t border-gray-100"
              >

                <div class="mb-4">

                  <h3
                    class="text-sm font-black text-gray-700"
                  >
                    Delivery Information
                  </h3>

                  <p
                    class="text-xs text-gray-500 mt-1"
                  >
                    Customer name is required. Other notes are optional.
                  </p>

                </div>

                <div class="space-y-4">

                  <div>

                    <label
                      class="block text-sm font-semibold text-gray-700 mb-1"
                    >
                      Customer Name
                    </label>

                    <input
                      v-model="
                        delivery.customerName
                      "
                      type="text"
                      placeholder="Customer name"
                      class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    />

                  </div>

                  <div>

                    <label
                      class="block text-sm font-semibold text-gray-700 mb-1"
                    >
                      Delivery Fee
                    </label>

                    <div class="relative">

                      <span
                        class="absolute left-3 top-3 text-gray-500"
                      >
                        ₱
                      </span>

                      <input
                        v-model.number="
                          delivery.deliveryFee
                        "
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        class="w-full border border-gray-300 rounded-xl p-3 pl-8 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                      />

                    </div>

                  </div>

                  <div>

                    <label
                      class="block text-sm font-semibold text-gray-700 mb-1"
                    >
                      Notes
                    </label>

                    <input
                      v-model="
                        delivery.notes
                      "
                      type="text"
                      placeholder="Optional notes"
                      class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    />

                  </div>

                </div>

                <div class="mt-4">

                  <button
                    type="button"
                    @click="
                      confirmDeliverySetup
                    "
                    :disabled="
                      !delivery.customerName.trim()
                    "
                    class="w-full py-3.5 rounded-xl text-white font-bold shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    :style="
                      delivery.customerName.trim()
                        ? {
                            backgroundColor:
                              settingsStore.themeColor
                          }
                        : {}
                    "
                  >
                    Open Order Menu
                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

        <!-- ========================= -->
        <!-- MENU AREA -->
        <!-- ========================= -->

        <template
          v-if="
            isOrderSetupComplete ||
            editLayoutMode
          "
        >

          <!-- Layout Editor Banner -->

          <div
            v-if="editLayoutMode"
            class="mb-5 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-4 shadow-sm"
          >

            <div
              class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >

              <div>

                <div
                  class="flex items-center gap-2"
                >

                  <span
                    class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white"
                  >
                    ☰
                  </span>

                  <h2
                    class="text-sm font-black text-gray-900"
                  >
                    Layout Editor
                  </h2>

                </div>

                <p
                  class="mt-2 text-xs text-gray-500"
                >
                  Use the ☰ handle to drag. Changes are automatically saved after dropping the item.
                </p>

              </div>

              <div
                class="flex items-center gap-2"
              >

                <span
                  v-if="layoutSaving"
                  class="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600"
                >
                  Saving layout...
                </span>

                <span
                  v-if="
                    layoutMessage &&
                    !layoutSaving
                  "
                  class="rounded-lg px-3 py-2 text-xs font-bold"
                  :class="
                    layoutMessageType ===
                    'error'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-emerald-50 text-emerald-700'
                  "
                >
                  {{ layoutMessage }}
                </span>

              </div>

            </div>

          </div>

          <!-- Current Order Setup -->

          <div
            v-if="isOrderSetupComplete"
            class="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-5 shadow-sm flex flex-wrap items-center justify-between gap-3"
          >

            <div
              class="flex items-center gap-3"
            >

              <span
                class="text-xs font-bold px-3 py-1.5 rounded-full text-white"
                :style="{
                  backgroundColor:
                    settingsStore.themeColor
                }"
              >
                {{ orderType }}
              </span>

              <span
                v-if="selectedOrderNumber"
                class="text-sm font-bold text-gray-700"
              >
                Order #{{ selectedOrderNumber }}
              </span>

              <span
                v-if="
                  orderType ===
                  'Delivery'
                "
                class="text-sm font-bold text-gray-700"
              >
                {{ delivery.customerName }}
              </span>

            </div>

            <button
              type="button"
              @click="
                () => {
                  cartStore.clearCart()
                  discountAmount = 0
                  orderType = ''
                  selectedOrderNumber = null
                  deliverySetupConfirmed = false
                  resetDelivery()
                }
              "
              class="text-xs font-bold text-gray-500 hover:text-red-600"
            >
              Change Order Setup
            </button>

          </div>

          <!-- Category Filters -->

          <Draggable
            v-model="categories"
            item-key="_id"
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 mb-6"
            :disabled="!editLayoutMode"
            handle=".drag-handle"
            :animation="180"
            :delay="120"
            ghost-class="sortable-ghost"
            chosen-class="sortable-chosen"
            drag-class="sortable-drag"
            @start="
              beginLayoutDrag('category')
            "
            @end="
              finishLayoutDrag(
                'category',
                $event
              )
            "
          >

            <template #item="{ element: cat }">

              <button
                type="button"
                @click="
                  handleCategoryClick(
                    cat.name
                  )
                "
                :style="
                  selectedCategory ===
                  cat.name
                    ? {
                        backgroundColor:
                          settingsStore.themeColor,
                        borderColor:
                          settingsStore.themeColor
                      }
                    : {}
                "
                :class="[
                  'min-h-[48px] md:min-h-[52px] px-3 py-2 border rounded-xl transition-all whitespace-normal font-semibold text-sm leading-tight relative',
                  selectedCategory ===
                  cat.name
                    ? 'text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
                  editLayoutMode
                    ? 'select-none'
                    : ''
                ]"
              >

                <span
                  v-if="editLayoutMode"
                  class="drag-handle absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-black/5 hover:bg-black/10 cursor-grab active:cursor-grabbing touch-none"
                  title="Drag category"
                  @click.stop
                >
                  ☰
                </span>

                <span
                  :class="
                    editLayoutMode
                      ? 'pl-7'
                      : ''
                  "
                >
                  {{ cat.name }}
                </span>

              </button>

            </template>

          </Draggable>

          <!-- Menu Grid -->

          <Draggable
            v-model="filteredMenus"
            item-key="_id"
            class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            :disabled="!editLayoutMode"
            handle=".drag-handle"
            :animation="180"
            :delay="120"
            ghost-class="sortable-ghost"
            chosen-class="sortable-chosen"
            drag-class="sortable-drag"
            :group="{
              name: 'menu-layout',
              pull: false,
              put: false
            }"
            @start="
              beginLayoutDrag('menu')
            "
            @end="
              finishLayoutDrag(
                'menu',
                $event
              )
            "
          >

            <template #item="{ element: item }">

              <!-- MENU CARD -->

              <div
                @click="
                  handleMenuCardClick(
                    item
                  )
                "
                :class="[
                  'bg-white rounded-2xl border overflow-hidden transition-all duration-200 relative',

                  isMenuOrderable(item) &&
                  !editLayoutMode
                    ? 'border-gray-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg'
                    : editLayoutMode
                      ? 'border-gray-200 select-none'
                      : 'border-gray-200 opacity-60 cursor-not-allowed'
                ]"
              >

                <!-- Menu Name - PRIMARY FOCUS -->

                <div
                  class="min-h-[96px] p-4 md:p-5 flex items-center relative"
                  :style="{
                    backgroundColor:
                      isMenuOrderable(item)
                        ? `color-mix(in srgb, ${settingsStore.themeColor} 6%, white)`
                        : '#f3f4f6'
                  }"
                >

                  <!-- Drag Handle -->

                  <span
                    v-if="editLayoutMode"
                    class="drag-handle absolute left-3 top-3 text-sm font-black text-gray-400 w-9 h-9 flex items-center justify-center rounded-lg bg-black/5 hover:bg-black/10 cursor-grab active:cursor-grabbing touch-none"
                    title="Drag menu item"
                    @click.stop
                  >
                    ☰
                  </span>

                  <div
                    class="w-full pr-1"
                    :class="
                      editLayoutMode
                        ? 'pl-10'
                        : ''
                    "
                  >

                    <h3
                      class="text-lg md:text-xl font-black leading-tight text-gray-900 line-clamp-2"
                    >
                      {{ item.name }}
                    </h3>

                    <p
                      class="text-xs font-semibold text-gray-500 mt-2"
                    >
                      Tap to select
                    </p>

                  </div>

                </div>

                <!-- Menu Details -->

                <div
                  class="p-4"
                >

                  <div
                    class="flex items-center justify-between gap-3"
                  >

                    <!-- Price -->

                    <span
                      class="text-base md:text-lg font-bold"
                      :style="{
                        color:
                          isMenuOrderable(item)
                            ? settingsStore.themeColor
                            : '#9ca3af'
                      }"
                    >
                      ₱{{
                        Number(
                          item.price
                        ).toFixed(2)
                      }}
                    </span>

                    <!-- Stock / Availability -->

                    <span
                      :class="[
                        'text-[11px] md:text-xs font-bold px-2.5 py-1 rounded-full text-right',

                        item.isAvailable === false
                          ? 'bg-gray-100 text-gray-500'

                          : item.stockMonitoring !== true
                            ? 'bg-blue-50 text-blue-700'

                            : Number(item.stock || 0) > 10
                              ? 'bg-green-50 text-green-700'

                              : Number(item.stock || 0) > 0
                                ? 'bg-yellow-50 text-yellow-700'

                                : 'bg-red-50 text-red-700'
                      ]"
                    >
                      {{ menuStockLabel(item) }}
                    </span>

                  </div>

                </div>

              </div>

            </template>

          </Draggable>

        </template>

      </div>

    </div>

    <!-- ========================= -->
    <!-- CART SIDEBAR -->
    <!-- ========================= -->

    <div
      v-if="isOrderSetupComplete"
      class="w-full md:w-96 bg-white border border-gray-200 md:border-0 md:border-l shadow-lg flex flex-col h-[50vh] md:h-[calc(100vh-64px)] min-h-0 overflow-hidden z-10"
    >

      <!-- Cart Header -->

      <div
        class="shrink-0 p-5 border-b border-gray-100 bg-white flex justify-between items-center"
      >

        <div>

          <h2
            class="text-lg font-black text-gray-800"
          >
            Current Order
          </h2>

          <p
            class="text-xs text-gray-500 mt-0.5"
          >

            <span>

              {{ orderType }}

              <span
                v-if="selectedOrderNumber"
              >
                #{{ selectedOrderNumber }}
              </span>

              <span
                v-if="
                  orderType ===
                  'Delivery'
                "
              >
                · {{ delivery.customerName }}
              </span>

            </span>

          </p>

        </div>

        <button
          @click="
            cartStore.clearCart()
          "
          :disabled="
            cart.length === 0
          "
          class="text-xs font-bold text-gray-500 hover:text-red-600 disabled:text-gray-300 transition-colors"
        >
          Clear
        </button>

      </div>

      <!-- Scrollable Orders -->

      <div
        class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4 bg-white"
      >

        <div
          v-for="item in cart"
          :key="item.cartItemId"
          class="py-3 border-b border-gray-100"
        >

          <div
            class="flex justify-between gap-3"
          >

            <div
              class="min-w-0 flex-1"
            >

              <h4
                class="font-bold text-gray-800 truncate"
              >
                {{ item.name }}
              </h4>

              <p
                class="text-xs text-gray-500 mt-0.5"
              >
                ₱{{
                  Number(
                    item.price
                  ).toFixed(2)
                }}
                each
              </p>

              <div
                v-if="
                  item.addOns &&
                  item.addOns.length
                "
                class="mt-2 space-y-1"
              >

                <p
                  v-for="addOn in item.addOns"
                  :key="addOn.addOnId"
                  class="text-xs text-gray-500"
                >
                  + {{ addOn.name }}
                  (₱{{
                    Number(
                      addOn.price
                    ).toFixed(2)
                  }})
                </p>

              </div>

              <input
                :value="
                  item.specialInstructions ||
                  ''
                "
                @input="
                  cartStore.updateInstructions(
                    item.cartItemId,
                    $event.target.value
                  )
                "
                type="text"
                placeholder="Special instruction..."
                class="mt-2 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              />

            </div>

            <p
              class="font-black text-gray-800 whitespace-nowrap"
            >
              ₱{{
                Number(
                  cartStore.getItemUnitPrice(
                    item
                  ) *
                    item.quantity
                ).toFixed(2)
              }}
            </p>

          </div>

          <div
            class="flex items-center justify-between mt-2"
          >

            <span
              class="text-xs text-gray-400"
            >

              <template
                v-if="
                  item.stockMonitoring === true
                "
              >
                Stock:
                {{ item.actualStock ?? item.stock }}
              </template>

              <template
                v-else
              >
                Stock: Not monitored
              </template>

            </span>

            <div
              class="flex items-center bg-gray-100 rounded-lg overflow-hidden"
            >

              <button
                @click="
                  cartStore.updateQuantity(
                    item.cartItemId,
                    'minus'
                  )
                "
                class="w-8 h-8 text-gray-600 hover:bg-gray-200 font-bold transition-colors"
              >
                −
              </button>

              <span
                class="w-8 text-center font-bold text-sm"
              >
                {{ item.quantity }}
              </span>

              <button
                @click="
                  cartStore.updateQuantity(
                    item.cartItemId,
                    'add'
                  )
                "
                :disabled="
                  item.stockMonitoring === true &&
                  item.quantity >=
                    Number(
                      item.stock ||
                        0
                    )
                "
                class="w-8 h-8 text-gray-600 hover:bg-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed font-bold transition-colors"
              >
                +
              </button>

            </div>

          </div>

        </div>

        <div
          v-if="
            cart.length === 0
          "
          class="h-full flex flex-col items-center justify-center text-gray-400 space-y-2"
        >

          <span class="text-4xl">
            🛒
          </span>

          <p class="font-medium">
            Walang laman ang cart.
          </p>

        </div>

      </div>

      <!-- Checkout Summary -->

      <div
        class="shrink-0 p-5 bg-white border-t border-gray-200 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]"
      >

        <div
          class="flex justify-between items-center text-sm mb-2"
        >

          <span
            class="text-gray-500"
          >
            Gross Sales
          </span>

          <span
            class="font-semibold text-gray-700"
          >
            ₱{{
              Number(
                totalAmount
              ).toFixed(2)
            }}
          </span>

        </div>

        <div
          class="flex justify-between items-center gap-3 mb-2"
        >

          <span
            class="text-sm font-semibold text-gray-600"
          >
            Discount
          </span>

          <div
            class="flex items-center gap-1"
          >

            <span
              class="text-sm text-gray-500"
            >
              ₱
            </span>

            <input
              v-model.number="
                discountAmount
              "
              type="number"
              min="0"
              :max="
                Number(
                  totalAmount
                )
              "
              placeholder="0.00"
              class="w-24 border border-gray-300 rounded-lg px-2.5 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            />

          </div>

        </div>

        <div
          v-if="
            orderType ===
            'Delivery'
          "
          class="flex justify-between items-center text-sm mb-3"
        >

          <span class="text-gray-500">
            Delivery Fee
          </span>

          <span
            class="font-semibold text-gray-700"
          >
            ₱{{
              Number(
                delivery.deliveryFee ||
                0
              ).toFixed(2)
            }}
          </span>

        </div>

        <div
          class="flex justify-between items-end pt-3 border-t border-gray-200 mb-4"
        >

          <div>

            <p
              class="text-xs font-semibold text-gray-400 uppercase tracking-wide"
            >
              Net Total
            </p>

            <p
              class="text-gray-600 font-bold mt-1"
            >
              Current Order
            </p>

          </div>

          <span
            class="text-2xl font-black"
            :style="{
              color:
                settingsStore.themeColor
            }"
          >
            ₱{{
              Number(
                finalTotal
              ).toFixed(2)
            }}
          </span>

        </div>

        <button
          @click="
            isCheckoutOpen = true
          "
          :disabled="
            !canProceedToCheckout
          "
          class="w-full py-3.5 rounded-xl font-bold text-base text-white transition-all shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          :style="
            canProceedToCheckout
              ? {
                  backgroundColor:
                    settingsStore.themeColor
                }
              : {}
          "
        >
          Proceed to Checkout
        </button>

      </div>

    </div>

  </div>

  <!-- Checkout Modal -->

  <CheckoutModal
    :isOpen="
      isCheckoutOpen
    "
    :totalAmount="
      finalTotal
    "
    :orderType="
      orderType
    "
    @close="
      isCheckoutOpen = false
    "
    @confirm="
      handlePayment
    "
  />

  <!-- Add-on Modal -->

  <div
    v-if="
      isAddOnModalOpen
    "
    class="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
    @click.self="
      closeAddOnModal
    "
  >

    <div
      class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
    >

      <!-- Header -->

      <div
        class="px-5 py-4 text-white"
        :style="{
          backgroundColor:
            settingsStore.themeColor
        }"
      >

        <div
          class="flex items-center justify-between gap-4"
        >

          <div>

            <h2
              class="font-black text-lg"
            >
              Add-ons
            </h2>

            <p
              class="text-sm text-white/80"
            >
              {{ selectedMenuItem?.name }}
            </p>

          </div>

          <button
            type="button"
            @click="
              closeAddOnModal()
            "
            class="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 font-bold"
          >
            ×
          </button>

        </div>

      </div>

      <!-- Body -->

      <div
        class="p-5 space-y-5"
      >

        <!-- Add-ons -->

        <div>

          <p
            class="text-sm font-bold text-gray-700 mb-2"
          >
            Select Add-ons
          </p>

          <div
            v-if="
              availableAddOns.length === 0
            "
            class="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 text-center"
          >
            Walang available add-ons.
          </div>

          <div
            v-else
            class="space-y-2"
          >

            <button
              v-for="addOn in availableAddOns"
              :key="addOn._id"
              type="button"
              @click="
                toggleAddOn(
                  addOn._id
                )
              "
              class="w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors"
              :class="
                selectedAddOnIds.includes(
                  addOn._id
                )
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-gray-200 hover:bg-gray-50'
              "
            >

              <div
                class="flex items-center gap-3"
              >

                <div
                  class="w-5 h-5 rounded border flex items-center justify-center text-xs"
                  :style="
                    selectedAddOnIds.includes(
                      addOn._id
                    )
                      ? {
                          backgroundColor:
                            settingsStore.themeColor,
                          borderColor:
                            settingsStore.themeColor,
                          color: 'white'
                        }
                      : {
                          borderColor:
                            '#d1d5db'
                        }
                  "
                >

                  <span
                    v-if="
                      selectedAddOnIds.includes(
                        addOn._id
                      )
                    "
                  >
                    ✓
                  </span>

                </div>

                <span
                  class="font-semibold text-gray-800"
                >
                  {{ addOn.name }}
                </span>

              </div>

              <span
                class="font-bold"
                :style="{
                  color:
                    settingsStore.themeColor
                }"
              >
                +₱{{
                  Number(
                    addOn.price
                  ).toFixed(2)
                }}
              </span>

            </button>

          </div>

        </div>

        <!-- Special Instruction -->

        <div>

          <label
            class="block text-sm font-bold text-gray-700 mb-1"
          >
            Special Instruction
          </label>

          <input
            v-model="
              addOnSpecialInstructions
            "
            type="text"
            placeholder="e.g. No onion, extra sauce"
            class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
          />

        </div>

        <!-- Total -->

        <div
          class="border-t border-gray-100 pt-4"
        >

          <div
            class="flex justify-between items-center"
          >

            <span
              class="font-bold text-gray-600"
            >
              Item Total
            </span>

            <span
              class="text-2xl font-black"
              :style="{
                color:
                  settingsStore.themeColor
              }"
            >
              ₱{{
                Number(
                  addOnItemTotal
                ).toFixed(2)
              }}
            </span>

          </div>

        </div>

        <!-- Actions -->

        <div
          class="flex gap-3"
        >

          <button
            type="button"
            @click="
              closeAddOnModal()
            "
            class="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
          >
            Cancel
          </button>

          <button
            type="button"
            @click="
              confirmAddToCart()
            "
            class="flex-1 py-3 rounded-xl text-white font-bold"
            :style="{
              backgroundColor:
                settingsStore.themeColor
            }"
          >
            Add to Cart
          </button>

        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.sortable-ghost {
  opacity: 0.35;
  transform: scale(0.98);
}

.sortable-chosen {
  cursor: grabbing !important;
}

.sortable-drag {
  opacity: 0.95;
  transform: rotate(1deg) scale(1.02);
}

.drag-handle {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
</style>