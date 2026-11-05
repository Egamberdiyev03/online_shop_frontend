# OnlineShop-Frontend - Loyiha Hujjati

## Texnologiyalar

| Texnologiya | Versiya |
|-------------|---------|
| Angular | 19.2.0 |
| TypeScript | 5.7.2 |
| Angular CLI | 19.2.1 |
| RxJS | 7.8 |
| SignalR | 10.0.11 |
| Leaflet | 1.9.4 |
| Lucide Angular | 1.0.0 |

## Loyiha Strukturasi

```
src/app/
├── core/                    # Singleton servislar, guardlar, interceptorlar
│   ├── guards/             # auth, admin, customer route himoyasi
│   ├── interceptors/       # HTTP auth & error handling
│   ├── models/             # TypeScript interfeyslari
│   └── services/           # 15+ domen servislari
├── features/               # Feature modullar (lazy-loaded)
│   ├── admin/              # Admin dashboard
│   ├── auth/               # Login, Register, Email tasdiqlash
│   ├── products/           # Mahsulotlar ro'yxati, tafsilotlar
│   ├── cart/               # Savat boshqaruvi
│   ├── orders/             # Buyurtmalar tarixi
│   ├── categories/         # Kategoriya boshqaruvi (SuperAdmin)
│   ├── companies/          # Kompaniya va filial tafsilotlari
│   ├── customers/          # Mijozlar boshqaruvi (SuperAdmin)
│   ├── map/                # Filiallar xaritasi
│   ├── payments/           # To'lov tarixi
│   └── profile/            # Foydalanuvchi profili
├── layout/                 # Navbar, Footer
├── shared/                 # Qayta ishlatiladigan komponentlar
│   └── components/
│       ├── dashboard/      # Statistika va grafik kartalar
│       ├── loading-spinner/
│       ├── status-badge/
│       ├── toast/          # Bildirishnoma tizimi
│       └── map-view/       # Leaflet xarita integratsiyasi
├── app.config.ts           # App konfiguratsiyasi
├── app.routes.ts           # Route ta'riflari
└── app.component.ts        # Root komponent (Telegram WebApp)
```

## Sahifalar va Routelar

### Ommaviy sahifalar
| Route | Tavsif |
|-------|--------|
| `/products` | Mahsulotlar katalogi (filter, qidiruv, pagination) |
| `/products/:id` | Mahsulot tafsilotlari |
| `/companies` | Kompaniyalar ro'yxati |
| `/companies/:id` | Kompaniya profili |
| `/branches/:id` | Filial ma'lumotlari |
| `/map` | Filiallar xaritasi (Leaflet) |
| `/login` | Kirish |
| `/register` | Ro'yxatdan o'tish |
| `/confirm-email` | Email tasdiqlash |

### Mijoz sahifalari
| Route | Tavsif |
|-------|--------|
| `/cart` | Savat |
| `/orders` | Buyurtmalar tarixi |
| `/payments` | To'lovlar tarixi |
| `/profile` | Profil boshqaruvi |

### Admin sahifalari
| Route | Tavsif |
|-------|--------|
| `/admin` | Admin dashboard |
| `/analytics` | Analitika (inventar, sotuvlar) |
| `/categories` | Kategoriyalar (SuperAdmin) |
| `/customers` | Mijozlar (SuperAdmin) |
| `/admin/payments` | To'lovlar boshqaruvi |

## Asosiy Servislar

| Servis | Vazifasi |
|--------|----------|
| `AuthService` | Autentifikatsiya (Register, Login, Telegram) |
| `AuthStateService` | Auth holati va rollar boshqaruvi |
| `ProductService` | Mahsulotlar CRUD + pagination |
| `CartService` | Savat boshqaruvi |
| `OrderService` | Buyurtmalar |
| `PaymentService` | To'lovlar |
| `CategoryService` | Kategoriyalar |
| `CompanyService` | Kompaniya va filiallar |
| `CustomerService` | Mijozlar boshqaruvi |
| `CommentService` | Mahsulot sharhlari |
| `NotificationService` | Toast bildirishnomalari |
| `UserNotificationService` | Real-time (SignalR) |
| `ThemeService` | Dark/Light tema |

## Foydalanuvchi Rollari

| Rol | Huquqlar |
|-----|----------|
| **SuperAdmin** | To'liq boshqaruv (kategoriyalar, mijozlar, kompaniyalar) |
| **CompanyAdmin** | Kompaniya boshqaruvi (filiallar, mahsulotlar) |
| **BranchManager** | Filial boshqaruvi (mahsulotlar, buyurtmalar) |
| **Customer** | Xarid qilish (savat, buyurtma, to'lov) |

## Route Guardlar

- `authGuard` - Autentifikatsiya talab qiladi
- `customerGuard` - Faqat mijozlar
- `adminGuard` - Admin rollar (SuperAdmin, CompanyAdmin, BranchManager)
- `superAdminGuard` - Faqat SuperAdmin
- `analyticsGuard` - Analitika ruxsati
- `branchDetailGuard` - Filial ruxsati

## Arxitektura Xususiyatlari

1. **Standalone Components** - NgModule'siz, Angular 14+ uslubi
2. **Lazy Loading** - Feature routelar alohida yuklash
3. **Signals** - Reaktiv holat boshqaruvi
4. **Server-side Pagination** - 12, 24, 48 sahifa o'lchami
5. **Debounced Search** - 300ms kechikish
6. **URL Query Sync** - Filterlar URL'da saqlanadi
7. **JWT Auth** - Browser storage'da token
8. **HTTP Interceptors** - Auth va Error handling
9. **ResponseModel<T>** - API javoblar wrapper
10. **Dark Theme** - CSS variables orqali

## Backend Integratsiya

- **API URL:** `http://localhost:7000`
- **Auth:** JWT token
- **Format:** JSON (GET/POST/PUT/DELETE)

## Ishga tushirish

```bash
# Dependencies o'rnatish
npm install

# Development server
ng serve

# Production build
ng build --configuration production
```

## Muhim Fayllar

| Fayl | Tavsif |
|------|--------|
| `src/app/app.routes.ts` | Barcha routelar |
| `src/app/app.config.ts` | Provider va interceptorlar |
| `src/app/core/services/` | Barcha servislar |
| `src/app/core/models/` | TypeScript interfeyslari |
| `src/environments/` | Environment konfiguratsiyasi |

---
*Oxirgi yangilanish: 2024*
