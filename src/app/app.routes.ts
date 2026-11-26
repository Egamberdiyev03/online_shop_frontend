import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { Routes } from '@angular/router';
import { customerGuard, superAdminGuard, adminGuard, authGuard, branchDetailGuard, analyticsGuard, curierGuard, cashAdminGuard, nonCurierGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'products'
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent),
    canActivate: [nonCurierGuard]
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/products/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
    canActivate: [nonCurierGuard]
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart-view/cart-view.component').then(m => m.CartViewComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders-list/orders-list.component').then(m => m.OrdersListComponent),
    canActivate: [nonCurierGuard]
  },
  {
    path: 'categories',
    loadComponent: () => import('./features/categories/category-list/category-list.component').then(m => m.CategoryListComponent),
    canActivate: [superAdminGuard]
  },
  {
    path: 'companies',
    loadComponent: () => import('./features/companies/company-list/company-list.component').then(m => m.CompanyListComponent)
  },
  {
    path: 'companies/:id',
    loadComponent: () => import('./features/companies/company-detail/company-detail.component').then(m => m.CompanyDetailComponent)
  },
  {
    path: 'branches/:id',
    loadComponent: () => import('./features/companies/branch-detail/branch-detail.component').then(m => m.BranchDetailComponent),
    canActivate: [branchDetailGuard]
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/branches-map/branches-map.component').then(m => m.BranchesMapComponent)
  },
  {
    path: 'customers',
    loadComponent: () => import('./features/customers/customer-list/customer-list.component').then(m => m.CustomerListComponent),
    canActivate: [superAdminGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'confirm-email',
    loadComponent: () => import('./features/auth/confirm-email/confirm-email.component').then(m => m.ConfirmEmailComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile/comments',
    loadComponent: () => import('./features/profile/my-comments/my-comments.component').then(m => m.MyCommentsComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'profile/settings',
    loadComponent: () => import('./features/profile/profile-settings/profile-settings.component').then(m => m.ProfileSettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'notifications',
    loadComponent: () => import('./features/notifications/notifications-list.component').then(m => m.NotificationsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'payments',
    loadComponent: () => import('./features/payments/customer-payments-list/customer-payments-list.component').then(m => m.CustomerPaymentsListComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'payments/:id',
    loadComponent: () => import('./features/payments/payment-detail/payment-detail.component').then(m => m.PaymentDetailComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'admin/payments',
    loadComponent: () => import('./features/payments/admin-payments-list/admin-payments-list.component').then(m => m.AdminPaymentsListComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/payments/:id',
    loadComponent: () => import('./features/payments/payment-detail/payment-detail.component').then(m => m.PaymentDetailComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'order-items',
    loadComponent: () => import('./features/placeholders/placeholder.component').then(m => m.PlaceholderComponent),
    data: { type: 'order-items' },
    canActivate: [nonCurierGuard]
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'analytics',
    component: AdminDashboardComponent,
    canActivate: [analyticsGuard]
  },
  // Kuryer sahifalari
  {
    path: 'curier',
    canActivate: [curierGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'profile', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/curier/curier-dashboard/curier-dashboard.component').then(m => m.CurierDashboardComponent)
      },
      {
        path: 'deliveries',
        loadComponent: () => import('./features/curier/curier-deliveries/curier-deliveries.component').then(m => m.CurierDeliveriesComponent)
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./features/curier/curier-deliveries/curier-deliveries.component').then(m => m.CurierDeliveriesComponent)
      }
    ]
  },
  {
    path: 'become-curier',
    loadComponent: () => import('./features/curier/curier-apply/curier-apply.component').then(m => m.CurierApplyComponent),
    canActivate: [customerGuard]
  },
  // Admin kuryer sahifalari
  {
    path: 'admin/curiers',
    loadComponent: () => import('./features/admin/admin-curiers/admin-curiers.component').then(m => m.AdminCuriersComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/curiers/:id',
    loadComponent: () => import('./features/admin/admin-curiers/admin-curiers.component').then(m => m.AdminCuriersComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/comments',
    loadComponent: () => import('./features/admin/branch-comments/branch-comments.component').then(m => m.BranchCommentsComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/cash',
    loadComponent: () => import('./features/admin/admin-cash/admin-cash.component').then(m => m.AdminCashComponent),
    canActivate: [cashAdminGuard]
  },
  {
    path: '**',
    redirectTo: 'products'
  }
];
