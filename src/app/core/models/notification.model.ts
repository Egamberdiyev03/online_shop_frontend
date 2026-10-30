export type NotificationType =
  | 'OrderCreated'
  | 'OrderConfirmed'
  | 'OrderReady'
  | 'OrderOnTheWay'
  | 'OrderCompleted'
  | 'OrderCancelled'
  | 'NewBranchOrder'
  | 'CourierAssigned'
  | 'CourierArrived'
  | 'HandoverToCourierReady'
  | 'HandedToCourier'
  | 'CourierIssueReported'
  | 'PaymentSucceeded'
  | 'PaymentFailed'
  | 'PaymentRefunded'
  | 'OrderPreparing'
  | 'OrderCancelledByCustomer'
  | number;

export type NotificationPriority = 'Low' | 'Normal' | 'High' | number;
export type NotificationEntityType = 'Order' | 'Product' | 'Branch' | number;

export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  relatedEntityType?: NotificationEntityType | null;
  relatedEntityId?: number | null;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationRequest {
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType | null;
  entityId?: number | null;
  branchId?: number | null;
  priority?: NotificationPriority;
  link?: string | null;
}

/**
 * Bildirishnoma turiga mos ikonka qaytaruvchi yordamchi funksiya
 */
export function getNotificationIcon(type: NotificationType): string {
  const t = typeof type === 'string' ? type : String(type);
  switch (t) {
    case 'OrderCreated':
    case '1':
      return '🛍️';
    case 'OrderConfirmed':
    case '2':
      return '📋';
    case 'OrderPreparing':
    case '16':
      return '🍳';
    case 'OrderReady':
    case '3':
      return '📦';
    case 'OrderOnTheWay':
    case '4':
      return '🚚';
    case 'OrderCompleted':
    case '5':
      return '✅';
    case 'OrderCancelled':
    case 'OrderCancelledByCustomer':
    case '6':
    case '17':
      return '❌';
    case 'NewBranchOrder':
    case '7':
      return '🔔';
    case 'CourierAssigned':
    case 'CourierArrived':
    case 'HandoverToCourierReady':
    case 'HandedToCourier':
    case '8':
    case '9':
    case '10':
    case '11':
      return '🛵';
    case 'PaymentSucceeded':
    case '13':
      return '💳';
    case 'PaymentFailed':
    case '14':
      return '⚠️';
    case 'PaymentRefunded':
    case '15':
      return '💸';
    default:
      return '📢';
  }
}

/**
 * Backenddan kelgan sanani to'g'ri parse qiluvchi yordamchi funksiya.
 * Backend bazaga Toshkent vaqtini (UTC+5) yozib, JSON serializatsiyada unga 'Z' (UTC) qo'shib yuborgan bo'lsa,
 * brauzer unga yana 5 soat qo'shib, kelajakka o'tkazib yubormasligi uchun 'Z' va offsetni tozalaydi.
 */
export function parseNotificationDate(dateStr: string | Date): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;

  if (typeof dateStr === 'string') {
    const cleanStr = dateStr.replace(/Z|[+-]\d{2}(:\d{2})?$/, '');
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  return new Date(dateStr);
}

/**
 * Vaqtni insonbop o'zbekcha formatda ko'rsatuvchi yordamchi funksiya
 */
export function formatNotificationTime(dateStr: string | Date): string {
  if (!dateStr) return '';
  const date = parseNotificationDate(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  // 1 daqiqadan kam vaqt oldin (yoki kichik soat farqi tufayli -60 soniyagacha) bo'lsa
  if (diffSec < 60 && diffSec >= -60) {
    return 'Hozirgina';
  }

  // Agar vaqt baribir kelajakda bo'lib chiqsa
  if (diffSec < -60) {
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${min}`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} daqiqa oldin`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour} soat oldin`;
  }
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return `${diffDay} kun oldin`;
  }

  // Masalan: 29.10.2026 12:30
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d}.${m}.${y} ${h}:${min}`;
}
