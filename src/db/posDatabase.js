import Dexie from 'dexie'

/*
|--------------------------------------------------------------------------
| BOZZ VIC'S POS — LOCAL OFFLINE DATABASE
|--------------------------------------------------------------------------
|
| Purpose:
| - Store cached POS master data locally
| - Store offline orders/payments
| - Maintain a sync queue for reconnect/synchronization
| - Keep offline logic separate from Vue views
|
| Important:
| This is NOT yet wired into PosView.vue.
| For this step, we are only preparing the database layer.
|--------------------------------------------------------------------------
*/

const db =
  new Dexie("BozzVicsPOS")

/*
|--------------------------------------------------------------------------
| DATABASE VERSION 1
|--------------------------------------------------------------------------
|
| Tables:
|
| metadata
|   - general local app information
|
| categories
|   - cached menu categories
|
| menus
|   - cached menu items
|
| addOns
|   - cached available add-ons
|
| settings
|   - cached POS/business settings
|
| orderNumbers
|   - cached order-number status
|
| offlineOrders
|   - orders created while offline
|
| offlinePayments
|   - payments created while offline
|
| inventorySnapshots
|   - cached inventory data for future offline stock handling
|
| syncQueue
|   - records waiting to be synchronized with the server
|--------------------------------------------------------------------------
*/

db.version(1).stores({
  metadata:
    'key',

  categories:
    'id, name, isActive',

  menus:
    'id, categoryId, name, isAvailable, stockMonitoring, updatedAt',

  addOns:
    'id, name, isAvailable, updatedAt',

  settings:
    'key, updatedAt',

  orderNumbers:
    'id, number, status, updatedAt',

  offlineOrders:
    '++localId, clientOrderId, serverOrderId, syncStatus, orderType, paymentStatus, createdAt, updatedAt',

  offlinePayments:
    '++localId, clientPaymentId, serverPaymentId, orderClientId, paymentRequestId, syncStatus, paymentMethod, createdAt, updatedAt',

  inventorySnapshots:
    'id, menuId, quantity, updatedAt',

  syncQueue:
    '++id, queueId, entityType, action, localId, clientId, idempotencyKey, status, attempts, createdAt, updatedAt'
})

/*
|--------------------------------------------------------------------------
| DATABASE HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Generate a client-side unique ID.
 *
 * Example:
 * bvpos-order-9f4e...
 */
