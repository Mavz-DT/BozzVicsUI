<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const addOns = ref([])

const isLoading = ref(true)
const isSaving = ref(false)

const error = ref('')
const success = ref('')

const editingId = ref(null)

const form = ref({
  name: '',
  price: '',
  isAvailable: true
})

// =====================================================
// API
// =====================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '')

const API = `${API_BASE_URL}/api`

// =====================================================
// RESPONSE HELPER
// =====================================================

const extractAddOnsArray = data => {
  let records = []

  if (Array.isArray(data)) {
    records = data
  } else if (Array.isArray(data?.addOns)) {
    records = data.addOns
  } else if (Array.isArray(data?.addons)) {
    records = data.addons
  } else if (Array.isArray(data?.records)) {
    records = data.records
  } else if (Array.isArray(data?.results)) {
    records = data.results
  } else if (Array.isArray(data?.data)) {
    records = data.data
  }

  return records.filter(addOn => {
    return (
      addOn &&
      typeof addOn === 'object' &&
      addOn._id &&
      String(addOn.name || '').trim() !== ''
    )
  })
}

// =====================================================
// FETCH ADD-ONS
// =====================================================

const fetchAddOns = async () => {
  try {
    isLoading.value = true
    error.value = ''

    const res = await axios.get(
      `${API}/add-ons`
    )

    addOns.value =
      extractAddOnsArray(res.data)

    console.log(
      'Add-ons response:',
      res.data
    )

    console.log(
      'Normalized add-ons:',
      addOns.value
    )
  } catch (err) {
    console.error(
      'Error fetching add-ons:',
      err
    )

    addOns.value = []

    error.value =
      err.response?.data?.message ||
      'Hindi makuha ang add-ons.'
  } finally {
    isLoading.value = false
  }
}

// =====================================================
// FORM
// =====================================================

const resetForm = () => {
  editingId.value = null

  form.value = {
    name: '',
    price: '',
    isAvailable: true
  }
}

const startEdit = addOn => {
  if (!addOn) return

  editingId.value = addOn._id

  form.value = {
    name: addOn.name || '',
    price: addOn.price ?? '',
    isAvailable:
      addOn.isAvailable !== false
  }

  error.value = ''
  success.value = ''

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// =====================================================
// SAVE
// =====================================================

const saveAddOn = async () => {
  if (!form.value.name.trim()) {
    error.value =
      'Required ang Add-on Name.'

    return
  }

  const price =
    Number(form.value.price)

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    error.value =
      'Maglagay ng valid na presyo.'

    return
  }

  try {
    isSaving.value = true
    error.value = ''
    success.value = ''

    if (editingId.value) {
      await axios.put(
        `${API}/add-ons/${editingId.value}`,
        {
          name:
            form.value.name.trim(),

          price,

          isAvailable:
            form.value.isAvailable
        }
      )

      success.value =
        'Add-on updated successfully.'
    } else {
      await axios.post(
        `${API}/add-ons`,
        {
          name:
            form.value.name.trim(),

          price,

          isAvailable:
            form.value.isAvailable
        }
      )

      success.value =
        'Add-on added successfully.'
    }

    resetForm()

    await fetchAddOns()

    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err) {
    console.error(
      'Error saving add-on:',
      err
    )

    error.value =
      err.response?.data?.message ||
      'Hindi ma-save ang add-on.'
  } finally {
    isSaving.value = false
  }
}

// =====================================================
// DELETE
// =====================================================

const deleteAddOn = async addOn => {
  if (!addOn?._id) return

  const confirmed =
    window.confirm(
      `Delete "${addOn.name}"?`
    )

  if (!confirmed) return

  try {
    error.value = ''

    await axios.delete(
      `${API}/add-ons/${addOn._id}`
    )

    success.value =
      'Add-on deleted successfully.'

    if (
      editingId.value ===
      addOn._id
    ) {
      resetForm()
    }

    await fetchAddOns()

    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err) {
    console.error(
      'Error deleting add-on:',
      err
    )

    error.value =
      err.response?.data?.message ||
      'Hindi ma-delete ang add-on.'
  }
}

// =====================================================
// TOGGLE AVAILABILITY
// =====================================================

const toggleAvailability = async addOn => {
  if (!addOn?._id) return

  try {
    error.value = ''

    await axios.put(
      `${API}/add-ons/${addOn._id}`,
      {
        isAvailable:
          !addOn.isAvailable
      }
    )

    await fetchAddOns()
  } catch (err) {
    console.error(
      'Error updating add-on availability:',
      err
    )

    error.value =
      err.response?.data?.message ||
      'Hindi ma-update ang availability.'
  }
}

// =====================================================
// FORMAT
// =====================================================

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

// =====================================================
// INITIAL LOAD
// =====================================================

onMounted(() => {
  fetchAddOns()
})
</script>

