import { Product, Tax, SupplierItem } from './types';

// Formatting utilities
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

// Financial calculations
export function getProductCost(product: Product, suppliers?: SupplierItem[]): number {
  let cost = 0;
  if (product.costType === 'single') {
    cost = product.singleCost;
  } else {
    cost = product.ingredients.reduce((sum, item) => {
      if (item.supplierItemId && suppliers && suppliers.length > 0) {
        const sup = suppliers.find((s) => s.id === item.supplierItemId);
        if (sup) {
          return sum + (sup.price * (item.quantityUsed || 1));
        }
      }
      return sum + item.cost;
    }, 0);
  }
  
  if (product.packagingSupplierItemId && suppliers && suppliers.length > 0) {
    const sup = suppliers.find((s) => s.id === product.packagingSupplierItemId);
    if (sup) {
      cost += (sup.price * (product.packagingQuantityUsed || 1));
    } else if (product.packagingCost) {
      cost += product.packagingCost;
    }
  } else if (product.packagingCost) {
    cost += product.packagingCost;
  }
  
  return cost;
}

export function getActiveTaxPercentage(taxes: Tax[]): number {
  return taxes
    .filter((tax) => tax.active)
    .reduce((sum, tax) => sum + tax.percentage, 0);
}

export interface ProductCalculations {
  cost: number;
  taxValue: number;
  grossProfit: number;
  netProfit: number;
  margin: number; // as percentage, e.g. 35.5 means 35.5%
}

export function calculateProductMetrics(
  product: Product,
  activeTaxPercentage: number,
  suppliers?: SupplierItem[]
): ProductCalculations {
  const cost = getProductCost(product, suppliers);
  const taxValue = (product.sellingPrice * activeTaxPercentage) / 100;
  const grossProfit = product.sellingPrice - cost;
  const netProfit = product.sellingPrice - cost - taxValue;
  const margin = product.sellingPrice > 0 ? (netProfit / product.sellingPrice) * 100 : 0;

  return {
    cost,
    taxValue,
    grossProfit,
    netProfit,
    margin,
  };
}
