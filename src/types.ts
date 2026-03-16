export interface Shift {
  id: string;
  type: 'Morning' | 'Evening';
  startTime: string;
  endTime?: string;
  openingCash: number;
  openingBankily: number;
  openingMasrvi: number;
  openingSedad: number;
  openingBimbank: number;
  closedCash?: number;
  closedBankily?: number;
  closedMasrvi?: number;
  closedSedad?: number;
  closedBimbank?: number;
  status: 'Open' | 'Closed';
}

export interface Expense {
  id: string;
  shiftId: string;
  category: string;
  amount: number;
  source: 'Cash' | 'Digital';
  digitalProvider?: string;
  isFromOpening: boolean;
  description: string;
  timestamp: string;
}

export interface Transfer {
  id: string;
  shiftId: string;
  fromFund: string;
  toFund: string;
  amount: number;
  timestamp: string;
}

export type Fund = 'Cash' | 'Bankily' | 'Masrvi' | 'Sedad' | 'BimBank';
export const ALL_FUNDS: Fund[] = ['Cash', 'Bankily', 'Masrvi', 'Sedad', 'BimBank'];
export const CATEGORIES = ['العامل', 'الغداء', 'الشركة', 'أخرى'];
export const DIGITAL_PROVIDERS: Fund[] = ['Bankily', 'Masrvi', 'Sedad', 'BimBank'];
