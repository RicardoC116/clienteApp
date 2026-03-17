// src/types/index.ts
export interface Deudor {
  id: number;
  contract_number: string;
  name: string;
  amount: string; // viene como string "5000.00"
  total_to_pay: string;
  first_payment: string;
  balance: string;
  numero_telefono?: string;
  suggested_payment?: string;
  collector_id: number;
  payment_type: string; // ej: "semanal"
  renovaciones: number;
  contract_end_date?: string | null;
  aval?: string | null;
  aval_phone?: string | null;
  direccion?: string | null;
  aval_direccion?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Cobro {
  id: number;
  amount: string;
  payment_date: string;
  payment_type: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  debtorId: number | null;
  contractNumber: string | null;
}
