export interface Ingredient {
  id: string;
  name: string;
  cost: number;
}

export interface SupplierItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  supplierName?: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  sellingPrice: number;
  costType: 'single' | 'detailed';
  singleCost: number;
  packagingCost?: number; // New field for packaging cost
  ingredients: Ingredient[];
  estimatedSales: number;
  notes?: string;
}

export interface Tax {
  id: string;
  name: string;
  percentage: number; // in percentage, e.g. 12 means 12%
  active: boolean;
}

export interface FixedCost {
  id: string;
  name: string;
  monthlyValue: number;
}

export interface Recipe {
  id: string;
  productId?: string; // Links to an existing Product if any
  productName: string;
  portions: number;
  ingredients: string; // List of ingredients (plain text/markdown)
  preparationMethod: string; // Step-by-step directions (plain text/markdown)
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitCost: number;
}

export interface Sale {
  id: string;
  date: string; // ISO String
  items: SaleItem[];
  discount: number; // Value in R$
  paymentMethod: 'money' | 'card' | 'pix' | 'other';
  totalAmount: number; // Final client price
  totalCost: number; // Total ingredients cost
  taxesAmount: number; // Taxes paid
  netProfit: number; // profit margin after costs & taxes
}

// Initial default data for uRapFood delivery
export const INITIAL_TAXES: Tax[] = [];

export const INITIAL_FIXED_COSTS: FixedCost[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_RECIPES: Recipe[] = [];

