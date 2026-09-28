export interface Category {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
}

export interface CreateCategoryDto {
  title: string;
  description: string;
  isActive: boolean;
}

export interface UpdateCategoryDto {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
}