export const generateClientId = (
  prefix
) => {
  const randomPart =
    globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`

  return `${prefix}-${randomPart}`
}

/**
 * Get current timestamp in milliseconds.
 */
export const now = () => {
  return Date.now()
}

/*
|--------------------------------------------------------------------------
| LOCAL RECORD NORMALIZATION
|--------------------------------------------------------------------------
|
| MongoDB documents normally use `_id`.
| Our Dexie master-data tables currently use `id`
| as their primary key.
|
| To avoid changing the existing IndexedDB schema,
| we copy `_id` into `id` before saving.
|
| We also keep the original `_id` because the POS
| UI and future API calls may still need it.
|--------------------------------------------------------------------------
*/

const normalizeMongoRecord = (
  record
) => {
  if (!record) {
    return null
  }

  const normalized = {
    ...record
  }

  if (
    normalized.id === undefined ||
    normalized.id === null ||
    normalized.id === ''
  ) {
    normalized.id =
      normalized._id
  }

  return normalized
}

/**
 * Normalize an array of MongoDB documents.
 */
const normalizeMongoRecords = (
  records = []
) => {
  if (!Array.isArray(records)) {
    return []
  }

  return records
    .map(
      normalizeMongoRecord
    )
    .filter(
      record => record?.id
    )
}

/*
|--------------------------------------------------------------------------
| METADATA
|--------------------------------------------------------------------------
*/

/**
 * Save a metadata value.
 */
export const setMetadata = async (
  key,
  value
) => {
  await db.metadata.put({
    key,
    value,
    updatedAt: now()
  })
}

/**
 * Get a metadata value.
 */
export const getMetadata = async (
  key,
  fallback = null
) => {
  const record =
    await db.metadata.get(key)

  return (
    record?.value ??
    fallback
  )
}

/*
|--------------------------------------------------------------------------
| CATEGORIES
|--------------------------------------------------------------------------
*/

/**
 * Replace all cached categories.
 *
 * We use a transaction so the local cache does not
 * end up half-updated.
 */
export const replaceCategories =
  async (
    categories = []
  ) => {
    const normalizedCategories =
      normalizeMongoRecords(
        categories
      )

    await db.transaction(
      'rw',
      db.categories,
      async () => {
        await db.categories.clear()

        if (
          normalizedCategories.length >
          0
        ) {
          await db.categories.bulkPut(
            normalizedCategories
          )
        }
      }
    )
  }

/**
 * Get cached categories.
 */
export const getCachedCategories =
  async () => {
    return db.categories
      .orderBy('name')
      .toArray()
  }

/*
|--------------------------------------------------------------------------
| MENU ITEMS
|--------------------------------------------------------------------------
*/

/**
 * Replace all cached menu items.
 */
export const replaceMenus =
  async (
    menus = []
  ) => {
    const normalizedMenus =
      normalizeMongoRecords(
        menus
      ).map(
        menu => ({
          ...menu,

          /*
           * Keep a simple categoryId locally
           * when the API returns a populated
           * category object.
           */
          categoryId:
            menu.categoryId ??
            menu.category?._id ??
            menu.category?.id ??
            null
        })
      )

    await db.transaction(
      'rw',
      db.menus,
      async () => {
        await db.menus.clear()

        if (
          normalizedMenus.length >
          0
        ) {
          await db.menus.bulkPut(
            normalizedMenus
          )
        }
      }
    )
  }

/**
 * Get all cached menus.
 */
export const getCachedMenus =
  async () => {
    return db.menus
      .orderBy('name')
      .toArray()
  }

/**
 * Get cached menus by category.
 */
export const getCachedMenusByCategory =
  async (
    categoryId
  ) => {
    return db.menus
      .where('categoryId')
      .equals(categoryId)
      .toArray()
  }

/*
|--------------------------------------------------------------------------
| ADD-ONS
|--------------------------------------------------------------------------
*/

/**
 * Replace all cached add-ons.
 */
export const replaceAddOns =
  async (
    addOns = []
  ) => {
    const normalizedAddOns =
      normalizeMongoRecords(
        addOns
      )

    await db.transaction(
      'rw',
      db.addOns,
      async () => {
        await db.addOns.clear()

        if (
          normalizedAddOns.length >
          0
        ) {
          await db.addOns.bulkPut(
            normalizedAddOns
          )
        }
      }
    )
  }

/**
 * Get cached available add-ons.
 */
export const getCachedAddOns =
  async () => {
    return db.addOns
      .filter(
        addOn =>
          addOn.isAvailable !== false
      )
      .toArray()
  }

/*
|--------------------------------------------------------------------------
| SETTINGS
|--------------------------------------------------------------------------
*/

/**
 * Save all POS settings locally.
 */
export const saveCachedSettings =
  async (
    settings
  ) => {
    if (!settings) {
      return
    }

    await db.settings.put({
      key: 'pos-settings',
      value: settings,
      updatedAt: now()
    })
  }

/**
 * Get locally cached POS settings.
 */
export const getCachedSettings =
  async () => {
    const record =
      await db.settings.get(
        'pos-settings'
      )

    return (
      record?.value ??
      null
    )
  }

/*
|--------------------------------------------------------------------------
| ORDER NUMBERS
|--------------------------------------------------------------------------
*/

/**
 * Replace cached order numbers.
 */
export const replaceOrderNumbers =
  async (
    orderNumbers = []
  ) => {
    const normalizedOrderNumbers =
      normalizeMongoRecords(
        orderNumbers
      )

    await db.transaction(
      'rw',
      db.orderNumbers,
      async () => {
        await db.orderNumbers.clear()

        if (
          normalizedOrderNumbers.length >
          0
        ) {
          await db.orderNumbers.bulkPut(
            normalizedOrderNumbers
          )
        }
      }
    )
  }

/**
 * Get cached order numbers.
 */
export const getCachedOrderNumbers =
  async () => {
    return db.orderNumbers
      .orderBy('number')
      .toArray()
  }

/*
|--------------------------------------------------------------------------
| INVENTORY SNAPSHOTS
|--------------------------------------------------------------------------
|
| This is only the local snapshot.
|
| Later, when offline selling is enabled, we will use this
| to calculate local stock changes while disconnected.
|--------------------------------------------------------------------------
*/

/**
 * Replace cached inventory snapshot.
 */
export const replaceInventorySnapshot =
  async (
    inventory = []
  ) => {
    const normalizedInventory =
      normalizeMongoRecords(
        inventory
      )

    await db.transaction(
      'rw',
      db.inventorySnapshots,
      async () => {
        await db.inventorySnapshots.clear()

        if (
          normalizedInventory.length >
          0
        ) {
          await db.inventorySnapshots.bulkPut(
            normalizedInventory
          )
        }
      }
    )
  }

/**
 * Get cached inventory snapshot.
 */
export const getCachedInventory =
  async () => {
    return db.inventorySnapshots
      .toArray()
  }

/*
|--------------------------------------------------------------------------
| OFFLINE ORDERS
|--------------------------------------------------------------------------
*/

/**
 * Save a new offline order.
 *
 * The entire order payload is preserved inside `data`
 * so historical fields are not lost.
 */
export const saveOfflineOrder =
  async (
    orderData
  ) => {
    const clientOrderId =
      orderData?.clientOrderId ||
      generateClientId(
        'bvpos-order'
      )

    const record = {
      clientOrderId,

      serverOrderId:
        orderData?.serverOrderId ??
        null,

      syncStatus:
        orderData?.syncStatus ||
        'Pending',

      orderType:
        orderData?.orderType ||
        '',

      paymentStatus:
        orderData?.paymentStatus ||
        'Unpaid',

      createdAt:
        orderData?.createdAt ??
        now(),

      updatedAt:
        now(),

      data: {
        ...orderData,
        clientOrderId
      }
    }

    const localId =
      await db.offlineOrders.add(
        record
      )

    return {
      localId,
      clientOrderId
    }
  }

/**
 * Get one offline order.
 */
export const getOfflineOrder =
  async (
    localId
  ) => {
    return db.offlineOrders.get(
      localId
    )
  }

/**
 * Get offline order by client ID.
 */
export const getOfflineOrderByClientId =
  async (
    clientOrderId
  ) => {
    return db.offlineOrders
      .where('clientOrderId')
      .equals(clientOrderId)
      .first()
  }

/**
 * Get all orders waiting for sync.
 */
export const getPendingOfflineOrders =
  async () => {
    return db.offlineOrders
      .where('syncStatus')
      .equals('Pending')
      .sortBy('createdAt')
  }

/**
 * Update offline order status.
 */
export const updateOfflineOrderSyncStatus =
  async (
    localId,
    syncStatus,
    extra = {}
  ) => {
    await db.offlineOrders.update(
      localId,
      {
        syncStatus,
        ...extra,
        updatedAt: now()
      }
    )
  }

/*
|--------------------------------------------------------------------------
| OFFLINE PAYMENTS
|--------------------------------------------------------------------------
*/

/**
 * Save a new offline payment.
 */
export const saveOfflinePayment =
  async (
    paymentData
  ) => {
    const clientPaymentId =
      paymentData?.clientPaymentId ||
      generateClientId(
        'bvpos-payment'
      )

    const record = {
      clientPaymentId,

      serverPaymentId:
        paymentData?.serverPaymentId ??
        null,

      orderClientId:
        paymentData?.orderClientId ??
        null,

      paymentRequestId:
        paymentData?.paymentRequestId ??
        null,

      syncStatus:
        paymentData?.syncStatus ||
        'Pending',

      paymentMethod:
        paymentData?.paymentMethod ||
        '',

      createdAt:
        paymentData?.createdAt ??
        now(),

      updatedAt:
        now(),

      data: {
        ...paymentData,
        clientPaymentId
      }
    }

    const localId =
      await db.offlinePayments.add(
        record
      )

    return {
      localId,
      clientPaymentId
    }
  }

/**
 * Get one offline payment.
 */
export const getOfflinePayment =
  async (
    localId
  ) => {
    return db.offlinePayments.get(
      localId
    )
  }

/**
 * Get payments for an offline order.
 */
export const getOfflinePaymentsByOrder =
  async (
    orderClientId
  ) => {
    return db.offlinePayments
      .where('orderClientId')
      .equals(orderClientId)
      .toArray()
  }

/**
 * Get all payments waiting for sync.
 */
export const getPendingOfflinePayments =
  async () => {
    return db.offlinePayments
      .where('syncStatus')
      .equals('Pending')
      .sortBy('createdAt')
  }

/**
 * Update offline payment sync status.
 */
export const updateOfflinePaymentSyncStatus =
  async (
    localId,
    syncStatus,
    extra = {}
  ) => {
    await db.offlinePayments.update(
      localId,
      {
        syncStatus,
        ...extra,
        updatedAt: now()
      }
    )
  }

/*
|--------------------------------------------------------------------------
| SYNC QUEUE
|--------------------------------------------------------------------------
|
| Every offline operation that needs to reach the server
| will eventually have a queue record.
|
| Example:
|
| entityType: 'Order'
| action: 'CREATE'
| status: 'Pending'
|
| Then our future sync service will process these records
| when navigator.onLine becomes true.
|--------------------------------------------------------------------------
*/

/**
 * Add an operation to the sync queue.
 */
export const enqueueSync =
  async ({
    entityType,
    action,
    localId = null,
    clientId = null,
    idempotencyKey = null,
    payload = null
  }) => {
    const queueId =
      generateClientId(
        'bvpos-sync'
      )

    const timestamp =
      now()

    const queueRecord = {
      queueId,

      entityType,
      action,

      localId,
      clientId,
      idempotencyKey,

      status:
        'Pending',

      attempts:
        0,

      lastError:
        '',

      payload,

      createdAt:
        timestamp,

      updatedAt:
        timestamp
    }

    const id =
      await db.syncQueue.add(
        queueRecord
      )

    return {
      id,
      queueId
    }
  }

/**
 * Get pending sync records.
 */
export const getPendingSyncQueue =
  async () => {
    return db.syncQueue
      .where('status')
      .equals('Pending')
      .sortBy('createdAt')
  }

/**
 * Mark sync record as processing.
 */
export const markSyncProcessing =
  async (
    id
  ) => {
    await db.syncQueue.update(
      id,
      {
        status:
          'Processing',

        updatedAt:
          now()
      }
    )
  }

/**
 * Mark sync record as successfully synced.
 */
export const markSyncComplete =
  async (
    id
  ) => {
    const timestamp =
      now()

    await db.syncQueue.update(
      id,
      {
        status:
          'Synced',

        syncedAt:
          timestamp,

        updatedAt:
          timestamp
      }
    )
  }

/**
 * Mark sync record as failed.
 *
 * We do not delete the record.
 * It stays available for retry.
 */
export const markSyncFailed =
  async (
    id,
    errorMessage = ''
  ) => {
    const current =
      await db.syncQueue.get(
        id
      )

    if (!current) {
      return
    }

    await db.syncQueue.update(
      id,
      {
        status:
          'Pending',

        attempts:
          Number(
            current.attempts || 0
          ) + 1,

        lastError:
          String(
            errorMessage || ''
          ),

        updatedAt:
          now()
      }
    )
  }

/**
 * Get count of pending sync operations.
 */
export const getPendingSyncCount =
  async () => {
    return db.syncQueue
      .where('status')
      .equals('Pending')
      .count()
  }

/*
|--------------------------------------------------------------------------
| DATABASE MAINTENANCE
|--------------------------------------------------------------------------
*/

/**
 * Clear only temporary sync records that are already completed.
 *
 * We keep the local orders/payments for now.
 */
export const clearCompletedSyncQueue =
  async () => {
    await db.syncQueue
      .where('status')
      .equals('Synced')
      .delete()
  }

/**
 * Clear the entire local database.
 *
 * DO NOT call this during normal POS operation.
 * This is provided mainly for development/testing/logout-reset
 * scenarios later.
 */
export const clearLocalDatabase =
  async () => {
    await db.delete()
  }

/*
|--------------------------------------------------------------------------
| EXPORT DATABASE INSTANCE
|--------------------------------------------------------------------------
|
| We export `db` as well in case a future module needs
| direct Dexie transactions.
|--------------------------------------------------------------------------
*/

export default db