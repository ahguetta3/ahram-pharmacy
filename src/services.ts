import { collection, doc, addDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Shift, Expense, Transfer } from './types';

// ── Shifts ──────────────────────────────────────────────────────────────

export async function getCurrentShift(): Promise<Shift | null> {
  const snap = await getDocs(query(collection(db, 'shifts'), where('status', '==', 'Open')));
  if (snap.empty) return null;
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
  list.sort((a, b) => b.startTime.localeCompare(a.startTime));
  return list[0];
}

export async function getLastClosedShift(): Promise<Shift | null> {
  const snap = await getDocs(query(collection(db, 'shifts'), where('status', '==', 'Closed')));
  if (snap.empty) return null;
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
  list.sort((a, b) => (b.endTime || '').localeCompare(a.endTime || ''));
  return list[0];
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
  const snap = await getDocs(query(collection(db, 'shifts'), where('status', '==', 'Closed')));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
  list.sort((a, b) => (b.endTime || '').localeCompare(a.endTime || ''));
  return list.slice(0, 30);
}

// ── Expenses ─────────────────────────────────────────────────────────────

export async function addExpense(data: Record<string, any>): Promise<void> {
  // نحذف أي قيمة undefined قبل الحفظ
  const clean: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (data[key] !== undefined && data[key] !== null) {
      clean[key] = data[key];
    }
  }
  clean.timestamp = new Date().toISOString();
  await addDoc(collection(db, 'expenses'), clean);
}

export async function getExpenses(shiftId: string): Promise<Expense[]> {
  const snap = await getDocs(query(collection(db, 'expenses'), where('shiftId', '==', shiftId)));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return list;
}

export async function getMonthlyExpenses(): Promise<Expense[]> {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const snap = await getDocs(collection(db, 'expenses'));
  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Expense))
    .filter(e => e.timestamp >= start);
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return list;
}

// ── Transfers ─────────────────────────────────────────────────────────────

export async function addTransfer(data: Omit<Transfer, 'id' | 'timestamp'>): Promise<void> {
  await addDoc(collection(db, 'transfers'), { ...data, timestamp: new Date().toISOString() });
}

export async function getTransfers(shiftId: string): Promise<Transfer[]> {
  const snap = await getDocs(query(collection(db, 'transfers'), where('shiftId', '==', shiftId)));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transfer));
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return list;
}
