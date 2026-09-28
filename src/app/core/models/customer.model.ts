export interface Customer {
  id: number;
  name: string;
  email: string;
  address: string;
  phoneNumber: string;
  location: string;
  createdAt?: string;
}

export interface CreateCustomerDto {
  name: string;
  email: string;
  address: string;
  phoneNumber: string;
  location: string;
}

export interface UpdateCustomerDto {
  id: number;
  name: string;
  email: string;
  address: string;
  phoneNumber: string;
  location: string;
}
