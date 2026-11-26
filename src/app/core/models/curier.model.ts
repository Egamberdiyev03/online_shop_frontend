// Curier Models

export enum TransportType {
  Foot = 0,
  Car = 1,
  Motorcycle = 2,
  Bicycle = 3
}

export const TransportTypeLabels: Record<any, string> = {
  0: 'Piyoda',
  1: 'Avtomobil',
  2: 'Mototsikl',
  3: 'Velosiped',
  'Foot': 'Piyoda',
  'Car': 'Avtomobil',
  'Motorcycle': 'Mototsikl',
  'Bicycle': 'Velosiped'
};

export const TransportTypeIcons: Record<any, string> = {
  0: '🚶',
  1: '🚗',
  2: '🏍️',
  3: '🚴',
  'Foot': '🚶',
  'Car': '🚗',
  'Motorcycle': '🏍️',
  'Bicycle': '🚴'
};

export interface CreateCurierDto {
  vehicleType: TransportType;
  license?: string;
  profilePictureUrl?: string;
}

export interface CurierResponseDto {
  id: number;
  userId: number;
  name: string;
  email: string;
  phoneNumber: string;
  vehicleType: TransportType;
  license?: string;
  profilePictureUrl?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  isOnline: boolean;
}

export interface CurierShortDto {
  id: number;
  name: string;
  phoneNumber: string;
  vehicleType: TransportType;
  profilePictureUrl?: string;
}

export interface UpdateCurierLocationDto {
  latitude: number;
  longitude: number;
}

export interface AssignCurierDto {
  orderId: number;
  curierProfileId: number;
}

export interface CurierCashSummaryDto {
  collected: number;
  handedOver: number;
  debt: number;
}

export interface HandOverCashDto {
  curierProfileId: number;
  companyBranchId: number;
  amount: number;
  note?: string;
}
