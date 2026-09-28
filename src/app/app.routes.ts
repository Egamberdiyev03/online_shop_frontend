import { Routes } from '@angular/router';

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
    loadComponent: () => import('./features/cart/cart-view/cart-view.component').then(m => m.CartViewComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders-list/orders-list.component').then(m => m.OrdersListComponent)
  },
  {
    path: 'categories',
    loadComponent: () => import('./features/categories/category-list/category-list.component').then(m => m.CategoryListComponent)
  },
  {
    path: 'companies',
    loadComponent: () => import('./features/companies/company-list/company-list.component').then(m => m.CompanyListComponent)
  },
  {
    path: 'customers',
    loadComponent: () => import('./features/customers/customer-list/customer-list.component').then(m => m.CustomerListComponent)
  },
  {
    path: 'payments',
    loadComponent: () => import('./features/placeholders/placeholder.component').then(m => m.PlaceholderComponent),
    data: { type: 'payments' }
  },
  {
    path: 'order-items',
    loadComponent: () => import('./features/placeholders/placeholder.component').then(m => m.PlaceholderComponent),
    data: { type: 'order-items' }
  },
  {
    path: '**',
    redirectTo: 'products'
  }
];
