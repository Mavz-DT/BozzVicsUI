import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

export const useExpenseStore = defineStore('expense', () => {
  const expenses = ref([])
  const loading = ref(false)

  const authStore = useAuthStore()

  // =====================================================
  // API BASE URL
  // Local:
  // http://localhost:5000
  //
  // Production:
  // uses VITE_API_URL from Vercel environment variable
  // =====================================================
  const API_BASE_URL = (
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000'
  ).replace(/\/$/, '')

  const API = `${API_BASE_URL}/api/expenses`

  // =====================================================
  // AUTH HEADERS
  // =====================================================
  const getAuthHeaders = () => {
    const token =
      authStore.getToken?.() ||
      localStorage.getItem('token') ||
      ''

    return token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  }

  // =====================================================
  // FETCH EXPENSES
  // Optional date = YYYY-MM-DD
  // =====================================================
  const fetchExpenses = async (date = '') => {
    loading.value = true

    try {
      const url = date
        ? `${API}?date=${encodeURIComponent(date)}`
        : API

      const res = await fetch(url, {
        headers: {
          ...getAuthHeaders()
        }
      })

      if (res.ok) {
        expenses.value = await res.json()
      } else {
        console.error(
          'Failed to fetch expenses:',
          res.status
        )
      }
    } catch (err) {
      console.error(
        'Error fetching expenses:',
        err
      )
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // ADD EXPENSE
  // date is optional so the list refreshes correctly
  // =====================================================
  const addExpense = async (
    data,
    date = ''
  ) => {
    try {
      const res = await fetch(
        API,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            ...getAuthHeaders()
          },

          body:
            JSON.stringify(data)
        }
      )

      if (res.ok) {
        await fetchExpenses(date)
        return true
      }

      const result =
        await res.json().catch(
          () => null
        )

      const message =
        result?.message ||
        `Hindi na-save ang expense (${res.status}).`

      console.error(
        'Failed to add expense:',
        message
      )

      // Itapon ang error para maipakita sa user (hindi na tahimik).
      throw new Error(message)
    } catch (err) {
      console.error(
        'Error adding expense:',
        err
      )

      // Ipasa ang mensahe pataas para makita ng cashier/admin.
      throw err
    }
  }

  return {
    expenses,
    loading,
    fetchExpenses,
    addExpense
  }
})