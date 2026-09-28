# OnlineShop — Angular Frontend Loyihasi Hujjati

> Ushbu hujjat **OnlineShop** (.NET 8 Web API, PostgreSQL, Clean Architecture) backend tizimiga ulangan zamonaviy **Angular 19 Standalone** frontend ilovasining to'liq arxitekturasi, modullari va yo'riqnomasini o'z ichiga oladi. Keyingi sessiyalarda loyihani tezkor tanib olish va rivojlantirish uchun asos hisoblanadi.

---

## 1. Joylashuv va Texnik Xarakteristikalar

- **Asosiy papka (Workspace):** `C:\Users\Asus\OnlineShop-Frontend`
- **Backend bilan yonma-yon papka (Junction):** `D:\.Net loyihalar\OnlineShop\OnlineShop-Frontend`
- **Frontend Stack:** Angular 19 (Standalone Components, Signals, Reactive Forms)
- **Backend API:** `http://localhost:5099` (Swagger: `http://localhost:5099/swagger`)
- **Backend loyihasi:** `D:\.Net loyihalar\OnlineShop` (.NET 8 Web API, PostgreSQL)
- **Node.js versiyasi:** `v24.12.0`
- **Paket menejeri:** `npm`

---

## 2. Loyihani Ishga Tushirish Buyruqlari

```bash
# Frontend papkasiga o'tish
cd "C:\Users\Asus\OnlineShop-Frontend"
# yoki
cd "D:\.Net loyihalar\OnlineShop\OnlineShop-Frontend"

# Development serverni ishga tushirish (http://localhost:4200)
npm start
# yoki npx ng serve

# Production build qilish (tekshirish)
npm run build
```

---

## 3. Papka Strukturasi

```
src/
├── environments/
│   ├── environment.ts                # Production sozlamalari (apiUrl: http://localhost:5099)
│   └── environment.development.ts    # Dev sozlamalari
├── app/
│   ├── core/
│   │   ├── interceptors/
│   │   │   └── http-error.interceptor.ts   # Xatoliklarni ushlab, foydalanuvchiga toast ko'rsatish
│   │   ├── models/                         # Backend DTO va Entity tiplari
│   │   │   ├── response.model.ts           # ResponseModel<T> va unwrapResult yordamchisi
│   │   │   ├── product.model.ts            # Product, CreateProductDto, UpdateProductDto
│   │   │   ├── category.model.ts           # Category, CreateCategoryDto, UpdateCategoryDto
│   │   │   ├── cart.model.ts               # Cart, CartItem, CreateCartDto
│   │   │   ├── order.model.ts              # Order, OrderItem, OrderStatus enum
│   │   │   ├── comment.model.ts            # Comment, CreateCommentDto, UpdateCommentDto
│   │   │   ├── customer.model.ts           # Customer, CreateCustomerDto, UpdateCustomerDto
│   │   │   ├── company.model.ts            # Company, CreateCompanyDto, UpdateCompanyDto
│   │   │   ├── company-branch.model.ts     # CompanyBranch, Create/Update Branch DTO
│   │   │   └── payment.model.ts            # PaymentStatus, Payment
│   │   └── services/
│   │       ├── product.service.ts          # /Product CRUD API
│   │       ├── category.service.ts         # /Category CRUD API
│   │       ├── cart.service.ts             # /Cart API + Signals reactive state
│   │       ├── order.service.ts            # /Order API (create, cancel, get, updateStatus)
│   │       ├── comment.service.ts          # /Comment API (get, create, rating)
│   │       ├── company.service.ts          # /Company va /CompanyBranch API
│   │       ├── customer.service.ts         # /Customer API
│   │       ├── auth-state.service.ts       # Faol mijoz ID va Admin rejimini boshqarish
│   │       └── notification.service.ts     # Reaktiv Toast xabarnomalar xizmati
│   ├── layout/
│   │   ├── navbar/                         # Asosiy navigatsiya, faol mijoz tanlagich, admin tugmasi, savat hisoblagichi
│   │   └── footer/                         # Footer va foydali havolalar
│   ├── shared/
│   │   └── components/
│   │       ├── toast/                      # Xabarnoma bildirishnomalari (Success/Error/Warning)
│   │       ├── status-badge/               # Buyurtma statuslari uchun rangli belgilar
│   │       ├── star-rating/                # 1-5 yulduzli interaktiv reyting
│   │       ├── loading-spinner/            # Animatsiyali yuklanish ko'rsatkichi
│   │       └── empty-state/                # Ma'lumot topilmagan holatlar UI
│   └── features/
│       ├── products/
│       │   ├── product-list/               # Mahsulotlar kartochkalari, qidiruv, saralash, filtr
│       │   ├── product-detail/             # Mahsulot sahifasi + Sharhlar (Comments) + Reyting
│       │   └── product-form-modal/         # Mahsulot yaratish / tahrirlash modal formasi
│       ├── cart/
│       │   └── cart-view/                  # Savat jadvali, miqdor o'zgartirish, filial tanlash, checkout
│       ├── orders/
│       │   └── orders-list/                # Mening buyurtmalarim va Barcha buyurtmalar (Admin) filtrlari
│       ├── categories/
│       │   └── category-list/              # Kategoriyalar jadvali va CRUD formasi
│       ├── companies/
│       │   └── company-list/               # Kompaniyalar va ularning filiallari daraxti
│       ├── customers/
│       │   └── customer-list/              # Mijozlar ro'yxati, profil yaratish, faol sessiyani o'zgartirish
│       └── placeholders/
│           └── placeholder.component.ts    # To'lovlar (Payment) va OrderItem skeleton sahifalari
```