<template>
  <div
    class="p-4 sm:p-6 max-w-6xl mx-auto space-y-6"
  >

    <!-- Header -->

    <div>

      <h1
        class="text-2xl md:text-3xl font-black text-gray-800"
      >
        Add-ons
      </h1>

      <p
        class="text-sm text-gray-500 mt-1"
      >
        Manage optional add-ons tulad ng egg, extra meat, cheese, at sauces.
      </p>

    </div>

    <!-- Messages -->

    <div
      v-if="error"
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

    <!-- Form -->

    <div
      class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
    >

      <div
        class="px-5 py-4 text-white"
        :style="{
          backgroundColor:
            settingsStore.themeColor
        }"
      >
        <h2 class="font-black text-lg">
          {{
            editingId
              ? 'Edit Add-on'
              : 'Add New Add-on'
          }}
        </h2>
      </div>

      <form
        @submit.prevent="saveAddOn"
        class="p-5"
      >

        <div
          class="grid grid-cols-1 md:grid-cols-3 gap-4"
        >

          <!-- Name -->

          <div
            class="md:col-span-1"
          >

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Add-on Name
            </label>

            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Egg"
              class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            />

          </div>

          <!-- Price -->

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Price
            </label>

            <input
              v-model="form.price"
              type="number"
              min="0"
              step="0.01"
              placeholder="20.00"
              class="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            />

          </div>

          <!-- Availability -->

          <div>

            <label
              class="block text-sm font-semibold text-gray-700 mb-1"
            >
              Availability
            </label>

            <label
              class="flex items-center gap-3 border border-gray-300 rounded-xl p-3 cursor-pointer h-[50px]"
            >

              <input
                v-model="form.isAvailable"
                type="checkbox"
                class="w-4 h-4"
              />

              <span
                class="text-sm font-semibold text-gray-700"
              >
                Available
              </span>

            </label>

          </div>

        </div>

        <!-- Buttons -->

        <div
          class="flex flex-wrap gap-3 mt-5"
        >

          <button
            type="submit"
            :disabled="isSaving"
            class="px-5 py-3 rounded-xl text-white font-bold shadow-sm disabled:bg-gray-300"
            :style="{
              backgroundColor:
                isSaving
                  ? '#d1d5db'
                  : settingsStore.themeColor
            }"
          >
            {{
              isSaving
                ? 'Saving...'
                : editingId
                  ? 'Update Add-on'
                  : 'Add Add-on'
            }}
          </button>

          <button
            v-if="editingId"
            type="button"
            @click="resetForm"
            class="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
          >
            Cancel
          </button>

        </div>

      </form>

    </div>

    <!-- List -->

    <div
      class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
    >

      <div
        class="px-5 py-4 border-b border-gray-100"
      >

        <h2
          class="font-black text-lg text-gray-800"
        >
          Add-on List
        </h2>

      </div>

      <!-- Loading -->

      <div
        v-if="isLoading"
        class="p-10 text-center text-gray-500"
      >
        Loading add-ons...
      </div>

      <!-- Empty -->

      <div
        v-else-if="addOns.length === 0"
        class="p-12 text-center"
      >

        <div
          class="text-4xl mb-3"
        >
          ➕
        </div>

        <p
          class="font-bold text-gray-700"
        >
          Wala pang add-ons.
        </p>

        <p
          class="text-sm text-gray-400 mt-1"
        >
          Magdagdag ng unang add-on gamit ang form sa taas.
        </p>

      </div>

      <!-- Table -->

      <div
        v-else
        class="overflow-x-auto"
      >

        <table
          class="w-full text-sm"
        >

          <thead
            class="bg-gray-50 border-b border-gray-200"
          >

            <tr>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600"
              >
                Add-on
              </th>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600"
              >
                Price
              </th>

              <th
                class="text-left px-5 py-3 font-bold text-gray-600"
              >
                Status
              </th>

              <th
                class="text-right px-5 py-3 font-bold text-gray-600"
              >
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            <tr
              v-for="addOn in addOns"
              :key="addOn._id"
              class="border-b border-gray-100 last:border-b-0"
            >

              <!-- Add-on -->

              <td
                class="px-5 py-4"
              >

                <span
                  class="font-bold text-gray-800"
                >
                  {{ addOn.name }}
                </span>

              </td>

              <!-- Price -->

              <td
                class="px-5 py-4"
              >

                <span
                  class="font-bold"
                  :style="{
                    color:
                      settingsStore.themeColor
                  }"
                >
                  {{
                    formatAmount(
                      addOn.price
                    )
                  }}
                </span>

              </td>

              <!-- Status -->

              <td
                class="px-5 py-4"
              >

                <button
                  @click="
                    toggleAvailability(
                      addOn
                    )
                  "
                  type="button"
                  class="px-3 py-1 rounded-full text-xs font-bold"
                  :class="
                    addOn.isAvailable
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  "
                >
                  {{
                    addOn.isAvailable
                      ? 'Available'
                      : 'Unavailable'
                  }}
                </button>

              </td>

              <!-- Actions -->

              <td
                class="px-5 py-4"
              >

                <div
                  class="flex justify-end gap-2"
                >

                  <button
                    @click="
                      startEdit(addOn)
                    "
                    type="button"
                    title="Edit"
                    class="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                  >
                    ✎
                  </button>

                  <button
                    @click="
                      deleteAddOn(addOn)
                    "
                    type="button"
                    title="Delete"
                    class="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold"
                  >
                    🗑
                  </button>

                </div>

              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>

  </div>
</template>