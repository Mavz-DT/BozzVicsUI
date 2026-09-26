import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const cart = ref([])

  const getAddOnTotal = item => {
    return (item.addOns || []).reduce(
      (total, addOn) => total + Number(addOn.price || 0),
      0
    )
  }

  const getItemUnitPrice = item => {
    return Number(item.price || 0) + getAddOnTotal(item)
  }

  const totalAmount = computed(() => {
    return cart.value.reduce(
      (total, item) =>
        total + (getItemUnitPrice(item) * item.quantity),
      0
    )
  })

  const totalItems = computed(() => {
    return cart.value.reduce(
      (total, item) => total + item.quantity,
      0
    )
  })

  const addToCart = (item, addOns = [], specialInstructions = '') => {
    const normalizedAddOns = addOns.map(addOn => ({
      addOnId: addOn._id || addOn.addOnId,
      name: addOn.name,
      price: Number(addOn.price || 0)
    }))

    const addOnSignature = normalizedAddOns
      .map(addOn => addOn.addOnId)
      .sort()
      .join('|')

    const existing = cart.value.find(cartItem => {
      const existingSignature = (cartItem.addOns || [])
        .map(addOn => addOn.addOnId)
        .sort()
        .join('|')

      return (
        cartItem.menuId === item.id &&
        existingSignature === addOnSignature &&
        (cartItem.specialInstructions || '') === specialInstructions
      )
    })

    if (existing) {
      if (existing.quantity >= item.stock) return false

      existing.quantity++

      return true
    }

    if (item.stock <= 0) return false

    cart.value.push({
      cartItemId: `${item.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      menuId: item.id,

      name: item.name,

      price: Number(item.price),

      stock: Number(item.stock),

      quantity: 1,

      addOns: normalizedAddOns,

      specialInstructions: specialInstructions || ''
    })

    return true
  }

  const removeFromCart = cartItemId => {
    cart.value = cart.value.filter(
      item => item.cartItemId !== cartItemId
    )
  }

  const updateQuantity = (cartItemId, action) => {
    const item = cart.value.find(
      cartItem => cartItem.cartItemId === cartItemId
    )

    if (!item) return

    if (action === 'add') {
      if (item.quantity < item.stock) {
        item.quantity++
      }
    }

    if (action === 'minus') {
      if (item.quantity > 1) {
        item.quantity--
      } else {
        removeFromCart(cartItemId)
      }
    }
  }

  const updateInstructions = (cartItemId, instructions) => {
    const item = cart.value.find(
      cartItem => cartItem.cartItemId === cartItemId
    )

    if (!item) return

    item.specialInstructions = instructions
  }

  const clearCart = () => {
    cart.value = []
  }

  return {
    cart,
    totalAmount,
    totalItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateInstructions,
    getAddOnTotal,
    getItemUnitPrice,
    clearCart
  }
})
