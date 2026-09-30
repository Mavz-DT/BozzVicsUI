<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

const authStore = useAuthStore()
const settingsStore =
  useSettingsStore()

const salesRecords = ref([])
const loading = ref(false)
const errorMessage = ref('')

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

  if (Array.isArray(data?.salesRecords)) {
    return data.salesRecords
  }

  if (Array.isArray(data?.records)) {
    return data.records
  }

  if (Array.isArray(data?.payments)) {
    return data.payments
  }

  if (Array.isArray(data?.sales)) {
    return data.sales
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  return []
}

// Selected sale for detail modal
const selectedSale = ref(null)
const isDetailsModalOpen = ref(false)

const isVoidModalOpen = ref(false)
const voidReason = ref('')
const voiding = ref(false)

// =========================
// EDIT ORDER
// =========================

const isEditModalOpen = ref(false)
const editItems = ref([])
const editMenus = ref([])
const editAddOns = ref([])
const selectedMenuId = ref('')

const isAddOnEditModalOpen = ref(false)
const editingAddOnItemIndex = ref(null)
const selectedEditAddOnIds = ref([])

const editCustomer = ref({})
const editDeliveryFee = ref(0)
const editDiscountAmount = ref(0)
const editNotes = ref('')
const editPreview = ref(null)
const editLoading = ref(false)
const editError = ref('')

const isReplaceModalOpen = ref(false)
const replacingItemIndex = ref(null)
const replacementMenuId = ref('')

// =========================
// EDIT PAYMENT / REFUND
// =========================

const isAdjustmentModalOpen = ref(false)

const adjustmentPaymentMethod = ref('Cash')
const adjustmentAmountTendered = ref('')
const adjustmentReferenceNumber = ref('')

const refundPaymentMethod = ref('Cash')
const refundReferenceNumber = ref('')

const applyingEdit = ref(false)

// =========================
// DATE
// =========================

const getTodayPH = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

const selectedDate = ref(getTodayPH())

const isAdmin = computed(() => {
  return authStore.user?.role === 'Admin'
})

// =========================
// FORMATTING
// =========================

const formatCurrency = amount => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(amount || 0))
}

const formatDisplayDate = date => {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(`${date}T00:00:00+08:00`))
}

const formatDateTime = date => {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date(date))
}

const formatTime = date => {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date(date))
}

// =========================
// SALES RECORDS
// =========================

const fetchSalesRecords = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const token = authStore.getToken()

    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }

    let response

    if (isAdmin.value) {
      response = await axios.get(
        `${API}/payments/sales-records?date=${selectedDate.value}`,
        config
      )
    } else {
      response = await axios.get(
        `${API}/payments/sales-records`,
        config
      )
    }

    const records = extractArray(response.data)

    salesRecords.value = records

    if (
      !Array.isArray(response.data) &&
      !Array.isArray(response.data?.salesRecords) &&
      !Array.isArray(response.data?.records) &&
      !Array.isArray(response.data?.payments) &&
      !Array.isArray(response.data?.sales) &&
      !Array.isArray(response.data?.results) &&
      !Array.isArray(response.data?.data)
    ) {
      console.warn(
        'Unexpected sales records API response:',
        response.data
      )

      errorMessage.value =
        'Hindi maintindihan ng Sales Record page ang response ng server.'
    }
  } catch (error) {
    console.error(
      'Error fetching sales records:',
      error
    )

    if (error.response?.status === 401) {
      errorMessage.value =
        'Nag-expire ang login session. Mag-login ulit.'
    } else if (error.response?.status === 403) {
      errorMessage.value =
        'Wala kang permission para sa sales records.'
    } else {
      errorMessage.value =
        error.response?.data?.message ||
        'Hindi ma-load ang sales records.'
    }

    salesRecords.value = []
  } finally {
    loading.value = false
  }
}

const handleDateChange = () => {
  if (!isAdmin.value) {
    return
  }

  fetchSalesRecords()
}

// =========================
// SALE DETAILS
// =========================

const openSaleDetails = sale => {
  selectedSale.value = sale
  isDetailsModalOpen.value = true
}

const closeSaleDetails = () => {
  selectedSale.value = null
  isDetailsModalOpen.value = false
}

// =========================
// EDIT MENU / ADD-ONS DATA
// =========================

const fetchEditMenus = async () => {
  try {
    const token = authStore.getToken()

    const response = await axios.get(
      `${API}/menus`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    editMenus.value = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.menus)
        ? response.data.menus
        : Array.isArray(response.data?.data)
          ? response.data.data
          : []
  } catch (error) {
    console.error(
      'Error fetching menus for edit:',
      error
    )

    editMenus.value = []

    editError.value =
      error.response?.data?.message ||
      'Hindi ma-load ang menu items.'
  }
}

const fetchEditAddOns = async () => {
  try {
    const token = authStore.getToken()

    const response = await axios.get(
      `${API}/add-ons`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const addOns = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.addOns)
        ? response.data.addOns
        : Array.isArray(response.data?.data)
          ? response.data.data
          : []

    editAddOns.value = addOns.filter(
      addOn => addOn?.isAvailable
    )
  } catch (error) {
    console.error(
      'Error fetching add-ons for edit:',
      error
    )

    editAddOns.value = []

    editError.value =
      error.response?.data?.message ||
      'Hindi ma-load ang add-ons.'
  }
}

// =========================
// OPEN EDIT ORDER
// =========================

const openEditOrder = async () => {
  if (!selectedSale.value?.order) {
    return
  }

  if (
    selectedSale.value.order.status !== 'Settled' ||
    selectedSale.value.order.paymentStatus !== 'Paid'
  ) {
    alert(
      'Paid at settled orders lang ang puwedeng i-edit.'
    )
    return
  }

  editError.value = ''
  editPreview.value = null
  selectedMenuId.value = ''

  editItems.value = (
    selectedSale.value.order.items || []
  ).map(item => ({
    menuId: item.menuId,
    name: item.name,
    quantity: Number(item.quantity),
    price: Number(item.price || 0),
    subtotal: Number(item.subtotal || 0),

    addOns: (item.addOns || []).map(addOn => ({
      addOnId: addOn.addOnId,
      name: addOn.name,
      price: Number(addOn.price || 0)
    })),

    specialInstructions:
      item.specialInstructions || ''
  }))

  editCustomer.value = {
    ...(selectedSale.value.order.customer || {})
  }

  editDeliveryFee.value = Number(
    selectedSale.value.order.deliveryFee || 0
  )

  editDiscountAmount.value = Number(
    selectedSale.value.order.discountAmount || 0
  )

  editNotes.value =
    selectedSale.value.order.notes || ''

  await fetchEditMenus()
  await fetchEditAddOns()

  isDetailsModalOpen.value = false
  isEditModalOpen.value = true
}

// =========================
// CLOSE EDIT ORDER
// =========================

const closeEditOrder = () => {
  if (editLoading.value) {
    return
  }

  isEditModalOpen.value = false
  editItems.value = []
  editPreview.value = null
  selectedMenuId.value = ''
  editError.value = ''

  isDetailsModalOpen.value = true
}

// =========================
// EDIT QUANTITY
// =========================

const increaseEditQuantity = index => {
  editItems.value[index].quantity += 1
  editPreview.value = null
}

const decreaseEditQuantity = index => {
  const item = editItems.value[index]

  if (item.quantity <= 1) {
    return
  }

  item.quantity -= 1
  editPreview.value = null
}

const removeEditItem = index => {
  editItems.value.splice(index, 1)
  editPreview.value = null
}

// =========================
// EDIT ADD-ONS
// =========================

const openEditAddOns = index => {
  const item = editItems.value[index]

  if (!item) {
    return
  }

  editingAddOnItemIndex.value = index

  selectedEditAddOnIds.value = (
    item.addOns || []
  ).map(addOn => addOn.addOnId)

  isAddOnEditModalOpen.value = true
}

const closeEditAddOns = () => {
  isAddOnEditModalOpen.value = false
  editingAddOnItemIndex.value = null
  selectedEditAddOnIds.value = []
}

const toggleEditAddOn = addOnId => {
  const index =
    selectedEditAddOnIds.value.indexOf(addOnId)

  if (index === -1) {
    selectedEditAddOnIds.value.push(addOnId)
  } else {
    selectedEditAddOnIds.value.splice(index, 1)
  }
}

