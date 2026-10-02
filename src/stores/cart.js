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

  // Kunin ang tamang presyo base sa order type. Kung walang per-type
  // override (null), gamitin ang base na presyo. Dapat tugma ito sa
  // resolveMenuPrice sa server para pareho ang total.
  const resolvePriceForType = (basePrice, prices, orderType) => {
    const base = Number(basePrice || 0)

    if (!prices) return base

    const key =
      orderType === 'Dine-In'
        ? 'dineIn'
        : orderType === 'Take-Out'
          ? 'takeOut'
          : orderType === 'Delivery'
            ? 'delivery'
            : null

    if (!key) return base

    const v = prices[key]

    return v !== undefined && v !== null && v !== ''
      ? Number(v)
      : base
  }

  // I-update ang presyo ng lahat ng item sa cart kapag nagbago ang
  // order type (Dine-In / Take-Out / Delivery).
  const repriceForOrderType = orderType => {
    cart.value.forEach(item => {
      const base =
        item.basePrice !== undefined && item.basePrice !== null
          ? item.basePrice
          : item.price

      item.price = resolvePriceForType(base, item.prices, orderType)
    })
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

      // Base na presyo at per-type overrides — para ma-recompute
      // ang presyo kapag nagbago ang order type.
      basePrice:
        item.basePrice !== undefined && item.basePrice !== null
          ? Number(item.basePrice)
          : Number(item.price),

      prices: item.prices || null,

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
    resolvePriceForType,
    repriceForOrderType,
    clearCart
  }
})
