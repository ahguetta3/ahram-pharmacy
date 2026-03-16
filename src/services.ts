import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, limit, Timestamp, getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Shift, Expense, Transfer } from './types';

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function getCurrentShift(): Promise<Shift | null> {
  const q = query(
    collection(db, 'shifts'),
    where('status', '==', 'Open'),
    orderBy('startTime', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Shift;
}

export async function getLastClosedShift(): Promise<Shift | null> {
  const q = query(
    collection(db, 'shifts'),
    where('status', '==', 'Closed'),
    orderBy('endTime', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Shift;
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
    where('status', '==', 'Closed'),
    orderBy('endTime', 'desc'),
    limit(30)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function addExpense(data: Omit<Expense, 'id' | 'timestamp'>): Promise<void> {
  await addDoc(collection(db, 'expenses'), {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

export async function getExpenses(shiftId: string): Promise<Expense[]> {
  const q = query(
    collection(db, 'expenses'),
    where('shiftId', '==', shiftId),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
}

export async function getMonthlyExpenses(): Promise<Expense[]> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const q = query(
    collection(db, 'expenses'),
    where('timestamp', '>=', startOfMonth),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
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
    where('shiftId', '==', shiftId),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Transfer));
}
