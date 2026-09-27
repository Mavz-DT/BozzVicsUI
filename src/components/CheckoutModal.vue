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

const emit = defineEmits([
  'close',
  'confirm'
])

const cartStore = useCartStore()
const settingsStore = useSettingsStore()

const { totalAmount: cartTotal } =
  storeToRefs(cartStore)

/*
|--------------------------------------------------------------------------
| PAYMENT STATE
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| TOTAL
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| NORMAL CASH
|--------------------------------------------------------------------------
*/

const change = computed(() => {
  const tendered =
    parseFloat(
      amountTendered.value
    ) || 0

  return tendered >= payableAmount.value
    ? tendered - payableAmount.value
    : 0
})

/*
|--------------------------------------------------------------------------
| SPLIT PAYMENT
|--------------------------------------------------------------------------
*/

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
    payableAmount.value -
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

/*
|--------------------------------------------------------------------------
| FORM VALIDATION
|--------------------------------------------------------------------------
*/

const isFormValid = computed(() => {
  if (payableAmount.value <= 0) {
    return false
  }

  /*
  |--------------------------------------------------------------------------
  | DELIVERY UNSETTLED
  |--------------------------------------------------------------------------
  */

  if (isUnsettled.value) {
    return true
  }

  /*
  |--------------------------------------------------------------------------
  | CASH
  |--------------------------------------------------------------------------
  */

  if (
    paymentMethod.value === 'Cash'
  ) {
    return (
      Number(
        amountTendered.value || 0
      ) >= payableAmount.value
    )
  }

  /*
  |--------------------------------------------------------------------------
  | GCASH
  |--------------------------------------------------------------------------
  */

  if (
    paymentMethod.value === 'GCash'
  ) {
    return (
      referenceNumber.value
        .trim()
        .length > 3
    )
  }

  /*
  |--------------------------------------------------------------------------
  | SPLIT
  |--------------------------------------------------------------------------
  */

  if (
    paymentMethod.value === 'Split'
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

/*
|--------------------------------------------------------------------------
| KEYPAD HELPER
|--------------------------------------------------------------------------
*/

const keypadValue = computed({
  get() {
    switch (keypadTarget.value) {
      case 'amountTendered':
        return amountTendered.value

      case 'referenceNumber':
        return referenceNumber.value

      case 'splitCashAmount':
        return splitCashAmount.value

      case 'splitGCashAmount':
        return splitGCashAmount.value

      case 'splitCashTendered':
        return splitCashTendered.value

      case 'splitGCashReference':
        return splitGCashReference.value

      default:
        return ''
    }
  },

  set(value) {
    switch (keypadTarget.value) {
      case 'amountTendered':
        amountTendered.value = value
        break

      case 'referenceNumber':
        referenceNumber.value = value
        break

      case 'splitCashAmount':
        splitCashAmount.value = value
        break

      case 'splitGCashAmount':
        splitGCashAmount.value = value
        break

      case 'splitCashTendered':
        splitCashTendered.value = value
        break

      case 'splitGCashReference':
        splitGCashReference.value = value
        break
    }
  }
})

const keypadTargetLabel =
  computed(() => {
    switch (keypadTarget.value) {
      case 'amountTendered':
        return 'Amount Tendered'

      case 'referenceNumber':
        return 'GCash Reference Number'

      case 'splitCashAmount':
        return 'Cash Amount'

      case 'splitGCashAmount':
        return 'GCash Amount'

      case 'splitCashTendered':
        return 'Cash Tendered'

      case 'splitGCashReference':
        return 'GCash Reference Number'

      default:
        return 'Payment Input'
    }
  })

const setKeypadTarget =
  target => {
    keypadTarget.value = target
  }

/*
|--------------------------------------------------------------------------
| NUMERIC KEYPAD
|--------------------------------------------------------------------------
*/

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

  /*
  |--------------------------------------------------------------------------
  | Reference numbers are numeric only
  |--------------------------------------------------------------------------
  */

  const isReferenceField =
    keypadTarget.value ===
      'referenceNumber' ||
    keypadTarget.value ===
      'splitGCashReference'

  if (isReferenceField) {
    keypadValue.value += key
    return
  }

  /*
  |--------------------------------------------------------------------------
  | Decimal point
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Maximum 2 decimal places
  |--------------------------------------------------------------------------
  */

  if (
    keypadValue.value.includes('.')
  ) {
    const decimalPart =
      keypadValue.value.split('.')[1] ||
      ''

    if (decimalPart.length >= 2) {
      return
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent unnecessary leading zeroes
  |--------------------------------------------------------------------------
  */

  if (
    keypadValue.value === '0' &&
    key !== '.'
  ) {
    keypadValue.value = key
    return
  }

    keypadValue.value += key
  }

/*
|--------------------------------------------------------------------------
| KEYPAD DECIMAL VISIBILITY
|--------------------------------------------------------------------------
*/

const showDecimalKey = computed(() => {
  return (
    keypadTarget.value !==
      'referenceNumber' &&
    keypadTarget.value !==
      'splitGCashReference'
  )
})

/*
|--------------------------------------------------------------------------
| PAYMENT METHOD
|--------------------------------------------------------------------------
*/

const selectPaymentMethod =
  method => {
    paymentMethod.value = method

    if (method === 'Cash') {
      keypadTarget.value =
        'amountTendered'
    }

    if (method === 'GCash') {
      keypadTarget.value =
        'referenceNumber'
    }

    if (method === 'Split') {
      keypadTarget.value =
        'splitCashAmount'
    }
  }

/*
|--------------------------------------------------------------------------
| CONFIRM PAYMENT
|--------------------------------------------------------------------------
*/

const handleConfirm = () => {
  if (!isFormValid.value) {
    return
  }

  /*
  |--------------------------------------------------------------------------
  | UNSETTLED
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | CASH ONLY
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | GCASH ONLY
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | SPLIT PAYMENT
  |--------------------------------------------------------------------------
  */

  if (
    paymentMethod.value === 'Split'
  ) {
    const payments = []

    /*
    |--------------------------------------------------------------------------
    | CASH
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | GCASH
    |--------------------------------------------------------------------------
    */

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

/*
|--------------------------------------------------------------------------
| CLOSE
|--------------------------------------------------------------------------
*/

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
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4"
  >

    <!-- =================================================== -->
    <!-- DESKTOP / TABLET: WIDE PAYMENT WINDOW -->
    <!-- MOBILE: STACKED -->
    <!-- =================================================== -->

    <div
      class="bg-white rounded-2xl w-full max-w-5xl max-h-[94vh] md:max-h-[92vh] shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
    >

      <!-- ================================================= -->
      <!-- HEADER -->
      <!-- ================================================= -->

      <div
        class="px-5 py-4 sm:px-6 shrink-0 text-white flex items-center justify-between"
        :style="{
          backgroundColor:
            settingsStore.themeColor
        }"
      >

        <div>

          <h2
            class="text-xl sm:text-2xl font-black"
          >
            Process Payment
          </h2>

          <p
            class="text-xs sm:text-sm text-white/70 mt-0.5"
          >
            Complete the payment details.
          </p>

        </div>

        <button
          @click="closeModal"
          type="button"
          class="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

      </div>


      <!-- ================================================= -->
      <!-- MAIN TWO-COLUMN AREA -->
      <!-- ================================================= -->

      <div
        class="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:grid md:grid-cols-[minmax(0,1fr)_340px]"
      >

        <!-- =============================================== -->
        <!-- LEFT SIDE -->
        <!-- =============================================== -->

        <div
          class="p-4 sm:p-5 md:p-6 space-y-5 md:overflow-y-auto"
        >

          <!-- TOTAL -->

          <div
            class="bg-gray-50 border border-gray-200 rounded-2xl p-5"
          >

            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >

              <div>
                <p
                  class="text-sm font-medium text-gray-500"
                >
                  Total Amount Due
                </p>

                <p
                  class="text-xs text-gray-400 mt-1"
                >
                  Order Type:
                  {{ orderType || '—' }}
                </p>
              </div>

              <p
                class="text-3xl sm:text-4xl font-black text-gray-800 tracking-tight"
              >
                ₱{{ payableAmount.toFixed(2) }}
              </p>

            </div>

          </div>


          <!-- DELIVERY PAYMENT STATUS -->

          <div
            v-if="isDelivery"
          >

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
                  'flex-1 min-h-[48px] rounded-lg font-bold transition-all',
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
                  'flex-1 min-h-[48px] rounded-lg font-bold transition-all',
                  paymentStatus === 'Unsettled'
                    ? 'bg-white shadow-sm text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                ]"
              >
                Unsettled
              </button>

            </div>

            <p
              class="text-xs text-gray-500 mt-2"
            >
              Unsettled orders can be paid later from the Unsettled Orders page.
            </p>

          </div>


          <!-- PAYMENT METHOD -->

          <div
            v-if="!isUnsettled"
          >

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
                  'min-h-[54px] rounded-xl border font-bold transition-all',
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
                  'min-h-[54px] rounded-xl border font-bold transition-all',
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
                  'min-h-[54px] rounded-xl border font-bold transition-all',
                  paymentMethod === 'Split'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                ]"
              >
                Split
              </button>

            </div>

          </div>


          <!-- ============================================= -->
          <!-- CASH -->
          <!-- ============================================= -->

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

              <button
                type="button"
                @click="
                  setKeypadTarget('amountTendered')
                "
                class="w-full p-4 border rounded-xl text-3xl font-black text-right transition-colors"
                :class="
                  keypadTarget ===
                  'amountTendered'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                "
              >
                ₱{{ amountTendered || '0' }}
              </button>

            </div>


            <!-- CHANGE -->

            <div
              class="flex justify-between items-center bg-green-50 border border-green-200 rounded-xl px-4 py-3"
            >

              <span
                class="text-gray-600 font-bold"
              >
                Change
              </span>

              <span
                class="text-2xl font-black"
                :class="
                  change > 0
                    ? 'text-green-600'
                    : 'text-gray-400'
                "
              >
                ₱{{ change.toFixed(2) }}
              </span>

            </div>

          </div>


          <!-- ============================================= -->
          <!-- GCASH -->
          <!-- ============================================= -->

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
                GCash Reference Number
              </label>

              <button
                type="button"
                @click="
                  setKeypadTarget('referenceNumber')
                "
                class="w-full p-4 border rounded-xl text-2xl font-black text-right transition-colors"
                :class="
                  keypadTarget ===
                  'referenceNumber'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 bg-gray-50'
                "
              >
                {{ referenceNumber || 'Enter reference number' }}
              </button>

            </div>

            <p
              class="text-xs text-gray-500"
            >
              Tap the field above, then use the touchscreen keypad on the right.
            </p>

          </div>


          <!-- ============================================= -->
          <!-- SPLIT -->
          <!-- ============================================= -->

          <div
            v-if="
              !isUnsettled &&
              paymentMethod === 'Split'
            "
            class="space-y-4"
          >

            <!-- SUMMARY -->

            <div
              class="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2"
            >

              <div
                class="flex justify-between"
              >

                <span
                  class="text-sm text-gray-600"
                >
                  Order Total
                </span>

                <span
                  class="font-black text-gray-800"
                >
                  ₱{{ payableAmount.toFixed(2) }}
                </span>

              </div>

              <div
                class="flex justify-between"
              >

                <span
                  class="text-sm text-gray-600"
                >
                  Cash + GCash
                </span>

                <span
                  class="font-black text-blue-700"
                >
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

            <div>

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                Cash Amount
              </label>

              <button
                type="button"
                @click="
                  setKeypadTarget('splitCashAmount')
                "
                class="w-full p-3.5 border rounded-xl text-2xl font-black text-right transition-colors"
                :class="
                  keypadTarget ===
                  'splitCashAmount'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                "
              >
                ₱{{ splitCashAmount || '0' }}
              </button>

            </div>


            <!-- GCASH AMOUNT -->

            <div>

              <label
                class="block text-sm font-bold text-gray-700 mb-2"
              >
                GCash Amount
              </label>

              <button
                type="button"
                @click="
                  setKeypadTarget('splitGCashAmount')
                "
                class="w-full p-3.5 border rounded-xl text-2xl font-black text-right transition-colors"
                :class="
                  keypadTarget ===
                  'splitGCashAmount'
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
                  keypadTarget ===
                  'splitCashTendered'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                "
              >
                ₱{{ splitCashTendered || '0' }}
              </button>

              <div
                class="mt-2 flex justify-between text-sm"
              >

                <span
                  class="text-gray-500"
                >
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

              <button
                type="button"
                @click="
                  setKeypadTarget('splitGCashReference')
                "
                class="w-full p-3.5 border rounded-xl text-xl font-black text-right transition-colors"
                :class="
                  keypadTarget ===
                  'splitGCashReference'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 bg-gray-50'
                "
              >
                {{
                  splitGCashReference ||
                  'Enter reference number'
                }}
              </button>

            </div>


            <!-- SPLIT VALIDATION -->

            <div
              v-if="
                splitTotal <
                payableAmount
              "
              class="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700 font-bold"
            >
              Kulang pa ng
              ₱{{ splitRemaining.toFixed(2) }}
              para mabuo ang total.
            </div>

            <div
              v-else-if="
                splitTotal >
                payableAmount
              "
              class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-bold"
            >
              Sobra ng
              ₱{{
                splitExcess.toFixed(2)
              }}
              ang Cash + GCash.
            </div>

            <div
              v-else
              class="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-bold"
            >
              Cash + GCash = exact order total.
            </div>

          </div>


          <!-- ============================================= -->
          <!-- UNSETTLED -->
          <!-- ============================================= -->

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


        <!-- =============================================== -->
        <!-- RIGHT SIDE -->
        <!-- =============================================== -->

        <div
          class="bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 p-4 sm:p-5 flex flex-col"
        >

          <!-- KEYPAD DISPLAY -->

          <div
            class="bg-white border border-gray-200 rounded-2xl p-4 mb-4"
          >

            <p
              class="text-xs font-black uppercase tracking-wide text-gray-400"
            >
              {{ keypadTargetLabel }}
            </p>

            <div
              class="mt-2 text-right text-3xl font-black text-gray-800 break-all min-h-[44px]"
            >
              <template
                v-if="
                  keypadTarget ===
                    'referenceNumber' ||
                  keypadTarget ===
                    'splitGCashReference'
                "
              >
                {{
                  keypadValue ||
                  '0'
                }}
              </template>

              <template
                v-else
              >
                ₱{{
                  keypadValue ||
                  '0'
                }}
              </template>
            </div>

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
                @click="appendKey('1')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                1
              </button>

              <button
                type="button"
                @click="appendKey('2')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                2
              </button>

              <button
                type="button"
                @click="appendKey('3')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                3
              </button>

              <button
                type="button"
                @click="appendKey('4')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                4
              </button>

              <button
                type="button"
                @click="appendKey('5')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                5
              </button>

              <button
                type="button"
                @click="appendKey('6')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                6
              </button>

              <button
                type="button"
                @click="appendKey('7')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                7
              </button>

              <button
                type="button"
                @click="appendKey('8')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                8
              </button>

              <button
                type="button"
                @click="appendKey('9')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                9
              </button>

              <button
                type="button"
                @click="appendKey('clear')"
                class="h-16 sm:h-[68px] rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 text-lg font-black text-red-600 shadow-sm"
              >
                C
              </button>

              <button
                type="button"
                @click="appendKey('0')"
                class="h-16 sm:h-[68px] rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-black text-gray-800 shadow-sm"
              >
                0
              </button>

              <button
                type="button"
                @click="appendKey('backspace')"
                class="h-16 sm:h-[68px] rounded-xl bg-gray-200 hover:bg-gray-300 active:bg-gray-400 border border-gray-300 text-2xl font-black text-gray-700 shadow-sm"
              >
                ←
              </button>

            </div>

            <!-- DECIMAL -->

            <button
              v-if="showDecimalKey"
              type="button"
              @click="appendKey('.')"
              class="w-full h-14 mt-2 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-700 shadow-sm"
            >
              .
            </button>

          </div>


          <!-- PAYMENT SUMMARY -->

          <div
            class="mt-4 bg-white border border-gray-200 rounded-2xl p-4"
          >

            <div
              class="flex justify-between items-center"
            >

              <span
                class="text-sm font-bold text-gray-500"
              >
                Amount Due
              </span>

              <span
                class="text-lg font-black text-gray-800"
              >
                ₱{{ payableAmount.toFixed(2) }}
              </span>

            </div>


            <!-- CASH SUMMARY -->

            <template
              v-if="
                paymentMethod === 'Cash' &&
                !isUnsettled
              "
            >

              <div
                class="flex justify-between items-center mt-2"
              >

                <span
                  class="text-sm font-bold text-gray-500"
                >
                  Tendered
                </span>

                <span
                  class="text-lg font-black"
                >
                  ₱{{
                    Number(
                      amountTendered || 0
                    ).toFixed(2)
                  }}
                </span>

              </div>

              <div
                class="flex justify-between items-center mt-2 pt-2 border-t border-gray-100"
              >

                <span
                  class="text-sm font-bold text-gray-500"
                >
                  Change
                </span>

                <span
                  class="text-xl font-black text-green-600"
                >
                  ₱{{ change.toFixed(2) }}
                </span>

              </div>

            </template>


            <!-- SPLIT SUMMARY -->

            <template
              v-if="
                paymentMethod === 'Split' &&
                !isUnsettled
              "
            >

              <div
                class="flex justify-between items-center mt-2"
              >

                <span
                  class="text-sm font-bold text-gray-500"
                >
                  Paid
                </span>

                <span
                  class="text-lg font-black"
                >
                  ₱{{ splitTotal.toFixed(2) }}
                </span>

              </div>

              <div
                class="flex justify-between items-center mt-2 pt-2 border-t border-gray-100"
              >

                <span
                  class="text-sm font-bold text-gray-500"
                >
                  Remaining
                </span>

                <span
                  class="text-lg font-black"
                  :class="
                    splitRemaining > 0
                      ? 'text-orange-600'
                      : 'text-green-600'
                  "
                >
                  ₱{{
                    splitRemaining.toFixed(2)
                  }}
                </span>

              </div>

            </template>

          </div>


          <!-- ACTIONS -->

          <div
            class="mt-auto pt-4 grid grid-cols-2 gap-2"
          >

            <button
              @click="closeModal"
              type="button"
              class="min-h-[54px] rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-black"
            >
              Cancel
            </button>

            <button
              @click="handleConfirm"
              type="button"
              :disabled="!isFormValid"
              class="min-h-[54px] rounded-xl text-white font-black shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
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
                  ? 'Save Unsettled'
                  : paymentMethod === 'Split'
                    ? 'Confirm Split'
                    : 'Confirm Payment'
              }}
            </button>

          </div>

        </div>

      </div>

    </div>

  </div>
</template>