const confirmEditAddOns = () => {
  if (
    editingAddOnItemIndex.value === null
  ) {
    return
  }

  const item =
    editItems.value[
      editingAddOnItemIndex.value
    ]

  if (!item) {
    return
  }

  const selectedAddOns =
    editAddOns.value.filter(
      addOn =>
        selectedEditAddOnIds.value.includes(
          addOn._id
        )
    )

  item.addOns = selectedAddOns.map(
    addOn => ({
      addOnId: addOn._id,
      name: addOn.name,
      price: Number(addOn.price || 0)
    })
  )

  editPreview.value = null

  closeEditAddOns()
}

// =========================
// REPLACE ITEM
// =========================

const openReplaceModal = index => {
  replacingItemIndex.value = index
  replacementMenuId.value = ''
  isReplaceModalOpen.value = true
}

const closeReplaceModal = () => {
  if (editLoading.value) {
    return
  }

  isReplaceModalOpen.value = false
  replacingItemIndex.value = null
  replacementMenuId.value = ''
}

const confirmReplaceItem = () => {
  if (
    replacingItemIndex.value === null ||
    !replacementMenuId.value
  ) {
    return
  }

  const newMenu = editMenus.value.find(
    menu => menu._id === replacementMenuId.value
  )

  if (!newMenu) {
    return
  }

  const currentItem =
    editItems.value[
      replacingItemIndex.value
    ]

  editItems.value[replacingItemIndex.value] = {
    menuId: newMenu._id,
    name: newMenu.name,
    quantity: currentItem.quantity,
    price: Number(newMenu.price || 0),
    subtotal:
      Number(newMenu.price || 0) *
      Number(currentItem.quantity || 1),
    addOns: [],
    specialInstructions:
      currentItem.specialInstructions || ''
  }

  editPreview.value = null

  closeReplaceModal()
}

// =========================
// ADD NEW MENU ITEM
// =========================

const addEditMenuItem = () => {
  if (!selectedMenuId.value) {
    return
  }

  const menu = editMenus.value.find(
    item => item._id === selectedMenuId.value
  )

  if (!menu) {
    return
  }

  const existingIndex =
    editItems.value.findIndex(
      item => item.menuId === menu._id
    )

  if (existingIndex !== -1) {
    editItems.value[existingIndex].quantity += 1
  } else {
    editItems.value.push({
      menuId: menu._id,
      name: menu.name,
      quantity: 1,
      price: Number(menu.price || 0),
      subtotal: Number(menu.price || 0),
      addOns: [],
      specialInstructions: ''
    })
  }

  selectedMenuId.value = ''
  editPreview.value = null
}

// =========================
// PREVIEW ORDER CHANGES
// =========================

