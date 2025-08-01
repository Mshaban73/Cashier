
export enum TransactionType {
  INCOME = 'ايراد',
  EXPENSE = 'مصروف',
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
}

export interface CashDenomination {
  value: number;
  count: number;
}

export interface CustomerTransaction {
  id: string;
  date: string;
  description: string;
  amount: number; // Positive for new debt, negative for payment
}

export interface Customer {
  id:string;
  name: string;
  transactions: CustomerTransaction[];
}

export interface DailyShippingRecord {
  date: string; // YYYY-MM-DD
  payments: {
    fawry: number;
    instapay: number;
    cards: number;
    aman: number;
    bedayti: number;
    cash: number;
    masary: number;
  };
  cashDetails: CashDenomination[];
  receivables: number;
}
