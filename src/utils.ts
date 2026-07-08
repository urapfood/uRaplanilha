import { Product, Tax, SupplierItem } from './types';

// Formatting utilities
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export interface UnitParsedInfo {
  baseUnit: 'weight' | 'volume' | 'units' | 'other';
  supplierBaseQty: number;
  userUnitLabel: string;
  displayInstruction: string;
}

export function parseSupplierUnitAndQty(unit: string): UnitParsedInfo {
  if (!unit) {
    return {
      baseUnit: 'other',
      supplierBaseQty: 1,
      userUnitLabel: 'un',
      displayInstruction: 'Digite a quantidade'
    };
  }
  const norm = unit.toLowerCase().trim();
  
  // 1. Weight (kg)
  if (norm === 'kg' || norm === 'quilo' || norm === 'kilo' || norm === 'quilograma' || norm === 'kgs') {
    return {
      baseUnit: 'weight',
      supplierBaseQty: 1000,
      userUnitLabel: 'g',
      displayInstruction: 'Digite em gramas (g)'
    };
  }
  
  // 2. Volume (L)
  if (norm === 'l' || norm === 'litro' || norm === 'litros' || norm === 'ls') {
    return {
      baseUnit: 'volume',
      supplierBaseQty: 1000,
      userUnitLabel: 'ml',
      displayInstruction: 'Digite em mililitros (ml)'
    };
  }

  // 3. Units with numbers (e.g. 30un, 30und, 50 unidades, 10 un)
  if (norm.includes('un') || norm.includes('und') || norm.includes('uni') || norm.includes('unid')) {
    const numMatch = norm.match(/(\d+)/);
    if (numMatch) {
      const qty = parseInt(numMatch[1], 10);
      return {
        baseUnit: 'units',
        supplierBaseQty: qty,
        userUnitLabel: 'un',
        displayInstruction: `Digite em unidades (un de ${qty})`
      };
    }
    return {
      baseUnit: 'units',
      supplierBaseQty: 1,
      userUnitLabel: 'un',
      displayInstruction: 'Digite em unidades (un)'
    };
  }

  // 4. Grams packages (e.g. 500g, 200g, 400g)
  if (norm.endsWith('g') || norm.includes('grama') || norm.includes('gramas')) {
    const numMatch = norm.match(/(\d+)/);
    if (numMatch) {
      const qty = parseInt(numMatch[1], 10);
      return {
        baseUnit: 'weight',
        supplierBaseQty: qty,
        userUnitLabel: 'g',
        displayInstruction: `Digite em gramas (g de ${qty}g)`
      };
    }
  }

  // 5. Milliliters packages (e.g. 350ml, 500ml)
  if (norm.includes('ml') || norm.includes('mililitro') || norm.includes('mililitros')) {
    const numMatch = norm.match(/(\d+)/);
    if (numMatch) {
      const qty = parseInt(numMatch[1], 10);
      return {
        baseUnit: 'volume',
        supplierBaseQty: qty,
        userUnitLabel: 'ml',
        displayInstruction: `Digite em mililitros (ml de ${qty}ml)`
      };
    }
  }

  // Default fallback (no conversion)
  return {
    baseUnit: 'other',
    supplierBaseQty: 1,
    userUnitLabel: unit,
    displayInstruction: `Digite a quantidade em ${unit}`
  };
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