---

## 4. Bajarilgan Asosiy Talablar va Imkoniyatlar

1. **Standalone & Lazy-Loaded Routing:**
   - Har bir feature modul `loadComponent` orqali alohida lazy-chunk holatida yuklanadi.
2. **Reaktiv Davlat Boshqaruvi (Signals):**
   - Savat elementlari soni (`cartCount`), hozirgi savat, faol tanlangan mijoz (`currentCustomerId`) va admin rejimi (`isAdminMode`) Angular Signals orqali boshqariladi.
3. **Savat va Buyurtma Oqimi (Cart -> Order):**
   - Mahsulot sahifasi yoki katalogdan savatga qo'shiladi (`/Cart/AddItemtoCart`).
   - Savat sahifasida miqdor oshiriladi/kamaytiriladi (`/Cart/Update`) yoki olib tashlanadi (`/Cart/RemoveItemfromCart`).
   - Buyurtma berish tugmasi bosilganda mavjud filiallar (`CompanyBranch`) ko'rsatiladi va tanlangan filial bo'yicha `OrderService.createOrder` chaqiriladi.
   - Buyurtma yaratilgach avtomatik ravishda `/orders` sahifasiga o'tib, buyurtma holati ko'rsatiladi.
4. **Sharhlar va Reyting (Comment & StarRating):**
   - Mahsulot sahifasida sharhlar ro'yxati, o'rtacha yulduzli reyting va yangi sharh qoldirish formasi joylashtirilgan.
   - Foydalanuvchi `ProductId`ni qo'lda kiritmaydi — URL kontekstidan olinadi.
5. **Buyurtma Holati va Bekor Qilish Himoyasi:**
   - Rangli `StatusBadge` (Pending, Confirmed, Shipped, Delivered, Cancelled).
   - "Bekor qilish" (Cancel) tugmasi faqat `Pending` yoki `Confirmed` bo'lganda ko'rinadi.
   - Bosilganda tugma darhol disable qilinadi (backenddagi ombor ko'payib ketish xatosini oldini olish uchun bir martalik bosish himoyasi).
6. **Xatoliklarni Uslovchi Interceptor:**
   - Server bilan aloqa uzilsa yoki backend 400/404/500 qaytarsa, chiroyli toast xabari chiqadi.
7. **To'lovlar va OrderItem Skeleton:**
   - Backendda hali tugallanmagan modullar uchun tushunarli axborot sahifalari qoldirilgan.

---

## 5. Backend Bilan Bog'liq Eslatmalar

- Backend API porti: `http://localhost:5099`. Backend ishga tushirilgach, frontend barcha so'rovlarni avtomatik shu manzilga yuboradi.
- Backend javoblari ba'zida to'g'ridan-to'g'ri obyekt, ba'zida `ResponseModel<T>` formatida qaytadi. Frontenddagi `unwrapResult<T>` yordamchisi har ikki holatni ham xatosiz qabul qiladi.
