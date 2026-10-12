export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
  location?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ConfirmEmailDto {
  email: string;
  code: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

export interface AuthResponseDto {
  token: string;
  email: string;
  name: string;
  role: 'Customer' | 'BranchManager' | 'CompanyAdmin' | 'SuperAdmin' | string;
  companyId?: number | null;
  companyBranchId?: number | null;
  expiresAt: string;
  userId?: number;
}

export interface DecodedJwtToken {
  nameid?: string;
  sub?: string;
  email?: string;
  role?: string;
  companyId?: string;
  companyBranchId?: string;
  exp?: number;
  iss?: string;
  aud?: string;
  [key: string]: any;
}
