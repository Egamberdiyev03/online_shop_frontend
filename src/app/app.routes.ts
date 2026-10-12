import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { Routes } from '@angular/router';
import { customerGuard, superAdminGuard, adminGuard, authGuard, branchDetailGuard, analyticsGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'products'
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent)
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/products/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart-view/cart-view.component').then(m => m.CartViewComponent),
    canActivate: [customerGuard]
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders-list/orders-list.component').then(m => m.OrdersListComponent)
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
    path: 'payments',
    loadComponent: () => import('./features/payments/customer-payments-list/customer-payments-list.component').then(m => m.CustomerPaymentsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'payments/:id',
    loadComponent: () => import('./features/payments/payment-detail/payment-detail.component').then(m => m.PaymentDetailComponent),
    canActivate: [authGuard]
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
    data: { type: 'order-items' }
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
  {
    path: '**',
    redirectTo: 'products'
  }
];
