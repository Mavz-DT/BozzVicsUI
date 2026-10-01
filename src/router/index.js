import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LoginView from '../views/LoginView.vue'
import PosView from '../views/PosView.vue'
import InventoryView from '../views/InventoryView.vue'
import SettingsView from '../views/SettingsView.vue'
import ActiveOrdersView from '../views/ActiveOrdersView.vue'
import UnsettledOrdersView from '../views/UnsettledOrdersView.vue'
import KitchenOrdersView from '../views/KitchenOrdersView.vue'
import AddOnsView from '../views/AddOnsView.vue'
import SalesRecordsView from '../views/SalesRecordsView.vue'
import OrderAuditView from '../views/OrderAuditView.vue'
import ReportsView from '../views/ReportsView.vue'
import AttendanceView from '../views/AttendanceView.vue'
import EmployeesView from '../views/EmployeesView.vue'
import ExpenseItemsView from '../views/ExpenseItemsView.vue'
import MenuManagementView from '../views/MenuManagementView.vue'
import ManageUsersView from '../views/ManageUsersView.vue'
import CashLedgerView from '../views/CashLedgerView.vue'
import ExpensesView from '../views/ExpensesView.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    component: LoginView
  },
  {
    path: '/pos',
    component: PosView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/cash-ledger',
    name: 'CashLedger',
    component: CashLedgerView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/sales-records',
    name: 'sales-records',
    component: SalesRecordsView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/order-audit',
    component: OrderAuditView,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/inventory',
    component: InventoryView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/expenses',
    name: 'expenses',
    component: ExpensesView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/expense-items',
    name: 'expense-items',
    component: ExpenseItemsView,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/menu-management',
    name: 'menu-management',
    component: MenuManagementView,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/manage-users',
    name: 'manage-users',
    component: ManageUsersView,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/active-orders',
    name: 'active-orders',
    component: ActiveOrdersView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/unsettled-orders',
    name: 'unsettled-orders',
    component: UnsettledOrdersView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/kitchen-orders',
    name: 'kitchen-orders',
    component: KitchenOrdersView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/add-ons',
    name: 'add-ons',
    component: AddOnsView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/reports',
    component: ReportsView,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/attendance',
    component: AttendanceView,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/employees',
    name: 'employees',
    component: EmployeesView,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const user = authStore.user

  // 1. Page requires login pero walang naka-login
  if (to.meta.requiresAuth && !user) {
    return next('/login')
  }

  // 2. Naka-login na at pumunta sa login
  if (to.path === '/login' && user) {
    return next('/pos')
  }

  // 3. Page requires Admin pero hindi Admin ang user
  if (to.meta.requiresAdmin && user?.role !== 'Admin') {
    return next('/pos')
  }

  // 4. Otherwise, tuloy
  next()
})

export default router