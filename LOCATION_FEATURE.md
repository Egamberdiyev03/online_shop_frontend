# Lokatsiyalar Funksiyasi

**Sana:** 2026-10-05
**Kutubxona:** Leaflet (bepul, API key shart emas)

---

## QILINGAN ISHLAR

### 1. Leaflet O'rnatish
```bash
npm install leaflet
npm install --save-dev @types/leaflet
```
- `angular.json` da CSS qo'shildi

### 2. Modellar Yangilandi
- **CompanyBranch**: `latitude`, `longitude` qo'shildi
- **Order**: `deliveryAddress`, `deliveryLatitude`, `deliveryLongitude` qo'shildi

### 3. Yangi Servislar
- `src/app/core/services/map.service.ts` - Xarita bilan ishlash uchun

### 4. Yangi Komponentlar
- `src/app/shared/components/map-view/` - Filiallarni xaritada ko'rsatish
- `src/app/shared/components/location-picker/` - Yetkazish manzilini tanlash

### 5. Yangi Sahifalar
- `/map` - Barcha filiallar xaritasi (`src/app/features/map/branches-map/`)

### 6. Yangilangan Sahifalar
- **branch-detail** - Mini xarita qo'shildi (koordinatalar bo'lsa)
- **cart-view** - Yetkazish manzilini xaritadan tanlash
- **navbar** - "Xarita" havolasi qo'shildi
- **company-detail** - Filial yaratish/tahrirlash formada koordinata tanlash qo'shildi

---

## FOYDALANISH

### Filial koordinatalarini kiritish (Admin)
1. Kompaniya sahifasiga o'ting (`/companies/:id`)
2. "Yangi Filial Qo'shish" yoki "Tahrirlash" tugmasini bosing
3. Formada "Xaritadan tanlash" tugmasini bosing
4. Xaritada filial joylashuvini belgilang (xaritada bosish orqali)
5. "Mening joylashuvim" tugmasi orqali hozirgi joylashuvni ham tanlash mumkin
6. "Tasdiqlash" tugmasini bosing
7. Formani saqlang

### Xaritada filiallarni ko'rish
1. Navbarda "Xarita" havolasini bosing
2. Chap panelda filiallar ro'yxati
3. Filial ustiga bossangiz - xaritada ko'rsatiladi

### Buyurtmada yetkazish manzili
1. Savatga o'ting
2. "Xaritadan tanlash" tugmasini bosing
3. Xaritada joy tanlang (bosish orqali)
4. Manzil matnini kiriting
5. "Tasdiqlash" tugmasini bosing

### Filial sahifasida xarita
- Agar filialda koordinatalar bo'lsa, mini xarita ko'rinadi
- "Barcha filiallar" havolasi orqali umumiy xaritaga o'tish mumkin

---

## HOZIRGI HOLAT (2026-10-05)

**Frontend tayyor**, lekin **Backend yangilanmagan**.

### Muammo:
- Filial yaratish/tahrirlashda koordinatalar frontend dan yuborilmoqda
- Lekin backend `Latitude` va `Longitude` maydonlarini qabul qilmayapti
- Shuning uchun xaritada filiallar ko'rinmayapti

### Debug uchun:
- Brauzer konsolida (F12 > Console) `[CreateBranch]` va `[BranchesMap]` loglar bor
- Bu loglar orqali nima yuborilayotgani va nima qaytayotganini ko'rish mumkin

---

## BACKEND TALABLARI

Backend da quyidagi o'zgarishlar kerak:

### CompanyBranch Entity
```csharp
public double? Latitude { get; set; }
public double? Longitude { get; set; }
```

### Order Entity
```csharp
public string? DeliveryAddress { get; set; }
public double? DeliveryLatitude { get; set; }
public double? DeliveryLongitude { get; set; }
```

### Order/Create Endpoint
Yangi parametrlarni qabul qilish:
- `deliveryAddress` (string, optional)
- `deliveryLatitude` (double, optional)
- `deliveryLongitude` (double, optional)

### Migration
```bash
dotnet ef migrations add AddLocationFields
dotnet ef database update
```

---

## FAYL RO'YXATI

| Fayl | Turi |
|------|------|
| `angular.json` | Yangilandi (CSS) |
| `package.json` | Yangilandi (leaflet) |
| `app.routes.ts` | Yangilandi (/map route) |
| `company-branch.model.ts` | Yangilandi (lat/lng) |
| `order.model.ts` | Yangilandi (delivery fields) |
| `order.service.ts` | Yangilandi (createOrder params) |
| `map.service.ts` | **YANGI** |
| `map-view.component.ts` | **YANGI** |
| `location-picker.component.ts` | **YANGI** |
| `branches-map.component.ts` | **YANGI** |
| `branch-detail.component.ts` | Yangilandi (mini xarita) |
| `cart-view.component.ts` | Yangilandi (lokatsiya tanlash) |
| `navbar.component.ts` | Yangilandi (Xarita link) |
| `company-detail.component.ts` | Yangilandi (filial formada koordinata tanlash) |

---

## TOSHKENT KOORDINATALARI (Default)
```
Latitude: 41.2995
Longitude: 69.2401
```

---

## TEST QILISH

1. `/map` sahifasini oching - xarita ko'rinishi kerak
2. Filial ustiga bosing - popup chiqishi kerak
3. `/cart` da "Xaritadan tanlash" tugmasini bosing
4. Xaritada joy tanlang va tasdiqlang
5. Yetkazish manzili saqlangan bo'lishi kerak