const previewOrderChanges = async () => {
  if (!selectedSale.value?.order?._id) {
    return
  }

  if (editItems.value.length === 0) {
    editError.value =
      'Kailangan may kahit isang menu item ang order.'
    return
  }

  editError.value = ''
  editPreview.value = null
  editLoading.value = true

  try {
    const token = authStore.getToken()

    const payload = {
      items: editItems.value.map(item => ({
        menuId: item.menuId,
        quantity: Number(item.quantity),

        addOns: (item.addOns || []).map(addOn => ({
          addOnId: addOn.addOnId
        })),

        specialInstructions:
          item.specialInstructions || ''
      })),

      customer:
        selectedSale.value.order.orderType === 'Delivery'
          ? editCustomer.value
          : {},

      deliveryFee:
        selectedSale.value.order.orderType === 'Delivery'
          ? Number(editDeliveryFee.value || 0)
          : 0,

      discountAmount:
        Number(editDiscountAmount.value || 0),

      notes: editNotes.value || ''
    }

    const response = await axios.post(
      `${API}/orders/${selectedSale.value.order._id}/edit-preview`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    editPreview.value = response.data
  } catch (error) {
    console.error(
      'Error previewing order edit:',
      error
    )

    editError.value =
      error.response?.data?.message ||
      'Hindi ma-preview ang changes.'
  } finally {
    editLoading.value = false
  }
}

// =========================
// APPLY EDIT ORDER
// =========================

const applyEditOrder = async () => {
  if (!selectedSale.value?.order?._id) {
    return
  }

  if (!editPreview.value) {
    return
  }

  const difference = Number(
    editPreview.value.difference || 0
  )

  editLoading.value = true
  editError.value = ''

  try {
    const token = authStore.getToken()

    const payload = {
      items: editItems.value.map(item => ({
        menuId: item.menuId,
        quantity: Number(item.quantity),

        addOns: (item.addOns || []).map(addOn => ({
          addOnId: addOn.addOnId
        })),

        specialInstructions:
          item.specialInstructions || ''
      })),

      customer:
        selectedSale.value.order.orderType === 'Delivery'
          ? editCustomer.value
          : {},

      deliveryFee:
        selectedSale.value.order.orderType === 'Delivery'
          ? Number(editDeliveryFee.value || 0)
          : 0,

      discountAmount:
        Number(editDiscountAmount.value || 0),

      notes:
        editNotes.value || ''
    }

    // =========================
    // ADDITIONAL PAYMENT
    // =========================

    if (difference > 0) {
      payload.paymentAdjustment = {
        paymentMethod:
          adjustmentPaymentMethod.value,

        amount: difference,

        amountTendered:
          adjustmentPaymentMethod.value === 'Cash'
            ? Number(
                adjustmentAmountTendered.value || 0
              )
            : 0,

        referenceNumber:
          adjustmentPaymentMethod.value === 'GCash'
            ? adjustmentReferenceNumber.value.trim()
            : ''
      }
    }

    // =========================
    // REFUND
    // =========================

    if (difference < 0) {
      payload.refund = {
        paymentMethod:
          refundPaymentMethod.value,

        amount:
          Math.abs(difference),

        referenceNumber:
          refundPaymentMethod.value === 'GCash'
            ? refundReferenceNumber.value.trim()
            : ''
      }
    }

    const response = await axios.post(
      `${API}/orders/${selectedSale.value.order._id}/edit`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    alert(
      response.data?.message ||
      'Order edited successfully.'
    )

    isAdjustmentModalOpen.value = false
    isEditModalOpen.value = false
    isDetailsModalOpen.value = false

    editPreview.value = null
    editItems.value = []
    selectedMenuId.value = ''

    adjustmentPaymentMethod.value = 'Cash'
    adjustmentAmountTendered.value = 0
    adjustmentReferenceNumber.value = ''

    refundPaymentMethod.value = 'Cash'
    refundReferenceNumber.value = ''

    selectedSale.value = null

    await fetchSalesRecords()
  } catch (error) {
    console.error(
      'Error applying order edit:',
      error
    )

    editError.value =
      error.response?.data?.message ||
      'Hindi ma-save ang order edit.'

    alert(editError.value)
  } finally {
    editLoading.value = false
    applyingEdit.value = false
  }
}

// =========================
// EDIT PAYMENT / REFUND STEP
// =========================

const openEditPaymentStep = () => {
  if (!editPreview.value) {
    return
  }

  const difference = Number(
    editPreview.value.difference || 0
  )

  if (difference === 0) {
    applyEditOrder()
    return
  }

  if (difference > 0) {
    adjustmentPaymentMethod.value = 'Cash'

    adjustmentAmountTendered.value =
      Number(difference).toFixed(2)

    adjustmentReferenceNumber.value = ''

    isAdjustmentModalOpen.value = true
    return
  }

  refundPaymentMethod.value = 'Cash'
  refundReferenceNumber.value = ''

  isAdjustmentModalOpen.value = true
}

const closeAdjustmentModal = () => {
  if (applyingEdit.value) {
    return
  }

  isAdjustmentModalOpen.value = false
}

const confirmAdjustmentPayment = async () => {
  if (!editPreview.value) {
    return
  }

  const difference = Number(
    editPreview.value.difference || 0
  )

  if (difference <= 0) {
    return
  }

  if (
    adjustmentPaymentMethod.value === 'Cash'
  ) {
    const tendered = Number(
      adjustmentAmountTendered.value || 0
    )

    if (tendered < difference) {
      alert(
        `Kailangan ng hindi bababa sa ${formatCurrency(difference)}.`
      )
      return
    }
  }

  if (
    adjustmentPaymentMethod.value === 'GCash' &&
    !adjustmentReferenceNumber.value.trim()
  ) {
    alert(
      'Maglagay muna ng GCash reference number.'
    )
    return
  }

  applyingEdit.value = true

  await applyEditOrder()
}

const confirmRefund = async () => {
  if (!editPreview.value) {
    return
  }

  const difference = Number(
    editPreview.value.difference || 0
  )

  if (difference >= 0) {
    return
  }

  if (
    refundPaymentMethod.value === 'GCash' &&
    !refundReferenceNumber.value.trim()
  ) {
    alert(
      'Maglagay muna ng GCash reference number para sa refund.'
    )
    return
  }

  const refundAmount =
    Math.abs(difference)

  const confirmed = window.confirm(
    `I-refund ang ${formatCurrency(refundAmount)} sa customer?`
  )

  if (!confirmed) {
    return
  }

  applyingEdit.value = true

  await applyEditOrder()
}

// =========================
// TOUCHSCREEN KEYPAD
// =========================

const appendAdjustmentKey = key => {
  if (key === 'clear') {
    adjustmentAmountTendered.value = ''
    return
  }

  if (key === 'backspace') {
    adjustmentAmountTendered.value =
      adjustmentAmountTendered.value.slice(0, -1)

    return
  }

  if (key === '.') {
    if (
      adjustmentAmountTendered.value.includes('.')
    ) {
      return
    }

    if (!adjustmentAmountTendered.value) {
      adjustmentAmountTendered.value = '0.'
      return
    }

    adjustmentAmountTendered.value += '.'
    return
  }

  // Maximum 2 decimal places
  if (
    adjustmentAmountTendered.value.includes('.')
  ) {
    const decimalPart =
      adjustmentAmountTendered.value.split('.')[1] || ''

    if (decimalPart.length >= 2) {
      return
    }
  }

  // Prevent unnecessary leading zeroes
  if (
    adjustmentAmountTendered.value === '0' &&
    key !== '.'
  ) {
    adjustmentAmountTendered.value = key
    return
  }

  adjustmentAmountTendered.value += key
}

// =========================
// VOID ORDER
// =========================

const openVoidModal = () => {
  voidReason.value = ''
  isVoidModalOpen.value = true
}

const closeVoidModal = () => {
  if (voiding.value) {
    return
  }

  isVoidModalOpen.value = false
  voidReason.value = ''
}

const confirmVoidOrder = async () => {
  if (!selectedSale.value?.order?._id) {
    return
  }

  if (!voidReason.value.trim()) {
    alert(
      'Maglagay muna ng dahilan kung bakit ivo-void ang order.'
    )
    return
  }

  const confirmed = window.confirm(
    'Sigurado ka bang gusto mong i-void ang order na ito?'
  )

  if (!confirmed) {
    return
  }

  voiding.value = true

  try {
    const token = authStore.getToken()

    await axios.post(
      `${API}/orders/${selectedSale.value.order._id}/void`,
      {
        reason: voidReason.value.trim()
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    alert('Order voided successfully.')

    isVoidModalOpen.value = false
    isDetailsModalOpen.value = false
    voidReason.value = ''
    selectedSale.value = null

    await fetchSalesRecords()
  } catch (error) {
    console.error(
      'Error voiding order:',
      error
    )

    alert(
      error.response?.data?.message ||
      'Hindi ma-void ang order.'
    )
  } finally {
    voiding.value = false
  }
}

// ==========================================================================
// REPRINT CUSTOMER RECEIPT
// ==========================================================================

const reprintCustomerReceipt =
  sale => {

    if (
      !sale?.order
    ) {

      alert(
        'Walang order information para sa receipt.'
      )

      return
    }


    const printWindow =
      window.open(
        '',
        '_blank',
        'width=400,height=700'
      )


    if (
      !printWindow
    ) {

      alert(
        'Hindi mabuksan ang receipt print window. I-check ang browser popup blocker.'
      )

      return
    }


    const order =
      sale.order


    const orderNumber =
      order.orderNumber
        ? `#${order.orderNumber}`
        : 'DELIVERY'


    // =========================
    // ITEMS
    // =========================

    const itemsHtml =
      (order.items || [])
        .map(
          item => {

            const addOnTotal =
              (item.addOns || [])
                .reduce(
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
              item.addOns?.length

                ? `

                  <div class="sub-item">

                    +
                    ${item.addOns
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
                    ${item.quantity}x ${item.name}
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
          }
        )
        .join('')


    // =========================
    // PAYMENT DETAILS
    // =========================

    const payments =
      Array.isArray(
        sale.payments
      )
        ? sale.payments
        : []


    let paymentHtml =
      ''


    if (
      payments.length > 1
    ) {

      paymentHtml = `

        <div class="section-title">
          PAYMENT DETAILS
        </div>

      `


      paymentHtml +=
        payments
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
                    ${payment.paymentMethod || '-'}
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
                    'Cash' &&
                  payment.type !== 'Refund'

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
          .join('')

    } else {

      const payment =
        payments[0] || sale


      paymentHtml = `

        <div class="summary-row">

          <span>
            Payment
          </span>

          <span>
            ${payment.paymentMethod || '-'}
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
                    payment.amount ??
                    sale.amount ??
                    order.netAmount ??
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

      `
    }


    // =========================
    // DELIVERY
    // =========================

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

        : ''


    // =========================
    // PRINT DOCUMENT
    // =========================

    printWindow.document.open()


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


            @page {
              size: 80mm auto;
              margin: 0;
            }


            body {

              margin: 0;
              padding: 4px;
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

              border-bottom:
                2px dashed #000;

              padding-bottom:
                6px;

              margin-bottom:
                6px;
            }


            .business {

              font-size:
                16px;

              font-weight:
                900;
            }


            .subtitle {

              margin-top:
                2px;

              font-size:
                10px;
            }


            .receipt-title {

              margin-top:
                5px;

              font-size:
                14px;

              font-weight:
                900;
            }


            .meta {

              margin-bottom:
                7px;
            }


            .meta-row,
            .summary-row,
            .info-row {

              display:
                flex;

              justify-content:
                space-between;

              gap:
                8px;

              margin-bottom:
                3px;
            }


            .summary-row span:last-child,
            .info-row span:last-child {

              text-align:
                right;

              word-break:
                break-word;
            }


            .label {

              font-weight:
                700;
            }


            .items {

              border-top:
                2px solid #000;

              border-bottom:
                2px solid #000;

              padding:
                7px 0;
            }


            .item {

              margin-bottom:
                7px;
            }


            .item:last-child {

              margin-bottom:
                0;
            }


            .item-main {

              display:
                flex;

              justify-content:
                space-between;

              gap:
                7px;

              font-size:
                12px;

              font-weight:
                700;
            }


            .unit-price,
            .sub-item,
            .instruction {

              font-size:
                9px;

              color:
                #333;

              margin-top:
                2px;
            }


            .instruction {

              font-style:
                italic;
            }


            .summary {

              margin-top:
                7px;

              padding-top:
                6px;

              border-top:
                1px dashed #000;
            }


            .payment-block {

              margin-top:
                5px;

              padding-top:
                5px;

              border-top:
                1px dotted #000;
            }


            .reference {

              text-align:
                right;

              word-break:
                break-all;
            }


            .net-total {

              font-size:
                14px;

              font-weight:
                900;

              margin-top:
                5px;

              padding-top:
                5px;

              border-top:
                1px solid #000;
            }


            .section {

              margin-top:
                7px;

              padding-top:
                6px;

              border-top:
                1px dashed #000;
            }


            .section-title {

              font-weight:
                900;

              margin-bottom:
                4px;
            }


            .footer {

              text-align:
                center;

              border-top:
                2px dashed #000;

              margin-top:
                8px;

              padding-top:
                7px;

              font-size:
                10px;
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
                ${order.orderType || '-'}
              </span>

            </div>


            <div class="meta-row">

              <span class="label">
                Date
              </span>

              <span>
                ${new Date(
                  order.createdAt ||
                  sale.createdAt
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
                  order.netAmount ||
                  sale.amount ||
                  0
                ).toFixed(2)}
              </span>

            </div>


            ${paymentHtml}


          </div>


          <div class="footer">

            Thank you for dining with us!

          </div>


        </body>

      </html>
    `)


    printWindow.document.close()


    printWindow.focus()


    setTimeout(() => {

      try {

        if (
          !printWindow.closed
        ) {

          printWindow.print()
        }

      } catch (error) {

        console.error(
          'Sales Record receipt print error:',
          error
        )

      }

    }, 500)


    printWindow.onafterprint =
      () => {

        setTimeout(() => {

          try {

            if (
              !printWindow.closed
            ) {

              printWindow.close()
            }

          } catch (error) {

            console.warn(
              'Unable to close Sales Record receipt window:',
              error
            )
          }

        }, 300)
      }
  }

// =========================
// SALES TOTALS
// =========================

const totalSales = computed(() => {
  return salesRecords.value.reduce(
    (total, sale) =>
      total + Number(sale.amount || 0),
    0
  )
})

const getCashSalesAmount = sale => {
  if (
    sale.cashAmount !== undefined &&
    sale.cashAmount !== null
  ) {
    return Number(sale.cashAmount || 0)
  }

  if (sale.paymentMethod === 'Cash') {
    return Number(sale.amount || 0)
  }

  return 0
}

const getGCashSalesAmount = sale => {
  if (
    sale.gcashAmount !== undefined &&
    sale.gcashAmount !== null
  ) {
    return Number(sale.gcashAmount || 0)
  }

  if (sale.paymentMethod === 'GCash') {
    return Number(sale.amount || 0)
  }

  return 0
}

const totalCashSales = computed(() => {
  return salesRecords.value.reduce(
    (total, sale) =>
      total + getCashSalesAmount(sale),
    0
  )
})

const totalGCashSales = computed(() => {
  return salesRecords.value.reduce(
    (total, sale) =>
      total + getGCashSalesAmount(sale),
    0
  )
})

const transactionCount = computed(() => {
  return salesRecords.value.length
})

// =========================
// INITIAL LOAD
// =========================

onMounted(() => {
  fetchSalesRecords()
})
</script>

<template>
  <div class="p-4 md:p-6 space-y-6">

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
          Sales Records
        </h1>

        <p class="text-gray-500 mt-1">
          Paid sales for {{ formatDisplayDate(selectedDate) }}
        </p>
      </div>

      <!-- Admin Date Picker -->
      <div
        v-if="isAdmin"
        class="flex flex-col gap-1"
      >
        <label
          class="text-sm font-bold text-gray-700"
        >
          Select Date
        </label>

        <input
          v-model="selectedDate"
          @change="handleDateChange"
          type="date"
          class="border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <!-- ========================= -->
    <!-- ERROR -->
    <!-- ========================= -->

    <div
      v-if="errorMessage"
      class="bg-red-100 text-red-700 border border-red-200 rounded-lg p-4 font-medium"
    >
      {{ errorMessage }}
    </div>

    <!-- ========================= -->
    <!-- SUMMARY -->
    <!-- ========================= -->

    <div
      class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >

      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
      >
        <p class="text-sm font-bold text-gray-500">
          Total Sales
        </p>

        <p class="text-2xl font-black text-green-600 mt-2">
          {{ formatCurrency(totalSales) }}
        </p>
      </div>

      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
      >
        <p class="text-sm font-bold text-gray-500">
          Paid Transactions
        </p>

        <p class="text-2xl font-black text-blue-600 mt-2">
          {{ transactionCount }}
        </p>
      </div>

      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
      >
        <p class="text-sm font-bold text-gray-500">
          Cash Sales
        </p>

        <p class="text-2xl font-black text-gray-800 mt-2">
          {{ formatCurrency(totalCashSales) }}
        </p>
      </div>

      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
      >
        <p class="text-sm font-bold text-gray-500">
          GCash Sales
        </p>

        <p class="text-2xl font-black text-purple-600 mt-2">
          {{ formatCurrency(totalGCashSales) }}
        </p>
      </div>

    </div>

    <!-- ========================= -->
    <!-- LOADING -->
    <!-- ========================= -->

    <div
      v-if="loading"
      class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center"
    >
      <p class="text-gray-500 font-medium">
        Loading sales records...
      </p>
    </div>

    <!-- ========================= -->
    <!-- NO RECORDS -->
    <!-- ========================= -->

    <div
      v-else-if="salesRecords.length === 0"
      class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center"
    >
      <p class="text-gray-500 font-medium">
        Walang paid sales record para sa araw na ito.
      </p>
    </div>

    <!-- ========================= -->
    <!-- SALES TABLE -->
    <!-- ========================= -->

    <div
      v-else
      class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
    >

      <div
        class="px-5 py-4 border-b border-gray-200"
      >
        <h2 class="text-lg font-black text-gray-800">
          Sales Transactions
        </h2>

        <p class="text-xs text-gray-500 mt-1">
          Click a transaction to view the complete details.
        </p>
      </div>

      <div class="overflow-x-auto">

        <table class="w-full text-sm">

          <thead
            class="bg-gray-50 border-b border-gray-200"
          >
            <tr>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600 whitespace-nowrap"
              >
                Time
              </th>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600 whitespace-nowrap"
              >
                Order
              </th>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600 whitespace-nowrap"
              >
                Type
              </th>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600 whitespace-nowrap"
              >
                Cashier
              </th>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600 whitespace-nowrap"
              >
                Payment
              </th>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600 whitespace-nowrap"
              >
                Reference
              </th>

              <th
                class="text-right px-5 py-3 font-bold text-gray-600 whitespace-nowrap"
              >
                Amount
              </th>

              <th
                class="text-center px-5 py-3 font-bold text-gray-600 whitespace-nowrap"
              >
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            <tr
              v-for="payment in salesRecords"
              :key="payment._id"
              @click="openSaleDetails(payment)"
              class="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
            >

              <td
                class="px-5 py-4 text-gray-700 whitespace-nowrap"
              >
                {{ formatTime(payment.createdAt) }}
              </td>

              <td
                class="px-5 py-4 font-bold text-gray-800 whitespace-nowrap"
              >
                {{
                  payment.order?.orderNumber
                    ? `#${payment.order.orderNumber}`
                    : 'Delivery'
                }}
              </td>

              <td
                class="px-5 py-4 text-gray-700 whitespace-nowrap"
              >
                {{ payment.order?.orderType || '-' }}
              </td>

              <td
                class="px-5 py-4 text-gray-700 whitespace-nowrap"
              >
                {{
                  payment.order?.cashier?.username ||
                  payment.receivedBy?.username ||
                  'Unknown'
                }}
              </td>

              <td
                class="px-5 py-4 whitespace-nowrap"
              >
                <span
                  class="inline-flex px-3 py-1 rounded-full text-xs font-bold"
                  :class="
                    payment.paymentMethod === 'Cash'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  "
                >
                  {{ payment.paymentMethod }}
                </span>
              </td>

              <td
                class="px-5 py-4 text-gray-600 whitespace-nowrap"
              >
                {{
                  (
                    payment.paymentMethod === 'GCash' ||
                    payment.paymentMethod === 'Multiple'
                  )
                    ? payment.referenceNumber || '-'
                    : '-'
                }}
              </td>

              <td
                class="px-5 py-4 text-right font-black text-gray-800 whitespace-nowrap"
              >
                {{ formatCurrency(payment.amount) }}
              </td>

              <td
                class="px-5 py-4 text-center"
              >
                <button
                  type="button"
                  @click.stop="
                    reprintCustomerReceipt(payment)
                  "
                  class="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all"
                  title="Reprint Customer Receipt"
                  aria-label="Reprint Customer Receipt"
                >
                  🖨️
                </button>
              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>

    <!-- ========================= -->
    <!-- SALE DETAILS MODAL -->
    <!-- ========================= -->

    <div
      v-if="isDetailsModalOpen && selectedSale"
      class="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      @click.self="closeSaleDetails"
    >

      <div
        class="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >

        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-200">

          <div
            class="flex items-start justify-between gap-4"
          >

            <div>

              <h2
                class="text-xl font-black text-gray-800"
              >
                Sale Details
              </h2>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                {{
                  selectedSale.order?.orderNumber
                    ? `Order #${selectedSale.order.orderNumber}`
                    : 'Delivery Order'
                }}
              </p>

            </div>

            <button
              type="button"
              @click="closeSaleDetails"
              class="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-black"
            >
              ×
            </button>

          </div>

        </div>

        <!-- Body -->
        <div
          class="flex-1 overflow-y-auto p-5 space-y-6"
        >

          <!-- Order Information -->
          <div
            class="bg-gray-50 rounded-xl p-4"
          >

            <h3
              class="text-sm font-black text-gray-700 mb-3"
            >
              ORDER INFORMATION
            </h3>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"
            >

              <div class="flex justify-between gap-3">
                <span class="text-gray-500">
                  Order
                </span>

                <span class="font-bold text-gray-800">
                  {{
                    selectedSale.order?.orderNumber
                      ? `#${selectedSale.order.orderNumber}`
                      : 'Delivery'
                  }}
                </span>
              </div>

              <div class="flex justify-between gap-3">
                <span class="text-gray-500">
                  Type
                </span>

                <span class="font-bold text-gray-800">
                  {{ selectedSale.order?.orderType || '-' }}
                </span>
              </div>

              <div class="flex justify-between gap-3">
                <span class="text-gray-500">
                  Cashier
                </span>

                <span class="font-bold text-gray-800">
                  {{
                    selectedSale.order?.cashier?.username ||
                    selectedSale.receivedBy?.username ||
                    'Unknown'
                  }}
                </span>
              </div>

              <div class="flex justify-between gap-3">
                <span class="text-gray-500">
                  Payment Time
                </span>

                <span
                  class="font-bold text-gray-800 text-right"
                >
                  {{ formatDateTime(selectedSale.createdAt) }}
                </span>
              </div>

              <div
                v-if="selectedSale.order?.customer?.name"
                class="flex justify-between gap-3 sm:col-span-2"
              >
                <span class="text-gray-500">
                  Customer
                </span>

                <span
                  class="font-bold text-gray-800 text-right"
                >
                  {{ selectedSale.order.customer.name }}
                </span>
              </div>

            </div>

          </div>

          <!-- Items -->
          <div>

            <h3
              class="text-sm font-black text-gray-700 mb-3"
            >
              ORDER ITEMS
            </h3>

            <div
              class="border border-gray-200 rounded-xl overflow-hidden"
            >

              <div
                v-for="item in selectedSale.order?.items || []"
                :key="item._id"
                class="p-4 border-b border-gray-100 last:border-b-0"
              >

                <div
                  class="flex justify-between gap-4"
                >

                  <div class="min-w-0">

                    <p
                      class="font-bold text-gray-800"
                    >
                      {{ item.quantity }}x {{ item.name }}
                    </p>

                    <p
                      class="text-xs text-gray-500 mt-1"
                    >
                      {{ formatCurrency(item.price) }} each
                    </p>

                    <div
                      v-if="item.addOns?.length"
                      class="mt-2 space-y-1"
                    >

                      <p
                        class="text-xs font-bold text-gray-500"
                      >
                        Add-ons:
                      </p>

                      <p
                        v-for="addOn in item.addOns"
                        :key="addOn.addOnId"
                        class="text-xs text-gray-500"
                      >
                        + {{ addOn.name }}
                        ({{ formatCurrency(addOn.price) }})
                      </p>

                    </div>

                    <p
                      v-if="item.specialInstructions"
                      class="text-xs text-gray-500 italic mt-2"
                    >
                      Note: {{ item.specialInstructions }}
                    </p>

                  </div>

                  <span
                    class="font-black text-gray-800 whitespace-nowrap"
                  >
                    {{ formatCurrency(item.subtotal) }}
                  </span>

                </div>

              </div>

            </div>

          </div>

          <!-- Order Summary -->
          <div>

            <h3
              class="text-sm font-black text-gray-700 mb-3"
            >
              ORDER SUMMARY
            </h3>

            <div
              class="border border-gray-200 rounded-xl p-4 space-y-3"
            >

              <div class="flex justify-between">
                <span class="text-gray-500">
                  Gross Sales
                </span>

                <span class="font-semibold text-gray-800">
                  {{
                    formatCurrency(
                      selectedSale.order?.grossAmount
                    )
                  }}
                </span>
              </div>

              <div
                v-if="
                  Number(
                    selectedSale.order?.discountAmount || 0
                  ) > 0
                "
                class="flex justify-between"
              >
                <span class="text-gray-500">
                  Discount
                </span>

                <span class="font-semibold text-red-600">
                  -{{
                    formatCurrency(
                      selectedSale.order?.discountAmount
                    )
                  }}
                </span>
              </div>

              <div
                v-if="
                  Number(
                    selectedSale.order?.deliveryFee || 0
                  ) > 0
                "
                class="flex justify-between"
              >
                <span class="text-gray-500">
                  Delivery Fee
                </span>

                <span class="font-semibold text-gray-800">
                  {{
                    formatCurrency(
                      selectedSale.order?.deliveryFee
                    )
                  }}
                </span>
              </div>

              <div
                class="pt-3 border-t border-gray-200 flex justify-between items-center"
              >
                <span class="font-black text-gray-700">
                  NET TOTAL
                </span>

                <span
                  class="text-xl font-black text-gray-900"
                >
                  {{
                    formatCurrency(
                      selectedSale.order?.netAmount
                    )
                  }}
                </span>
              </div>

            </div>

          </div>

          <!-- Payment Details -->
          <div>

            <h3
              class="text-sm font-black text-gray-700 mb-3"
            >
              PAYMENT DETAILS
            </h3>

            <div
              class="border border-gray-200 rounded-xl p-4 space-y-4"
            >

              <div class="flex justify-between">
                <span class="text-gray-500">
                  Current Order Total
                </span>

                <span class="font-black text-gray-800">
                  {{
                    formatCurrency(
                      selectedSale.order?.netAmount
                    )
                  }}
                </span>
              </div>

              <div
                class="flex justify-between pt-3 border-t border-gray-200"
              >
                <span class="font-bold text-gray-700">
                  Net Paid
                </span>

                <span class="font-black text-green-600">
                  {{
                    formatCurrency(
                      selectedSale.totalPaid
                    )
                  }}
                </span>
              </div>

              <div
                class="pt-3 border-t border-gray-200"
              >

                <p
                  class="text-sm font-black text-gray-700 mb-3"
                >
                  PAYMENT HISTORY
                </p>

                <div
                  v-if="selectedSale.payments?.length"
                  class="space-y-3"
                >

                  <div
                    v-for="payment in selectedSale.payments"
                    :key="payment._id"
                    class="border border-gray-200 rounded-xl p-4"
                  >

                    <div
                      class="flex items-center justify-between gap-3 mb-3"
                    >

                      <div
                        class="flex items-center gap-2"
                      >

                        <span
                          class="inline-flex px-2.5 py-1 rounded-full text-xs font-black"
                          :class="
                            payment.type === 'Refund'
                              ? 'bg-red-100 text-red-700'
                              : payment.type === 'Adjustment'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                          "
                        >
                          {{
                            payment.type || 'Payment'
                          }}
                        </span>

                        <span
                          class="text-xs font-bold text-gray-500"
                        >
                          {{ payment.paymentMethod }}
                        </span>

                      </div>

                      <span
                        class="font-black"
                        :class="
                          payment.type === 'Refund'
                            ? 'text-red-600'
                            : 'text-gray-800'
                        "
                      >
                        {{
                          payment.type === 'Refund'
                            ? '-'
                            : ''
                        }}{{ formatCurrency(payment.amount) }}
                      </span>

                    </div>

                    <div
                      class="flex justify-between gap-3 text-sm mb-2"
                    >

                      <span class="text-gray-500">
                        Date / Time
                      </span>

                      <span
                        class="font-semibold text-gray-800 text-right"
                      >
                        {{ formatDateTime(payment.createdAt) }}
                      </span>

                    </div>

                    <!-- Cash -->
                    <template
                      v-if="
                        payment.paymentMethod === 'Cash' &&
                        payment.type !== 'Refund'
                      "
                    >

                      <div
                        class="flex justify-between gap-3 text-sm mb-2"
                      >

                        <span class="text-gray-500">
                          Amount
                        </span>

                        <span class="font-semibold text-gray-800">
                          {{
                            formatCurrency(
                              payment.amount
                            )
                          }}
                        </span>

                      </div>

                      <div
                        class="flex justify-between gap-3 text-sm mb-2"
                      >

                        <span class="text-gray-500">
                          Amount Tendered
                        </span>

                        <span class="font-semibold text-gray-800">
                          {{
                            formatCurrency(
                              payment.amountTendered
                            )
                          }}
                        </span>

                      </div>

                      <div
                        class="flex justify-between gap-3 text-sm"
                      >

                        <span class="text-gray-500">
                          Change
                        </span>

                        <span class="font-semibold text-green-600">
                          {{
                            formatCurrency(
                              payment.change
                            )
                          }}
                        </span>

                      </div>

                    </template>

                    <!-- GCash -->
                    <template
                      v-if="
                        payment.paymentMethod === 'GCash'
                      "
                    >

                      <div
                        class="flex justify-between gap-3 text-sm"
                      >

                        <span class="text-gray-500">
                          Reference Number
                        </span>

                        <span
                          class="font-semibold text-gray-800 text-right break-all"
                        >
                          {{
                            payment.referenceNumber ||
                            '-'
                          }}
                        </span>

                      </div>

                    </template>

                    <!-- Refund -->
                    <template
                      v-if="
                        payment.type === 'Refund'
                      "
                    >

                      <div
                        class="flex justify-between gap-3 text-sm"
                      >

                        <span class="text-gray-500">
                          Refund Amount
                        </span>

                        <span class="font-semibold text-red-600">
                          -{{
                            formatCurrency(
                              payment.amount
                            )
                          }}
                        </span>

                      </div>

                    </template>

                    <div
                      class="flex justify-between gap-3 text-sm mt-2 pt-2 border-t border-gray-100"
                    >

                      <span class="text-gray-500">
                        Processed By
                      </span>

                      <span class="font-semibold text-gray-800">
                        {{
                          payment.receivedBy?.username ||
                          'Unknown'
                        }}
                      </span>

                    </div>

                  </div>

                </div>

                <div
                  v-else
                  class="text-sm text-gray-400"
                >
                  No payment history available.
                </div>

              </div>

            </div>

          </div>

        </div>

        <!-- Footer -->
        <div
          class="shrink-0 px-5 py-4 border-t border-gray-200 bg-gray-50"
        >

          <div class="flex gap-3">

            <button
              type="button"
              @click="closeSaleDetails"
              class="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold"
            >
              Close
            </button>

            <button
              type="button"
              @click="openEditOrder"
              class="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Edit Order
            </button>

            <button
              type="button"
              @click="openVoidModal"
              class="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Void Order
            </button>

          </div>

        </div>

      </div>

    </div>

    <!-- ========================= -->
    <!-- EDIT ORDER MODAL -->
    <!-- ========================= -->

    <div
      v-if="isEditModalOpen && selectedSale"
      class="fixed inset-0 z-[105] bg-black/50 flex items-center justify-center p-4"
    >

      <div
        class="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >

        <!-- Header -->
        <div
          class="px-5 py-4 border-b border-gray-200 bg-white shrink-0"
        >

          <div
            class="flex items-start justify-between gap-4"
          >

            <div>

              <h2
                class="text-xl font-black text-gray-800"
              >
                Edit Order
              </h2>

              <p
                class="text-sm text-gray-500 mt-1"
              >
                {{
                  selectedSale.order?.orderNumber
                    ? `Order #${selectedSale.order.orderNumber}`
                    : 'Delivery Order'
                }}
              </p>

            </div>

            <button
              type="button"
              @click="closeEditOrder"
              :disabled="editLoading"
              class="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-black disabled:opacity-50"
            >
              ×
            </button>

          </div>

        </div>

        <!-- Body -->
        <div
          class="flex-1 overflow-y-auto p-5 space-y-5"
        >

          <!-- Error -->
          <div
            v-if="editError"
            class="bg-red-100 text-red-700 border border-red-200 rounded-xl p-4 text-sm font-medium"
          >
            {{ editError }}
          </div>

          <!-- Order Items -->
          <div>

            <div
              class="flex items-center justify-between mb-3"
            >

              <h3
                class="text-sm font-black text-gray-700"
              >
                ORDER ITEMS
              </h3>

              <span
                class="text-xs text-gray-400"
              >
                Modify quantity, add-ons, replace, or remove
              </span>

            </div>

            <div
              v-if="editItems.length === 0"
              class="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-400"
            >
              Walang items sa order.
            </div>

            <div
              v-else
              class="border border-gray-200 rounded-xl overflow-hidden"
            >

              <div
                v-for="(item, index) in editItems"
                :key="`${item.menuId}-${index}`"
                class="p-4 border-b border-gray-100 last:border-b-0"
              >

                <!-- Item Main -->
                <div
                  class="flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                >

                  <!-- Item Info -->
                  <div class="min-w-0 flex-1">

                    <p
                      class="font-bold text-gray-800"
                    >
                      {{ item.name }}
                    </p>

                    <p
                      class="text-xs text-gray-500 mt-1"
                    >
                      ₱{{ Number(item.price).toFixed(2) }}
                      each
                    </p>

                    <!-- Existing Add-ons -->
                    <div
                      v-if="item.addOns?.length"
                      class="mt-2 space-y-1"
                    >

                      <p
                        class="text-xs font-bold text-gray-500"
                      >
                        Add-ons:
                      </p>

                      <p
                        v-for="addOn in item.addOns"
                        :key="addOn.addOnId"
                        class="text-xs text-gray-500"
                      >
                        + {{ addOn.name }}
                        (₱{{ Number(addOn.price).toFixed(2) }})
                      </p>

                    </div>

                    <!-- Add/Edit Add-ons -->
                    <button
                      type="button"
                      @click="openEditAddOns(index)"
                      class="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      {{
                        editingAddOnItemIndex === index
                          ? 'Close Add-ons'
                          : item.addOns?.length
                            ? 'Edit Add-ons'
                            : 'Add Add-ons'
                      }}
                    </button>

                    <!-- INLINE ADD-ONS EDITOR -->
                    <div
                      v-if="
                        editingAddOnItemIndex === index
                      "
                      class="mt-3 border border-blue-200 bg-blue-50 rounded-xl p-4"
                    >

                      <div
                        class="flex items-center justify-between gap-3 mb-3"
                      >

                        <div>

                          <p
                            class="text-sm font-black text-blue-800"
                          >
                            Edit Add-ons
                          </p>

                          <p
                            class="text-xs text-blue-600 mt-0.5"
                          >
                            Select or remove add-ons for this item.
                          </p>

                        </div>

                        <button
                          type="button"
                          @click="closeEditAddOns"
                          class="text-xs font-bold text-gray-500 hover:text-red-600"
                        >
                          Close
                        </button>

                      </div>

                      <div
                        v-if="editAddOns.length === 0"
                        class="text-sm text-gray-500 bg-white rounded-lg p-3"
                      >
                        Walang available add-ons.
                      </div>

                      <div
                        v-else
                        class="space-y-2"
                      >

                        <button
                          v-for="addOn in editAddOns"
                          :key="addOn._id"
                          type="button"
                          @click="toggleEditAddOn(addOn._id)"
                          class="w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors"
                          :class="
                            selectedEditAddOnIds.includes(
                              addOn._id
                            )
                              ? 'border-blue-500 bg-white'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          "
                        >

                          <div
                            class="flex items-center gap-3 min-w-0"
                          >

                            <div
                              class="w-6 h-6 rounded-md border flex items-center justify-center shrink-0"
                              :class="
                                selectedEditAddOnIds.includes(
                                  addOn._id
                                )
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-gray-300'
                              "
                            >

                              <span
                                v-if="
                                  selectedEditAddOnIds.includes(
                                    addOn._id
                                  )
                                "
                                class="text-sm font-black"
                              >
                                ✓
                              </span>

                            </div>

                            <span
                              class="font-bold text-gray-800 truncate"
                            >
                              {{ addOn.name }}
                            </span>

                          </div>

                          <span
                            class="font-black text-gray-700 whitespace-nowrap"
                          >
                            +₱{{
                              Number(
                                addOn.price
                              ).toFixed(2)
                            }}
                          </span>

                        </button>

                      </div>

                      <div
                        class="mt-4 pt-3 border-t border-blue-200 flex justify-between items-center"
                      >

                        <span
                          class="text-sm font-bold text-gray-600"
                        >
                          Selected Add-ons
                        </span>

                        <span
                          class="font-black text-blue-700"
                        >
                          {{
                            editAddOns.filter(addOn =>
                              selectedEditAddOnIds.includes(
                                addOn._id
                              )
                            ).length
                          }}
                        </span>

                      </div>

                      <div
                        class="mt-3 flex justify-end"
                      >

                        <button
                          type="button"
                          @click="confirmEditAddOns"
                          class="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
                        >
                          Apply Add-ons
                        </button>

                      </div>

                    </div>

                    <!-- Special Instruction -->
                    <input
                      v-model="item.specialInstructions"
                      type="text"
                      placeholder="Special instruction..."
                      class="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                    />

                  </div>

                  <!-- Controls -->
                  <div
                    class="flex flex-wrap items-center gap-3"
                  >

                    <!-- Quantity -->
                    <div
                      class="flex items-center bg-gray-100 rounded-lg overflow-hidden"
                    >

                      <button
                        type="button"
                        @click="decreaseEditQuantity(index)"
                        class="w-9 h-9 font-bold text-gray-600 hover:bg-gray-200"
                      >
                        −
                      </button>

                      <span
                        class="w-10 text-center font-black"
                      >
                        {{ item.quantity }}
                      </span>

                      <button
                        type="button"
                        @click="increaseEditQuantity(index)"
                        class="w-9 h-9 font-bold text-gray-600 hover:bg-gray-200"
                      >
                        +
                      </button>

                    </div>

                    <!-- Subtotal -->
                    <span
                      class="font-black text-gray-800 whitespace-nowrap"
                    >
                      ₱{{
                        (
                          (
                            Number(item.price || 0) +
                            (item.addOns || []).reduce(
                              (total, addOn) =>
                                total +
                                Number(addOn.price || 0),
                              0
                            )
                          ) *
                          Number(item.quantity || 0)
                        ).toFixed(2)
                      }}
                    </span>

                    <!-- Replace -->
                    <button
                      type="button"
                      @click="openReplaceModal(index)"
                      class="text-sm font-bold text-blue-600 hover:text-blue-700"
                    >
                      Replace
                    </button>

                    <!-- Remove -->
                    <button
                      type="button"
                      @click="removeEditItem(index)"
                      class="text-sm font-bold text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>

          <!-- Add Menu Item -->
          <div
            class="border border-gray-200 rounded-xl p-4"
          >

            <h3
              class="text-sm font-black text-gray-700 mb-3"
            >
              ADD MENU ITEM
            </h3>

            <div
              class="flex flex-col sm:flex-row gap-3"
            >

              <select
                v-model="selectedMenuId"
                class="flex-1 border border-gray-300 rounded-xl px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-200"
              >

                <option value="">
                  Select menu item
                </option>

                <option
                  v-for="menu in editMenus.filter(item => item.isAvailable)"
                  :key="menu._id"
                  :value="menu._id"
                >
                  {{ menu.name }} - ₱{{ Number(menu.price).toFixed(2) }}
                </option>

              </select>

              <button
                type="button"
                @click="addEditMenuItem"
                :disabled="!selectedMenuId"
                class="sm:w-32 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Item
              </button>

            </div>

          </div>

          <!-- Delivery -->
          <div
            v-if="selectedSale.order?.orderType === 'Delivery'"
            class="border border-gray-200 rounded-xl p-4 space-y-4"
          >

            <h3
              class="text-sm font-black text-gray-700"
            >
              DELIVERY DETAILS
            </h3>

            <div>

              <label
                class="block text-sm font-semibold text-gray-700 mb-1"
              >
                Customer Name
              </label>

              <input
                v-model="editCustomer.name"
                type="text"
                class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-200"
              />

            </div>

            <div>

              <label
                class="block text-sm font-semibold text-gray-700 mb-1"
              >
                Delivery Fee
              </label>

              <input
                v-model.number="editDeliveryFee"
                type="number"
                min="0"
                step="0.01"
                class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-200"
              />

            </div>

            <div>

              <label
                class="block text-sm font-semibold text-gray-700 mb-1"
              >
                Notes
              </label>

              <input
                v-model="editCustomer.notes"
                type="text"
                class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-200"
              />

            </div>

          </div>

          <!-- Discount -->
          <div
            class="border border-gray-200 rounded-xl p-4"
          >

            <label
              class="block text-sm font-black text-gray-700 mb-2"
            >
              DISCOUNT
            </label>

            <div
              class="flex items-center gap-2"
            >

              <span class="text-gray-500">
                ₱
              </span>

              <input
                v-model.number="editDiscountAmount"
                type="number"
                min="0"
                step="0.01"
                class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-200"
              />

            </div>

          </div>

          <!-- Preview -->
          <div
            v-if="editPreview"
            class="border border-blue-200 bg-blue-50 rounded-xl p-4"
          >

            <h3
              class="text-sm font-black text-blue-800 mb-3"
            >
              EDIT PREVIEW
            </h3>

            <div class="space-y-2 text-sm">

              <div class="flex justify-between">
                <span class="text-gray-600">
                  Old Total
                </span>

                <span class="font-bold">
                  {{ formatCurrency(editPreview.oldTotal) }}
                </span>
              </div>

              <div class="flex justify-between">
                <span class="text-gray-600">
                  Already Paid
                </span>

                <span class="font-bold">
                  {{ formatCurrency(editPreview.alreadyPaid) }}
                </span>
              </div>

              <div class="flex justify-between">
                <span class="text-gray-600">
                  New Total
                </span>

                <span class="font-black">
                  {{ formatCurrency(editPreview.newTotal) }}
                </span>
              </div>

              <div
                class="pt-3 mt-3 border-t border-blue-200 flex justify-between"
              >

                <span
                  class="font-black text-gray-700"
                >
                  Difference
                </span>

                <span
                  class="font-black"
                  :class="
                    editPreview.difference > 0
                      ? 'text-orange-600'
                      : editPreview.difference < 0
                        ? 'text-red-600'
                        : 'text-green-600'
                  "
                >
                  {{
                    editPreview.difference > 0
                      ? '+'
                      : ''
                  }}{{ formatCurrency(editPreview.difference) }}
                </span>

              </div>

              <div
                v-if="editPreview.requiresAdditionalPayment"
                class="mt-3 p-3 rounded-lg bg-orange-100 text-orange-800 text-sm font-bold"
              >
                Additional payment required:
                {{ formatCurrency(editPreview.additionalPayment) }}
              </div>

              <div
                v-if="editPreview.requiresRefund"
                class="mt-3 p-3 rounded-lg bg-red-100 text-red-800 text-sm font-bold"
              >
                Refund required:
                {{ formatCurrency(editPreview.refundAmount) }}
              </div>

              <div
                v-if="editPreview.difference === 0"
                class="mt-3 p-3 rounded-lg bg-green-100 text-green-800 text-sm font-bold"
              >
                Walang payment adjustment. Pareho ang old at new total.
              </div>

            </div>

          </div>

        </div>

        <!-- Footer -->
        <div
          class="shrink-0 px-5 py-4 border-t border-gray-200 bg-gray-50"
        >

          <div class="flex gap-3">

            <button
              type="button"
              @click="closeEditOrder"
              :disabled="editLoading"
              class="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              v-if="!editPreview"
              type="button"
              @click="previewOrderChanges"
              :disabled="
                editLoading ||
                editItems.length === 0
              "
              class="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {{
                editLoading
                  ? 'Checking...'
                  : 'Preview Changes'
              }}
            </button>

            <button
              v-else
              type="button"
              @click="openEditPaymentStep"
              :disabled="editLoading"
              class="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {{
                editLoading
                  ? 'Saving...'
                  : editPreview.difference > 0
                    ? 'Proceed to Payment'
                    : editPreview.difference < 0
                      ? 'Proceed to Refund'
                      : 'Save Changes'
              }}
            </button>

          </div>

        </div>

      </div>

    </div>

    <!-- ========================= -->
    <!-- REPLACE ITEM MODAL -->
    <!-- ========================= -->

    <div
      v-if="isReplaceModalOpen"
      class="fixed inset-0 z-[115] bg-black/50 flex items-center justify-center p-4"
      @click.self="closeReplaceModal"
    >

      <div
        class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >

        <div
          class="px-5 py-4 bg-blue-600 text-white"
        >

          <h2 class="text-lg font-black">
            Replace Item
          </h2>

          <p
            class="text-sm text-white/80 mt-1"
          >
            Pumili ng bagong menu item.
          </p>

        </div>

        <div class="p-5 space-y-4">

          <div
            v-if="replacingItemIndex !== null"
            class="bg-gray-50 rounded-xl p-4"
          >

            <p class="text-xs text-gray-500">
              Current Item
            </p>

            <p
              class="font-black text-gray-800 mt-1"
            >
              {{
                editItems[
                  replacingItemIndex
                ]?.name || '-'
              }}
            </p>

            <p
              class="text-sm text-gray-500 mt-1"
            >
              Quantity:
              {{
                editItems[
                  replacingItemIndex
                ]?.quantity || 0
              }}
            </p>

          </div>

          <div>

            <label
              class="block text-sm font-bold text-gray-700 mb-2"
            >
              Replace With
            </label>

            <select
              v-model="replacementMenuId"
              class="w-full border border-gray-300 rounded-xl px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-200"
            >

              <option value="">
                Select menu item
              </option>

              <option
                v-for="menu in editMenus.filter(item => item.isAvailable)"
                :key="menu._id"
                :value="menu._id"
              >
                {{ menu.name }} - ₱{{ Number(menu.price).toFixed(2) }}
              </option>

            </select>

          </div>

        </div>

        <div
          class="px-5 py-4 border-t border-gray-200 bg-gray-50"
        >

          <div class="flex gap-3">

            <button
              type="button"
              @click="closeReplaceModal"
              class="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold"
            >
              Cancel
            </button>

            <button
              type="button"
              @click="confirmReplaceItem"
              :disabled="!replacementMenuId"
              class="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Replace Item
            </button>

          </div>

        </div>

      </div>

    </div>

    <!-- ========================= -->
    <!-- EDIT PAYMENT / REFUND -->
    <!-- ========================= -->

    <div
      v-if="isAdjustmentModalOpen && editPreview"
      class="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4"
    >

      <div
        class="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >

        <!-- Additional Payment -->
        <template
          v-if="editPreview.difference > 0"
        >

          <!-- Header -->
          <div
            class="shrink-0 px-5 py-4 bg-orange-600 text-white"
          >

            <h2 class="text-lg font-black">
              Additional Payment
            </h2>

            <p
              class="text-sm text-white/80 mt-1"
            >
              May dagdag na bayad dahil tumaas ang order total.
            </p>

          </div>

          <!-- Scrollable Body -->
          <div
            class="flex-1 min-h-0 overflow-y-auto p-5 space-y-5"
          >

            <div
              class="bg-orange-50 border border-orange-200 rounded-xl p-4"
            >

              <div class="flex justify-between gap-3">

                <span class="text-gray-600">
                  Additional Due
                </span>

                <span
                  class="text-xl font-black text-orange-700 whitespace-nowrap"
                >
                  {{
                    formatCurrency(
                      editPreview.additionalPayment
                    )
                  }}
                </span>

              </div>

            </div>

            <!-- Payment Method -->
            <div>

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                Payment Method
              </label>

              <div class="grid grid-cols-2 gap-3">

                <button
                  type="button"
                  @click="
                    adjustmentPaymentMethod = 'Cash'
                  "
                  :class="
                    adjustmentPaymentMethod === 'Cash'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  "
                  class="py-3 rounded-xl border font-bold"
                >
                  Cash
                </button>

                <button
                  type="button"
                  @click="
                    adjustmentPaymentMethod = 'GCash'
                  "
                  :class="
                    adjustmentPaymentMethod === 'GCash'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  "
                  class="py-3 rounded-xl border font-bold"
                >
                  GCash
                </button>

              </div>

            </div>

            <!-- Cash -->
            <div
              v-if="
                adjustmentPaymentMethod === 'Cash'
              "
            >

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                Amount Tendered
              </label>

              <input
                :value="
                  adjustmentAmountTendered || '0'
                "
                type="text"
                readonly
                inputmode="none"
                class="w-full border border-gray-300 rounded-xl p-3.5 text-2xl font-black text-right bg-gray-50 outline-none"
              />

              <!-- Touchscreen Keypad -->
              <div
                class="bg-gray-100 rounded-2xl p-3"
              >

                <div
                  class="grid grid-cols-3 gap-2"
                >

                  <button
                    type="button"
                    @click="appendAdjustmentKey('1')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    1
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('2')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    2
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('3')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    3
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('4')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    4
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('5')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    5
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('6')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    6
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('7')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    7
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('8')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    8
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('9')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    9
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('clear')"
                    class="h-14 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base font-black active:scale-95"
                  >
                    C
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('0')"
                    class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black active:scale-95"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    @click="appendAdjustmentKey('backspace')"
                    class="h-14 rounded-xl bg-gray-200 border border-gray-300 text-lg font-black active:scale-95"
                  >
                    ←
                  </button>

                </div>

                <button
                  type="button"
                  @click="appendAdjustmentKey('.')"
                  class="w-full h-12 mt-2 rounded-xl bg-white border border-gray-200 text-lg font-black active:scale-95"
                >
                  .
                </button>

              </div>

              <!-- Change -->
              <div
                class="mt-3 flex justify-between text-sm"
              >

                <span class="text-gray-500">
                  Change
                </span>

                <span
                  class="font-black text-green-600"
                >
                  {{
                    formatCurrency(
                      Math.max(
                        0,
                        Number(
                          adjustmentAmountTendered || 0
                        ) -
                        Number(
                          editPreview.additionalPayment || 0
                        )
                      )
                    )
                  }}
                </span>

              </div>

            </div>

            <!-- GCash -->
            <div
              v-if="
                adjustmentPaymentMethod === 'GCash'
              "
            >

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                GCash Reference Number
              </label>

              <input
                v-model="
                  adjustmentReferenceNumber
                "
                type="text"
                placeholder="Enter reference number"
                class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-200"
              />

            </div>

          </div>

          <!-- Footer -->
          <div
            class="shrink-0 px-5 py-4 border-t border-gray-200 bg-gray-50"
          >

            <div class="flex gap-3">

              <button
                type="button"
                @click="closeAdjustmentModal"
                :disabled="applyingEdit"
                class="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                @click="confirmAdjustmentPayment"
                :disabled="applyingEdit"
                class="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold disabled:bg-gray-300"
              >
                {{
                  applyingEdit
                    ? 'Saving...'
                    : 'Confirm Payment'
                }}
              </button>

            </div>

          </div>

        </template>

        <!-- Refund -->
        <template
          v-else-if="
            editPreview.difference < 0
          "
        >

          <!-- Header -->
          <div
            class="shrink-0 px-5 py-4 bg-red-600 text-white"
          >

            <h2 class="text-lg font-black">
              Refund Customer
            </h2>

            <p
              class="text-sm text-white/80 mt-1"
            >
              Bumaba ang order total pagkatapos ng edit.
            </p>

          </div>

          <!-- Scrollable Body -->
          <div
            class="flex-1 min-h-0 overflow-y-auto p-5 space-y-5"
          >

            <div
              class="bg-red-50 border border-red-200 rounded-xl p-4"
            >

              <div class="flex justify-between gap-3">

                <span class="text-gray-600">
                  Refund Amount
                </span>

                <span
                  class="text-xl font-black text-red-700 whitespace-nowrap"
                >
                  {{
                    formatCurrency(
                      editPreview.refundAmount
                    )
                  }}
                </span>

              </div>

            </div>

            <div>

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                Refund Method
              </label>

              <div class="grid grid-cols-2 gap-3">

                <button
                  type="button"
                  @click="
                    refundPaymentMethod = 'Cash'
                  "
                  :class="
                    refundPaymentMethod === 'Cash'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  "
                  class="py-3 rounded-xl border font-bold"
                >
                  Cash
                </button>

                <button
                  type="button"
                  @click="
                    refundPaymentMethod = 'GCash'
                  "
                  :class="
                    refundPaymentMethod === 'GCash'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  "
                  class="py-3 rounded-xl border font-bold"
                >
                  GCash
                </button>

              </div>

            </div>

            <div
              v-if="
                refundPaymentMethod === 'GCash'
              "
            >

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                Refund Reference Number
              </label>

              <input
                v-model="
                  refundReferenceNumber
                "
                type="text"
                placeholder="GCash refund reference"
                class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-200"
              />

            </div>

          </div>

          <!-- Footer -->
          <div
            class="shrink-0 px-5 py-4 border-t border-gray-200 bg-gray-50"
          >

            <div class="flex gap-3">

              <button
                type="button"
                @click="closeAdjustmentModal"
                :disabled="applyingEdit"
                class="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                @click="confirmRefund"
                :disabled="applyingEdit"
                class="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:bg-gray-300"
              >
                {{
                  applyingEdit
                    ? 'Saving...'
                    : 'Confirm Refund'
                }}
              </button>

            </div>

          </div>

        </template>

      </div>
    </div>

    <!-- ========================= -->
    <!-- VOID ORDER MODAL -->
    <!-- ========================= -->

    <div
      v-if="isVoidModalOpen"
      class="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4"
      @click.self="closeVoidModal"
    >

      <div
        class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >

        <div
          class="px-5 py-4 bg-red-600 text-white"
        >

          <h2 class="text-lg font-black">
            Void Order
          </h2>

          <p
            class="text-sm text-white/80 mt-1"
          >
            {{
              selectedSale?.order?.orderNumber
                ? `Order #${selectedSale.order.orderNumber}`
                : 'Delivery Order'
            }}
          </p>

        </div>

        <div class="p-5 space-y-4">

          <div
            class="bg-red-50 border border-red-200 rounded-xl p-4"
          >

            <p
              class="text-sm text-red-700"
            >
              Ang order na ito ay mamarkahang VOID at hindi na isasama sa sales total.
            </p>

          </div>

          <div>

            <label
              class="block text-sm font-bold text-gray-700 mb-2"
            >
              Reason for Void
            </label>

            <textarea
              v-model="voidReason"
              rows="4"
              placeholder="Hal. Customer changed order, wrong order, duplicate transaction..."
              class="w-full border border-gray-300 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-red-200"
            ></textarea>

          </div>

        </div>

        <div
          class="px-5 py-4 border-t border-gray-200 bg-gray-50"
        >

          <div class="flex gap-3">

            <button
              type="button"
              @click="closeVoidModal"
              :disabled="voiding"
              class="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              @click="confirmVoidOrder"
              :disabled="voiding || !voidReason.trim()"
              class="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {{ voiding ? 'Voiding...' : 'Confirm Void' }}
            </button>

          </div>

        </div>

      </div>

    </div>

  </div>
</template>