import supabase from '../config/database';
import { Gift, GiftInsertData } from '../types';

const SUPABASE_NOT_FOUND_CODE = 'PGRST116';

function normalizeImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl || imageUrl.trim() === '') {
    return undefined;
  }
  return imageUrl.trim().replace(/\s+/g, '').replace(/\n/g, '');
}

export async function getGiftById(giftId: string): Promise<Gift | null> {
  const { data, error } = await supabase
    .from('gifts')
    .select('*')
    .eq('id', giftId)
    .single();

  if (error) {
    if (error.code === SUPABASE_NOT_FOUND_CODE) {
      return null;
    }
    throw new Error(`Erro ao buscar presente no Supabase: ${error.message}`);
  }

  return data as Gift;
}

export async function getAllGifts(): Promise<Gift[]> {
  const { data, error } = await supabase
    .from('gifts')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar presentes no Supabase: ${error.message}`);
  }

  return (data || []) as Gift[];
}

interface CreateGiftData {
  name: string;
  price: number;
  imageUrl?: string;
  image_url?: string;
}

export async function createGift(giftData: CreateGiftData): Promise<Gift> {
  const imageUrl = giftData.imageUrl || giftData.image_url;
  const insertData: GiftInsertData = {
    name: giftData.name,
    price: giftData.price,
    image_url: normalizeImageUrl(imageUrl)
  };

  const { data, error } = await supabase
    .from('gifts')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar presente no Supabase: ${error.message}`);
  }

  return data as Gift;
}

