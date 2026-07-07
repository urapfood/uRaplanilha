import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { Product, Tax, FixedCost, Recipe, Sale, SupplierItem } from './types';

// Config retrieved from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCYmBFzAI-XS5Rcql8hoWkQr4USzhAw9FE",
  authDomain: "gen-lang-client-0519534609.firebaseapp.com",
  projectId: "gen-lang-client-0519534609",
  storageBucket: "gen-lang-client-0519534609.firebasestorage.app",
  messagingSenderId: "898814618582",
  appId: "1:898814618582:web:ef3d8068d2359410581277"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId and ignoreUndefinedProperties set to true
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, "ai-studio-uraplanilha-741ff4b7-b1bc-4061-b7a0-10c40904ee5f");

// Initialize Auth
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper functions for collection synchronizations

/**
 * Sync products in real-time from Firestore for a specific user
 */
export function subscribeToProducts(userId: string, callback: (products: Product[]) => void) {
  const colRef = collection(db, 'users', userId, 'products');
  return onSnapshot(colRef, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    callback(products);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/products`);
  });
}

/**
 * Save or update a product in Firestore for a specific user
 */
export async function saveProduct(userId: string, product: Product) {
  try {
    const docRef = doc(db, 'users', userId, 'products', product.id);
    await setDoc(docRef, product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/products/${product.id}`);
  }
}

/**
 * Delete a product from Firestore for a specific user
 */
export async function deleteProduct(userId: string, productId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/products/${productId}`);
  }
}

/**
 * Sync taxes in real-time from Firestore for a specific user
 */
export function subscribeToTaxes(userId: string, callback: (taxes: Tax[]) => void) {
  const colRef = collection(db, 'users', userId, 'taxes');
  return onSnapshot(colRef, (snapshot) => {
    const taxes: Tax[] = [];
    snapshot.forEach((doc) => {
      taxes.push({ id: doc.id, ...doc.data() } as Tax);
    });
    callback(taxes);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/taxes`);
  });
}

/**
 * Save or update a tax in Firestore for a specific user
 */
export async function saveTax(userId: string, tax: Tax) {
  try {
    const docRef = doc(db, 'users', userId, 'taxes', tax.id);
    await setDoc(docRef, tax);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/taxes/${tax.id}`);
  }
}

/**
 * Delete a tax from Firestore for a specific user
 */
export async function deleteTax(userId: string, taxId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'taxes', taxId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/taxes/${taxId}`);
  }
}

/**
 * Sync fixed costs in real-time from Firestore for a specific user
 */
export function subscribeToFixedCosts(userId: string, callback: (fixedCosts: FixedCost[]) => void) {
  const colRef = collection(db, 'users', userId, 'fixedCosts');
  return onSnapshot(colRef, (snapshot) => {
    const fixedCosts: FixedCost[] = [];
    snapshot.forEach((doc) => {
      fixedCosts.push({ id: doc.id, ...doc.data() } as FixedCost);
    });
    callback(fixedCosts);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/fixedCosts`);
  });
}

/**
 * Save or update a fixed cost in Firestore for a specific user
 */
export async function saveFixedCost(userId: string, fixedCost: FixedCost) {
  try {
    const docRef = doc(db, 'users', userId, 'fixedCosts', fixedCost.id);
    await setDoc(docRef, fixedCost);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/fixedCosts/${fixedCost.id}`);
  }
}

/**
 * Delete a fixed cost from Firestore for a specific user
 */
export async function deleteFixedCost(userId: string, fixedCostId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'fixedCosts', fixedCostId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/fixedCosts/${fixedCostId}`);
  }
}

/**
 * Sync recipes in real-time from Firestore for a specific user
 */
export function subscribeToRecipes(userId: string, callback: (recipes: Recipe[]) => void) {
  const colRef = collection(db, 'users', userId, 'recipes');
  return onSnapshot(colRef, (snapshot) => {
    const recipes: Recipe[] = [];
    snapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() } as Recipe);
    });
    callback(recipes);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/recipes`);
  });
}

/**
 * Save or update a recipe in Firestore for a specific user
 */
export async function saveRecipe(userId: string, recipe: Recipe) {
  try {
    const docRef = doc(db, 'users', userId, 'recipes', recipe.id);
    await setDoc(docRef, recipe);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/recipes/${recipe.id}`);
  }
}

/**
 * Delete a recipe from Firestore for a specific user
 */
export async function deleteRecipe(userId: string, recipeId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'recipes', recipeId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/recipes/${recipeId}`);
  }
}

/**
 * Sync sales in real-time from Firestore for a specific user
 */
export function subscribeToSales(userId: string, callback: (sales: Sale[]) => void) {
  const colRef = collection(db, 'users', userId, 'sales');
  return onSnapshot(colRef, (snapshot) => {
    const sales: Sale[] = [];
    snapshot.forEach((doc) => {
      sales.push({ id: doc.id, ...doc.data() } as Sale);
    });
    // Sort sales by date descending
    sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(sales);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/sales`);
  });
}

/**
 * Save a sale in Firestore for a specific user
 */
export async function saveSale(userId: string, sale: Sale) {
  try {
    const docRef = doc(db, 'users', userId, 'sales', sale.id);
    await setDoc(docRef, sale);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/sales/${sale.id}`);
  }
}

/**
 * Delete a sale from Firestore for a specific user
 */
export async function deleteSale(userId: string, saleId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'sales', saleId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/sales/${saleId}`);
  }
}

/**
 * Sync suppliers in real-time from Firestore for a specific user
 */
export function subscribeToSuppliers(userId: string, callback: (suppliers: SupplierItem[]) => void) {
  const colRef = collection(db, 'users', userId, 'suppliers');
  return onSnapshot(colRef, (snapshot) => {
    const suppliers: SupplierItem[] = [];
    snapshot.forEach((doc) => {
      suppliers.push({ id: doc.id, ...doc.data() } as SupplierItem);
    });
    callback(suppliers);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/suppliers`);
  });
}

/**
 * Save or update a supplier item in Firestore for a specific user
 */
export async function saveSupplier(userId: string, supplier: SupplierItem) {
  try {
    const docRef = doc(db, 'users', userId, 'suppliers', supplier.id);
    await setDoc(docRef, supplier);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/suppliers/${supplier.id}`);
  }
}

/**
 * Delete a supplier item from Firestore for a specific user
 */
export async function deleteSupplier(userId: string, supplierId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'suppliers', supplierId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/suppliers/${supplierId}`);
  }
}

