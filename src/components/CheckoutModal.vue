<script setup>
import {
  ref,
  computed,
  watch
} from 'vue'
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

// Prevent accidental double submission
const isSubmitting = ref(false)

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
  // Prevent accidental double tap / duplicate submit
  if (isSubmitting.value) {
    return
  }

  if (!isFormValid.value) {
    return
  }

  isSubmitting.value = true

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
  isSubmitting.value = false

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

// ==========================================================================
// RESET PAYMENT FORM WHEN MODAL OPENS / CLOSES
// ==========================================================================

watch(
  () => props.isOpen,
  isOpen => {

    // Kapag isinara ng parent ang modal
    // pagkatapos ng successful payment,
    // siguraduhing tanggal ang submitting lock.

    if (!isOpen) {

      isSubmitting.value =
        false

      return
    }


    // Kapag bagong checkout,
    // siguraduhing bagong payment state.

    isSubmitting.value =
      false

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

    paymentMethod.value =
      'Cash'

    paymentStatus.value =
      'Paid'

    keypadTarget.value =
      'amountTendered'
  }
)

</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-3"
  >

    <!-- =================================================== -->
    <!-- PAYMENT WINDOW -->
    <!-- =================================================== -->

    <div
      class="bg-white rounded-2xl w-full max-w-5xl max-h-[96vh] shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
    >

      <!-- ================================================= -->
      <!-- HEADER -->
      <!-- ================================================= -->

      <div
        class="px-4 py-3 shrink-0 text-white flex items-center justify-between"
        :style="{
          backgroundColor:
            settingsStore.themeColor
        }"
      >

        <div>

          <h2
            class="text-lg sm:text-xl font-black"
          >
            Process Payment
          </h2>

          <p
            class="text-[11px] sm:text-xs text-white/70 mt-0.5"
          >
            Complete the payment details.
          </p>

        </div>

        <button
          @click="closeModal"
          type="button"
          class="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

      </div>


      <!-- ================================================= -->
      <!-- MAIN TWO-COLUMN AREA -->
      <!-- ================================================= -->

      <div
        class="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:grid md:grid-cols-[minmax(0,1fr)_300px]"
      >

        <!-- =============================================== -->
        <!-- LEFT SIDE -->
        <!-- =============================================== -->

        <div
          class="p-3 sm:p-4 space-y-3 md:overflow-y-auto"
        >

          <!-- TOTAL -->

          <div
            class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
          >

            <div
              class="flex items-center justify-between gap-3"
            >

              <div class="min-w-0">

                <p
                  class="text-xs font-medium text-gray-500"
                >
                  Total Amount Due
                </p>

                <p
                  class="text-[11px] text-gray-400 mt-0.5"
                >
                  {{ orderType || '—' }}
                </p>

              </div>

              <p
                class="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight whitespace-nowrap"
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
              class="block text-sm text-gray-700 font-bold mb-1.5"
            >
              Payment Status
            </label>

            <div
              class="flex p-1 bg-gray-100 rounded-lg border border-gray-200"
            >

              <button
                type="button"
                @click="
                  paymentStatus = 'Paid'
                "
                :disabled="isSubmitting"
                :class="[
                  'flex-1 min-h-[42px] rounded-md text-sm font-bold transition-all',
                  paymentStatus === 'Paid'
                    ? 'bg-white shadow-sm text-gray-800'
                    : 'text-gray-500 hover:text-gray-700',
                  isSubmitting
                    ? 'cursor-not-allowed opacity-60'
                    : ''
                ]"
              >
                Pay Now
              </button>

              <button
                type="button"
                @click="
                  paymentStatus = 'Unsettled'
                "
                :disabled="isSubmitting"
                :class="[
                  'flex-1 min-h-[42px] rounded-md text-sm font-bold transition-all',
                  paymentStatus === 'Unsettled'
                    ? 'bg-white shadow-sm text-gray-800'
                    : 'text-gray-500 hover:text-gray-700',
                  isSubmitting
                    ? 'cursor-not-allowed opacity-60'
                    : ''
                ]"
              >
                Unsettled
              </button>

            </div>

            <p
              class="text-[11px] text-gray-500 mt-1.5"
            >
              Unsettled orders can be paid later from the Unsettled Orders page.
            </p>

          </div>


          <!-- PAYMENT METHOD -->

          <div
            v-if="!isUnsettled"
          >

            <label
              class="block text-sm text-gray-700 font-bold mb-1.5"
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
                :disabled="isSubmitting"
                :class="[
                  'min-h-[44px] rounded-lg border text-sm font-bold transition-all',
                  paymentMethod === 'Cash'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  isSubmitting
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
                  selectPaymentMethod('GCash')
                "
                :disabled="isSubmitting"
                :class="[
                  'min-h-[44px] rounded-lg border text-sm font-bold transition-all',
                  paymentMethod === 'GCash'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  isSubmitting
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
                  selectPaymentMethod('Split')
                "
                :disabled="isSubmitting"
                :class="[
                  'min-h-[44px] rounded-lg border text-sm font-bold transition-all',
                  paymentMethod === 'Split'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  isSubmitting
                    ? 'cursor-not-allowed opacity-60'
                    : ''
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
            class="space-y-3"
          >

            <div>

              <label
                class="block text-sm text-gray-700 font-bold mb-1.5"
              >
                Amount Tendered
              </label>

              <button
                type="button"
                @click="
                  setKeypadTarget('amountTendered')
                "
                :disabled="isSubmitting"
                class="w-full p-3 border rounded-lg text-2xl font-black text-right transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
              class="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-4 py-2.5"
            >

              <span
                class="text-sm text-gray-600 font-bold"
              >
                Change
              </span>

              <span
                class="text-xl font-black"
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
            class="space-y-3"
          >

            <div>

              <label
                class="block text-sm text-gray-700 font-bold mb-1.5"
              >
                GCash Reference Number
              </label>

              <button
                type="button"
                @click="
                  setKeypadTarget('referenceNumber')
                "
                :disabled="isSubmitting"
                class="w-full p-3 border rounded-lg text-xl font-black text-right transition-colors disabled:cursor-not-allowed disabled:opacity-60 break-all"
                :class="
                  keypadTarget ===
                  'referenceNumber'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 bg-gray-50'
                "
              >
                {{
                  referenceNumber ||
                  'Enter reference number'
                }}
              </button>

            </div>

            <p
              class="text-[11px] text-gray-500"
            >
              Tap the field above, then use the touchscreen keypad.
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
            class="space-y-3"
          >

            <!-- SUMMARY -->

            <div
              class="bg-blue-50 border border-blue-200 rounded-lg p-3"
            >

              <div
                class="grid grid-cols-3 gap-2 text-xs"
              >

                <div>

                  <p class="text-gray-500">
                    Order Total
                  </p>

                  <p
                    class="font-black text-gray-800 mt-0.5"
                  >
                    ₱{{ payableAmount.toFixed(2) }}
                  </p>

                </div>

                <div>

                  <p class="text-gray-500">
                    Paid
                  </p>

                  <p
                    class="font-black text-blue-700 mt-0.5"
                  >
                    ₱{{ splitTotal.toFixed(2) }}
                  </p>

                </div>

                <div>

                  <p class="text-gray-500">
                    Remaining
                  </p>

                  <p
                    class="font-black mt-0.5"
                    :class="
                      splitRemaining > 0
                        ? 'text-orange-600'
                        : 'text-green-600'
                    "
                  >
                    ₱{{ splitRemaining.toFixed(2) }}
                  </p>

                </div>

              </div>

            </div>


            <!-- SPLIT INPUTS -->

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >

              <!-- CASH AMOUNT -->

              <div
                class="border border-gray-200 rounded-lg p-2.5"
              >

                <label
                  class="block text-xs font-bold text-gray-700 mb-1"
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
                  :disabled="isSubmitting"
                  class="w-full p-2.5 border rounded-lg text-xl font-black text-right transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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

              <div
                class="border border-gray-200 rounded-lg p-2.5"
              >

                <label
                  class="block text-xs font-bold text-gray-700 mb-1"
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
                  :disabled="isSubmitting"
                  class="w-full p-2.5 border rounded-lg text-xl font-black text-right transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
                class="border border-gray-200 rounded-lg p-2.5"
              >

                <label
                  class="block text-xs font-bold text-gray-700 mb-1"
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
                  :disabled="isSubmitting"
                  class="w-full p-2.5 border rounded-lg text-xl font-black text-right transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
                  class="mt-1.5 flex justify-between text-xs"
                >

                  <span
                    class="text-gray-500"
                  >
                    Change
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
                class="border border-gray-200 rounded-lg p-2.5"
              >

                <label
                  class="block text-xs font-bold text-gray-700 mb-1"
                >
                  GCash Reference
                </label>

                <button
                  type="button"
                  @click="
                    setKeypadTarget(
                      'splitGCashReference'
                    )
                  "
                  :disabled="isSubmitting"
                  class="w-full p-2.5 border rounded-lg text-lg font-black text-right transition-colors disabled:cursor-not-allowed disabled:opacity-60 break-all"
                  :class="
                    keypadTarget ===
                    'splitGCashReference'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 bg-gray-50'
                  "
                >
                  {{
                    splitGCashReference ||
                    'Enter reference'
                  }}
                </button>

              </div>

            </div>


            <!-- SPLIT VALIDATION -->

            <div
              v-if="
                splitTotal <
                payableAmount
              "
              class="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700 font-bold"
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
              class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-bold"
            >
              Sobra ng
              ₱{{
                splitExcess.toFixed(2)
              }}
              ang Cash + GCash.
            </div>

            <div
              v-else
              class="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-bold"
            >
              Cash + GCash = exact order total.
            </div>

          </div>


          <!-- ============================================= -->
          <!-- UNSETTLED -->
          <!-- ============================================= -->

          <div
            v-if="isUnsettled"
            class="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5"
          >

            <p
              class="text-sm font-bold text-yellow-800"
            >
              Payment will be collected later.
            </p>

            <p
              class="text-xs text-yellow-700 mt-0.5"
            >
              This delivery order will be saved as Unsettled.
            </p>

          </div>

        </div>


        <!-- =============================================== -->
        <!-- RIGHT SIDE -->
        <!-- =============================================== -->

        <div
          class="bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 p-3 sm:p-4 flex flex-col min-h-0"
        >

          <!-- KEYPAD DISPLAY -->

          <div
            class="bg-white border border-gray-200 rounded-xl p-3 mb-3"
          >

            <p
              class="text-[10px] font-black uppercase tracking-wide text-gray-400"
            >
              {{ keypadTargetLabel }}
            </p>

            <div
              class="mt-1.5 text-right text-2xl font-black text-gray-800 break-all min-h-[36px]"
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
            class="bg-gray-100 rounded-xl p-2"
          >

            <div
              class="grid grid-cols-3 gap-1.5"
            >

              <button
                type="button"
                @click="appendKey('1')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                1
              </button>

              <button
                type="button"
                @click="appendKey('2')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                2
              </button>

              <button
                type="button"
                @click="appendKey('3')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                3
              </button>

              <button
                type="button"
                @click="appendKey('4')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                4
              </button>

              <button
                type="button"
                @click="appendKey('5')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                5
              </button>

              <button
                type="button"
                @click="appendKey('6')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                6
              </button>

              <button
                type="button"
                @click="appendKey('7')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                7
              </button>

              <button
                type="button"
                @click="appendKey('8')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                8
              </button>

              <button
                type="button"
                @click="appendKey('9')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                9
              </button>

              <button
                type="button"
                @click="appendKey('clear')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 text-base font-black text-red-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                C
              </button>

              <button
                type="button"
                @click="appendKey('0')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-xl font-black text-gray-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                0
              </button>

              <button
                type="button"
                @click="appendKey('backspace')"
                :disabled="isSubmitting"
                class="h-12 sm:h-14 rounded-lg bg-gray-200 hover:bg-gray-300 active:bg-gray-400 border border-gray-300 text-xl font-black text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                ←
              </button>

            </div>


            <!-- DECIMAL -->

            <button
              v-if="showDecimalKey"
              type="button"
              @click="appendKey('.')"
              :disabled="isSubmitting"
              class="w-full h-10 mt-1.5 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-lg font-black text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              .
            </button>

          </div>


          <!-- PAYMENT SUMMARY -->

          <div
            class="mt-3 bg-white border border-gray-200 rounded-xl p-3"
          >

            <div
              class="flex justify-between items-center"
            >

              <span
                class="text-xs font-bold text-gray-500"
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
                class="flex justify-between items-center mt-1.5"
              >

                <span
                  class="text-xs font-bold text-gray-500"
                >
                  Tendered
                </span>

                <span
                  class="text-base font-black"
                >
                  ₱{{
                    Number(
                      amountTendered || 0
                    ).toFixed(2)
                  }}
                </span>

              </div>

              <div
                class="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-100"
              >

                <span
                  class="text-xs font-bold text-gray-500"
                >
                  Change
                </span>

                <span
                  class="text-lg font-black text-green-600"
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
                class="flex justify-between items-center mt-1.5"
              >

                <span
                  class="text-xs font-bold text-gray-500"
                >
                  Paid
                </span>

                <span
                  class="text-base font-black"
                >
                  ₱{{ splitTotal.toFixed(2) }}
                </span>

              </div>

              <div
                class="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-100"
              >

                <span
                  class="text-xs font-bold text-gray-500"
                >
                  Remaining
                </span>

                <span
                  class="text-base font-black"
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
            class="mt-auto pt-3 grid grid-cols-2 gap-2"
          >

            <button
              @click="closeModal"
              type="button"
              :disabled="isSubmitting"
              class="min-h-[44px] rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              @click="handleConfirm"
              type="button"
              :disabled="
                !isFormValid ||
                isSubmitting
              "
              class="min-h-[44px] rounded-lg text-sm text-white font-black shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
              :style="
                isFormValid &&
                !isSubmitting
                  ? {
                      backgroundColor:
                        settingsStore.themeColor
                    }
                  : {}
              "
            >
              {{
                isSubmitting
                  ? 'Processing...'
                  : isUnsettled
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