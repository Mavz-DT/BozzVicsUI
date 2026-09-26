<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCartStore } from '../stores/cart'
import { useSettingsStore } from '../stores/settings'

const props = defineProps({
  isOpen: Boolean,

  totalAmount: {
    type: Number,
    default: 0
  },

  orderType: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'confirm'])

const cartStore = useCartStore()
const settingsStore = useSettingsStore()

const { totalAmount: cartTotal } = storeToRefs(cartStore)

// =========================
// PAYMENT STATE
// =========================

const paymentMethod = ref('Cash')
const paymentStatus = ref('Paid')

// Normal Cash
const amountTendered = ref('')

// Normal GCash
const referenceNumber = ref('')

// Split Payment
const splitCashAmount = ref('')
const splitGCashAmount = ref('')
const splitCashTendered = ref('')
const splitGCashReference = ref('')

// Which field receives keypad input
const keypadTarget = ref('amountTendered')

// =========================
// TOTAL
// =========================

const payableAmount = computed(() => {
  return Number(
    props.totalAmount ||
    cartTotal.value ||
    0
  )
})

const isDelivery = computed(() => {
  return props.orderType === 'Delivery'
})

const isUnsettled = computed(() => {
  return (
    isDelivery.value &&
    paymentStatus.value === 'Unsettled'
  )
})

// =========================
// NORMAL CASH
// =========================

