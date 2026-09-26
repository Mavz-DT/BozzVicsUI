import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

export const useExpenseStore = defineStore('expense', () => {
  const expenses = ref([])
  const loading = ref(false)

  const authStore = useAuthStore()

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
        ? `/api/expenses?date=${encodeURIComponent(date)}`
        : '/api/expenses'

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
        '/api/expenses',
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

      console.error(
        'Failed to add expense:',
        result?.message ||
          res.status
      )
    } catch (err) {
      console.error(
        'Error adding expense:',
        err
      )
    }

    return false
  }

  return {
    expenses,
    loading,
    fetchExpenses,
    addExpense
  }
})