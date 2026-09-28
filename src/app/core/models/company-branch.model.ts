export interface CompanyBranch {
  id: number;
  name: string;
  phoneNumber: string;
  address: string;
  location: string;
  companyId: number;
}

export interface CreateCompanyBranchDto {
  name: string;
  phoneNumber: string;
  address: string;
  companyId: number;
  location: string;
}

export interface UpdateCompanyBranchDto {
  id: number;
  name: string;
  phoneNumber: string;
  address: string;
  location: string;
  companyId: number;
}