const change = computed(() => {
  const tendered =
    parseFloat(amountTendered.value) || 0

  return tendered >= payableAmount.value
    ? tendered - payableAmount.value
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

const splitCashTenderedValue = computed(() => {
  const tendered = Number(
    splitCashTendered.value || 0
  )

  // Kapag walang hiwalay na cash tendered,
  // gamitin ang Cash Amount mismo.
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
    payableAmount.value - splitTotal.value
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

const splitExcess = computed(() => {
  return Math.max(
    0,
    splitTotal.value -
      payableAmount.value
  )
})

const isSplitExact = computed(() => {
  return (
    Math.abs(
      splitTotal.value -
        payableAmount.value
    ) < 0.01
  )
})

// =========================
// FORM VALIDATION
// =========================

const isFormValid = computed(() => {
  if (payableAmount.value <= 0) {
    return false
  }

  // Delivery Unsettled
  if (isUnsettled.value) {
    return true
  }

  // =========================
  // CASH
  // =========================

  if (
    paymentMethod.value === 'Cash'
  ) {
    return (
      Number(
        amountTendered.value || 0
      ) >= payableAmount.value
    )
  }

  // =========================
  // GCASH
  // =========================

  if (
    paymentMethod.value === 'GCash'
  ) {
    return (
      referenceNumber.value.trim().length > 3
    )
  }

  // =========================
  // SPLIT
  // =========================

  if (
    paymentMethod.value === 'Split'
  ) {
    // Cash + GCash must exactly equal total
    if (!isSplitExact.value) {
      return false
    }

    // At least one payment
    if (splitTotal.value <= 0) {
      return false
    }

    // Cash tendered must cover cash portion.
    // If blank, Cash Amount itself is accepted.
    if (
      splitCash.value > 0 &&
      splitCashTenderedValue.value <
        splitCash.value
    ) {
      return false
    }

    // GCash reference required when GCash is used
    if (
      splitGCash.value > 0 &&
      splitGCashReference.value.trim().length <= 3
    ) {
      return false
    }

    return true
  }

  return false
})

// =========================
// KEYPAD HELPER
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
      amountTendered.value = value
      return
    }

    if (
      keypadTarget.value ===
      'splitCashAmount'
    ) {
      splitCashAmount.value = value
      return
    }

    if (
      keypadTarget.value ===
      'splitGCashAmount'
    ) {
      splitGCashAmount.value = value
      return
    }

    if (
      keypadTarget.value ===
      'splitCashTendered'
    ) {
      splitCashTendered.value = value
    }
  }
})

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
      keypadValue.value.slice(0, -1)

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
      keypadValue.value.split('.')[1] || ''

    if (decimalPart.length >= 2) {
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

const selectPaymentMethod = method => {
  paymentMethod.value = method

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
// CONFIRM PAYMENT
// =========================

const handleConfirm = () => {
  if (!isFormValid.value) {
    return
  }

  // =========================
  // UNSETTLED
  // =========================

  if (isUnsettled.value) {
    emit('confirm', {
      paymentStatus: 'Unsettled',

      paymentMethod: null,
      amount: 0,
      amountTendered: 0,
      change: 0,
      referenceNumber: '',

      payments: []
    })

    return
  }

  // =========================
  // CASH ONLY
  // =========================

  if (
    paymentMethod.value === 'Cash'
  ) {
    emit('confirm', {
      paymentStatus: 'Paid',

      paymentMethod: 'Cash',

      amount:
        payableAmount.value,

      amountTendered:
        Number(
          amountTendered.value
        ),

      change:
        change.value,

      referenceNumber: '',

      payments: [
        {
          paymentMethod: 'Cash',

          amount:
            payableAmount.value,

          amountTendered:
            Number(
              amountTendered.value
            ),

          change:
            change.value,

          referenceNumber: ''
        }
      ]
    })

    return
  }

  // =========================
  // GCASH ONLY
  // =========================

  if (
    paymentMethod.value === 'GCash'
  ) {
    emit('confirm', {
      paymentStatus: 'Paid',

      paymentMethod: 'GCash',

      amount:
        payableAmount.value,

      amountTendered: 0,

      change: 0,

      referenceNumber:
        referenceNumber.value.trim(),

      payments: [
        {
          paymentMethod: 'GCash',

          amount:
            payableAmount.value,

          amountTendered: 0,

          change: 0,

          referenceNumber:
            referenceNumber.value.trim()
        }
      ]
    })

    return
  }

  // =========================
  // SPLIT PAYMENT
  // =========================

  if (
    paymentMethod.value === 'Split'
  ) {
    const payments = []

    // CASH
    if (splitCash.value > 0) {
      payments.push({
        paymentMethod: 'Cash',

        amount:
          splitCash.value,

        amountTendered:
          splitCashTenderedValue.value,

        change:
          splitChange.value,

        referenceNumber: ''
      })
    }

    // GCASH
    if (splitGCash.value > 0) {
      payments.push({
        paymentMethod: 'GCash',

        amount:
          splitGCash.value,

        amountTendered: 0,

        change: 0,

        referenceNumber:
          splitGCashReference.value.trim()
      })
    }

    emit('confirm', {
      paymentStatus: 'Paid',

      paymentMethod: 'Split',

      amount:
        payableAmount.value,

      amountTendered:
        splitCashTenderedValue.value,

      change:
        splitChange.value,

      referenceNumber:
        splitGCashReference.value.trim(),

      payments
    })
  }
}

// =========================
// CLOSE
// =========================

const closeModal = () => {
  amountTendered.value = ''
  referenceNumber.value = ''

  splitCashAmount.value = ''
  splitGCashAmount.value = ''
  splitCashTendered.value = ''
  splitGCashReference.value = ''

  paymentMethod.value = 'Cash'
  paymentStatus.value = 'Paid'

  keypadTarget.value =
    'amountTendered'

  emit('close')
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
  >

    <div
      class="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200"
    >

      <!-- HEADER -->
      <div
        class="p-5 text-white flex justify-between items-center sticky top-0 z-10"
        :style="{
          backgroundColor:
            settingsStore.themeColor
        }"
      >

        <div>

          <h2 class="text-xl font-black">
            Process Payment
          </h2>

          <p class="text-xs text-white/70 mt-0.5">
            Complete the payment details.
          </p>

        </div>

        <button
          @click="closeModal"
          type="button"
          class="text-white/80 hover:text-white text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

      </div>

      <div class="p-6 space-y-6">

        <!-- TOTAL -->
        <div
          class="text-center bg-gray-50 p-5 rounded-xl border border-gray-200"
        >

          <p class="text-gray-500 font-medium mb-1">
            Total Amount Due
          </p>

          <p
            class="text-4xl font-black text-gray-800 tracking-tight"
          >
            ₱{{ payableAmount.toFixed(2) }}
          </p>

        </div>

        <!-- DELIVERY PAYMENT STATUS -->
        <div v-if="isDelivery">

          <label
            class="block text-gray-700 font-bold mb-2"
          >
            Payment Status
          </label>

          <div
            class="flex p-1 bg-gray-100 rounded-xl border border-gray-200"
          >

            <button
              type="button"
              @click="
                paymentStatus = 'Paid'
              "
              :class="[
                'flex-1 py-2.5 rounded-lg font-bold transition-all',
                paymentStatus === 'Paid'
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              Pay Now
            </button>

            <button
              type="button"
              @click="
                paymentStatus = 'Unsettled'
              "
              :class="[
                'flex-1 py-2.5 rounded-lg font-bold transition-all',
                paymentStatus === 'Unsettled'
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              Unsettled
            </button>

          </div>

          <p class="text-xs text-gray-500 mt-2">
            Unsettled orders can be paid later from the Unsettled Orders page.
          </p>

        </div>

        <!-- PAYMENT METHOD -->
        <div v-if="!isUnsettled">

          <label
            class="block text-gray-700 font-bold mb-2"
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
                selectPaymentMethod('Cash')
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
                selectPaymentMethod('GCash')
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
                selectPaymentMethod('Split')
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
        <!-- CASH ONLY -->
        <!-- ========================= -->

        <div
          v-if="
            !isUnsettled &&
            paymentMethod === 'Cash'
          "
          class="space-y-4"
        >

          <div>

            <label
              class="block text-gray-700 font-bold mb-2"
            >
              Amount Tendered
            </label>

            <input
              :value="
                amountTendered || '0'
              "
              type="text"
              readonly
              inputmode="none"
              class="w-full p-3.5 border border-gray-300 rounded-xl outline-none text-2xl font-black text-right bg-gray-50"
            />

          </div>

          <!-- NUMERIC KEYPAD -->
          <div class="bg-gray-100 rounded-2xl p-3">

            <div
              class="grid grid-cols-3 gap-2"
            >

              <button
                type="button"
                @click="appendKey('1')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                1
              </button>

              <button
                type="button"
                @click="appendKey('2')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                2
              </button>

              <button
                type="button"
                @click="appendKey('3')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                3
              </button>

              <button
                type="button"
                @click="appendKey('4')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                4
              </button>

              <button
                type="button"
                @click="appendKey('5')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                5
              </button>

              <button
                type="button"
                @click="appendKey('6')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                6
              </button>

              <button
                type="button"
                @click="appendKey('7')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                7
              </button>

              <button
                type="button"
                @click="appendKey('8')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                8
              </button>

              <button
                type="button"
                @click="appendKey('9')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                9
              </button>

              <button
                type="button"
                @click="appendKey('clear')"
                class="h-14 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 text-base font-black text-red-600 shadow-sm"
              >
                C
              </button>

              <button
                type="button"
                @click="appendKey('0')"
                class="h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm"
              >
                0
              </button>

              <button
                type="button"
                @click="appendKey('backspace')"
                class="h-14 rounded-xl bg-gray-200 hover:bg-gray-300 active:bg-gray-400 border border-gray-300 text-lg font-black text-gray-700 shadow-sm"
              >
                ←
              </button>

            </div>

            <button
              type="button"
              @click="appendKey('.')"
              class="w-full h-12 mt-2 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-lg font-black text-gray-700 shadow-sm"
            >
              .
            </button>

          </div>

          <!-- CHANGE -->
          <div
            class="flex justify-between items-center text-lg"
          >

            <span class="text-gray-600 font-bold">
              Change:
            </span>

            <span
              :class="[
                'font-black',
                change > 0
                  ? 'text-green-600'
                  : 'text-gray-400'
              ]"
            >
              ₱{{ change.toFixed(2) }}
            </span>

          </div>

        </div>

        <!-- ========================= -->
        <!-- GCASH ONLY -->
        <!-- ========================= -->

        <div
          v-if="
            !isUnsettled &&
            paymentMethod === 'GCash'
          "
          class="space-y-4"
        >

          <div>

            <label
              class="block text-gray-700 font-bold mb-2"
            >
              Reference Number
            </label>

            <input
              v-model="referenceNumber"
              type="text"
              inputmode="numeric"
              placeholder="e.g. 10023456789"
              class="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent outline-none font-bold text-lg"
            />

          </div>

          <p class="text-xs text-gray-500">
            Enter the GCash reference number before confirming payment.
          </p>

        </div>

        <!-- ========================= -->
        <!-- SPLIT PAYMENT -->
        <!-- ========================= -->

        <div
          v-if="
            !isUnsettled &&
            paymentMethod === 'Split'
          "
          class="space-y-5"
        >

          <!-- Split Summary -->
          <div
            class="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2"
          >

            <div class="flex justify-between">
              <span class="text-sm text-gray-600">
                Order Total
              </span>

              <span class="font-black text-gray-800">
                ₱{{ payableAmount.toFixed(2) }}
              </span>
            </div>

            <div class="flex justify-between">
              <span class="text-sm text-gray-600">
                Cash + GCash
              </span>

              <span class="font-black text-blue-700">
                ₱{{ splitTotal.toFixed(2) }}
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
                ₱{{ splitRemaining.toFixed(2) }}
              </span>

            </div>

          </div>

          <!-- CASH AMOUNT -->
          <div
            class="border border-gray-200 rounded-xl p-4"
          >

            <div
              class="flex items-center justify-between mb-2"
            >

              <label
                class="text-sm font-bold text-gray-700"
              >
                Cash Amount
              </label>

              <span
                class="text-xs font-bold text-gray-400"
              >
                Part of total
              </span>

            </div>

            <button
              type="button"
              @click="
                setKeypadTarget('splitCashAmount')
              "
              class="w-full p-3.5 border rounded-xl text-2xl font-black text-right transition-colors"
              :class="
                keypadTarget === 'splitCashAmount'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              "
            >
              ₱{{ splitCashAmount || '0' }}
            </button>

          </div>

          <!-- GCASH AMOUNT -->
          <div
            class="border border-gray-200 rounded-xl p-4"
          >

            <div
              class="flex items-center justify-between mb-2"
            >

              <label
                class="text-sm font-bold text-gray-700"
              >
                GCash Amount
              </label>

              <span
                class="text-xs font-bold text-gray-400"
              >
                Part of total
              </span>

            </div>

            <button
              type="button"
              @click="
                setKeypadTarget('splitGCashAmount')
              "
              class="w-full p-3.5 border rounded-xl text-2xl font-black text-right transition-colors"
              :class="
                keypadTarget === 'splitGCashAmount'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 bg-gray-50'
              "
            >
              ₱{{ splitGCashAmount || '0' }}
            </button>

          </div>

          <!-- CASH TENDERED -->
          <div
            v-if="splitCash > 0"
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
                setKeypadTarget('splitCashTendered')
              "
              class="w-full p-3.5 border rounded-xl text-2xl font-black text-right transition-colors"
              :class="
                keypadTarget === 'splitCashTendered'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              "
            >
              ₱{{ splitCashTendered || '0' }}
            </button>

            <div
              class="mt-3 flex justify-between text-sm"
            >

              <span class="text-gray-500">
                Cash Change
              </span>

              <span
                class="font-black text-green-600"
              >
                ₱{{ splitChange.toFixed(2) }}
              </span>

            </div>

          </div>

          <!-- GCASH REFERENCE -->
          <div
            v-if="splitGCash > 0"
          >

            <label
              class="block text-sm font-bold text-gray-700 mb-2"
            >
              GCash Reference Number
            </label>

            <input
              v-model="splitGCashReference"
              type="text"
              inputmode="numeric"
              placeholder="Enter GCash reference number"
              class="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none font-bold text-lg"
            />

          </div>

          <!-- KEYPAD -->
          <div class="bg-gray-100 rounded-2xl p-3">

            <p
              class="text-xs font-bold text-gray-500 mb-2 text-center"
            >
              Editing:
              {{
                keypadTarget === 'splitCashAmount'
                  ? 'Cash Amount'
                  : keypadTarget === 'splitGCashAmount'
                    ? 'GCash Amount'
                    : 'Cash Tendered'
              }}
            </p>

            <div
              class="grid grid-cols-3 gap-2"
            >

              <button
                type="button"
                @click="appendKey('1')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                1
              </button>

              <button
                type="button"
                @click="appendKey('2')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                2
              </button>

              <button
                type="button"
                @click="appendKey('3')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                3
              </button>

              <button
                type="button"
                @click="appendKey('4')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                4
              </button>

              <button
                type="button"
                @click="appendKey('5')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                5
              </button>

              <button
                type="button"
                @click="appendKey('6')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                6
              </button>

              <button
                type="button"
                @click="appendKey('7')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                7
              </button>

              <button
                type="button"
                @click="appendKey('8')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                8
              </button>

              <button
                type="button"
                @click="appendKey('9')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                9
              </button>

              <button
                type="button"
                @click="appendKey('clear')"
                class="h-14 rounded-xl bg-red-50 border border-red-200 text-red-600 text-base font-black"
              >
                C
              </button>

              <button
                type="button"
                @click="appendKey('0')"
                class="h-14 rounded-xl bg-white border border-gray-200 text-xl font-black"
              >
                0
              </button>

              <button
                type="button"
                @click="appendKey('backspace')"
                class="h-14 rounded-xl bg-gray-200 border border-gray-300 text-lg font-black"
              >
                ←
              </button>

            </div>

            <button
              type="button"
              @click="appendKey('.')"
              class="w-full h-12 mt-2 rounded-xl bg-white border border-gray-200 text-lg font-black"
            >
              .
            </button>

          </div>

          <!-- SPLIT VALIDATION -->
          <div
            v-if="splitTotal < payableAmount"
            class="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700 font-bold"
          >
            Kulang pa ng
            ₱{{ splitRemaining.toFixed(2) }}
            para mabuo ang total.
          </div>

          <div
            v-else-if="splitTotal > payableAmount"
            class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-bold"
          >
            Sobra ng
            ₱{{
              (splitTotal - payableAmount).toFixed(2)
            }}
            ang Cash + GCash.
          </div>

          <div
            v-else-if="splitCash > 0 && splitGCash > 0"
            class="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-bold"
          >
            Cash + GCash = exact order total.
          </div>

        </div>

        <!-- ========================= -->
        <!-- UNSETTLED -->
        <!-- ========================= -->

        <div
          v-if="isUnsettled"
          class="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
        >

          <p
            class="font-bold text-yellow-800"
          >
            Payment will be collected later.
          </p>

          <p
            class="text-sm text-yellow-700 mt-1"
          >
            This delivery order will be saved as Unsettled.
          </p>

        </div>

      </div>

      <!-- FOOTER -->
      <div
        class="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 sticky bottom-0"
      >

        <button
          @click="closeModal"
          type="button"
          class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
        >
          Cancel
        </button>

        <button
          @click="handleConfirm"
          type="button"
          :disabled="!isFormValid"
          class="flex-1 py-3 text-white rounded-xl font-bold transition-all shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
          :style="
            isFormValid
              ? {
                  backgroundColor:
                    settingsStore.themeColor
                }
              : {}
          "
        >
          {{
            isUnsettled
              ? 'Save Unsettled Order'
              : paymentMethod === 'Split'
                ? 'Confirm Split Payment'
                : 'Confirm Payment'
          }}
        </button>

      </div>

    </div>
  </div>
</template>