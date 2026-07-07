import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { Product, Tax, FixedCost, Recipe, Sale } from './types';

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

// Initialize Firestore with custom databaseId from configuration
export const db = getFirestore(app, "ai-studio-uraplanilha-741ff4b7-b1bc-4061-b7a0-10c40904ee5f");

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
 * Sync products in real-time from Firestore
 */
export function subscribeToProducts(callback: (products: Product[]) => void) {
  const colRef = collection(db, 'products');
  return onSnapshot(colRef, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    callback(products);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'products');
  });
}

/**
 * Save or update a product in Firestore
 */
export async function saveProduct(product: Product) {
  try {
    const docRef = doc(db, 'products', product.id);
    await setDoc(docRef, product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

/**
 * Delete a product from Firestore
 */
export async function deleteProduct(productId: string) {
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}

/**
 * Sync taxes in real-time from Firestore
 */
export function subscribeToTaxes(callback: (taxes: Tax[]) => void) {
  const colRef = collection(db, 'taxes');
  return onSnapshot(colRef, (snapshot) => {
    const taxes: Tax[] = [];
    snapshot.forEach((doc) => {
      taxes.push({ id: doc.id, ...doc.data() } as Tax);
    });
    callback(taxes);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'taxes');
  });
}

/**
 * Save or update a tax in Firestore
 */
export async function saveTax(tax: Tax) {
  try {
    const docRef = doc(db, 'taxes', tax.id);
    await setDoc(docRef, tax);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `taxes/${tax.id}`);
  }
}

/**
 * Delete a tax from Firestore
 */
export async function deleteTax(taxId: string) {
  try {
    const docRef = doc(db, 'taxes', taxId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `taxes/${taxId}`);
  }
}

/**
 * Sync fixed costs in real-time from Firestore
 */
export function subscribeToFixedCosts(callback: (fixedCosts: FixedCost[]) => void) {
  const colRef = collection(db, 'fixedCosts');
  return onSnapshot(colRef, (snapshot) => {
    const fixedCosts: FixedCost[] = [];
    snapshot.forEach((doc) => {
      fixedCosts.push({ id: doc.id, ...doc.data() } as FixedCost);
    });
    callback(fixedCosts);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'fixedCosts');
  });
}

/**
 * Save or update a fixed cost in Firestore
 */
export async function saveFixedCost(fixedCost: FixedCost) {
  try {
    const docRef = doc(db, 'fixedCosts', fixedCost.id);
    await setDoc(docRef, fixedCost);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `fixedCosts/${fixedCost.id}`);
  }
}

/**
 * Delete a fixed cost from Firestore
 */
export async function deleteFixedCost(fixedCostId: string) {
  try {
    const docRef = doc(db, 'fixedCosts', fixedCostId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `fixedCosts/${fixedCostId}`);
  }
}

/**
 * Sync recipes in real-time from Firestore
 */
export function subscribeToRecipes(callback: (recipes: Recipe[]) => void) {
  const colRef = collection(db, 'recipes');
  return onSnapshot(colRef, (snapshot) => {
    const recipes: Recipe[] = [];
    snapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() } as Recipe);
    });
    callback(recipes);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'recipes');
  });
}

/**
 * Save or update a recipe in Firestore
 */
export async function saveRecipe(recipe: Recipe) {
  try {
    const docRef = doc(db, 'recipes', recipe.id);
    await setDoc(docRef, recipe);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `recipes/${recipe.id}`);
  }
}

/**
 * Delete a recipe from Firestore
 */
export async function deleteRecipe(recipeId: string) {
  try {
    const docRef = doc(db, 'recipes', recipeId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `recipes/${recipeId}`);
  }
}

/**
 * Sync sales in real-time from Firestore
 */
export function subscribeToSales(callback: (sales: Sale[]) => void) {
  const colRef = collection(db, 'sales');
  return onSnapshot(colRef, (snapshot) => {
    const sales: Sale[] = [];
    snapshot.forEach((doc) => {
      sales.push({ id: doc.id, ...doc.data() } as Sale);
    });
    // Sort sales by date descending
    sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(sales);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'sales');
  });
}

/**
 * Save a sale in Firestore
 */
export async function saveSale(sale: Sale) {
  try {
    const docRef = doc(db, 'sales', sale.id);
    await setDoc(docRef, sale);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sales/${sale.id}`);
  }
}

/**
 * Delete a sale from Firestore
 */
export async function deleteSale(saleId: string) {
  try {
    const docRef = doc(db, 'sales', saleId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `sales/${saleId}`);
  }
}

