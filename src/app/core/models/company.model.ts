export interface Company {
  id: number;
  name: string;
  phoneNumber: string;
  inn: string;
  address: string;
}

export interface CreateCompanyDto {
  name: string;
  phoneNumber: string;
  inn: string;
  address: string;
}

export interface UpdateCompanyDto {
  id: number;
  name: string;
  phoneNumber: string;
  inn: string;
  address: string;
}
