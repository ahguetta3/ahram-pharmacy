import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, limit, getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Shift, Expense, Transfer } from './types';

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function getCurrentShift(): Promise<Shift | null> {
  // فقط where بدون orderBy — لا يحتاج index
  const q = query(
    collection(db, 'shifts'),
    where('status', '==', 'Open')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  // نرتّب محلياً
  const shifts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
  shifts.sort((a, b) => b.startTime.localeCompare(a.startTime));
  return shifts[0];
}

export async function getLastClosedShift(): Promise<Shift | null> {
  const q = query(
    collection(db, 'shifts'),
    where('status', '==', 'Closed')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const shifts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
  shifts.sort((a, b) => (b.endTime || '').localeCompare(a.endTime || ''));
  return shifts[0];
}

export async function startShift(data: Omit<Shift, 'id' | 'status' | 'startTime'>): Promise<string> {
  const ref = await addDoc(collection(db, 'shifts'), {
    ...data,
    status: 'Open',
    startTime: new Date().toISOString(),
  });
  return ref.id;
}

export async function closeShift(id: string, closing: {
  closedCash: number; closedBankily: number; closedMasrvi: number;
  closedSedad: number; closedBimbank: number;
}) {
  await updateDoc(doc(db, 'shifts', id), {
    ...closing,
    status: 'Closed',
    endTime: new Date().toISOString(),
  });
}

export async function getShiftHistory(): Promise<Shift[]> {
  const q = query(
    collection(db, 'shifts'),
    where('status', '==', 'Closed')
  );
  const snap = await getDocs(q);
  const shifts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
  shifts.sort((a, b) => (b.endTime || '').localeCompare(a.endTime || ''));
  return shifts.slice(0, 30);
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function addExpense(data: Omit<Expense, 'id' | 'timestamp'>): Promise<void> {
  await addDoc(collection(db, 'expenses'), {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

export async function getExpenses(shiftId: string): Promise<Expense[]> {
  // where واحد فقط — لا يحتاج index
  const q = query(
    collection(db, 'expenses'),
    where('shiftId', '==', shiftId)
  );
  const snap = await getDocs(q);
  const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
  expenses.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return expenses;
}

export async function getMonthlyExpenses(): Promise<Expense[]> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  // نجلب كل المصاريف ونفلتر محلياً
  const snap = await getDocs(collection(db, 'expenses'));
  const expenses = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Expense))
    .filter(e => e.timestamp >= startOfMonth);
  expenses.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return expenses;
}

// ─── Transfers ────────────────────────────────────────────────────────────────

export async function addTransfer(data: Omit<Transfer, 'id' | 'timestamp'>): Promise<void> {
  await addDoc(collection(db, 'transfers'), {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

export async function getTransfers(shiftId: string): Promise<Transfer[]> {
  const q = query(
    collection(db, 'transfers'),
    where('shiftId', '==', shiftId)
  );
  const snap = await getDocs(q);
  const transfers = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transfer));
  transfers.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return transfers;
}
