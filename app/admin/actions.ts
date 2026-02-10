'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
import { requireAdmin } from '@/lib/auth';

function getRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function getOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim();
  return value.length ? value : null;
}

function getRequiredInt(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? '').trim();
  const value = Number.parseInt(raw, 10);
  if (!raw || Number.isNaN(value)) {
    throw new Error(`${key} must be a number.`);
  }
  return value;
}

function getOptionalInt(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`${key} must be a number.`);
  }
  return value;
}

function parseFilterPayload(formData: FormData) {
  return {
    brand: getRequiredText(formData, 'brand'),
    series: getOptionalText(formData, 'series'),
    nominal_w: getRequiredInt(formData, 'nominal_w'),
    nominal_h: getRequiredInt(formData, 'nominal_h'),
    thickness: getRequiredInt(formData, 'thickness'),
    merv: getOptionalInt(formData, 'merv'),
    sku: getRequiredText(formData, 'sku'),
    upc: getOptionalText(formData, 'upc'),
    product_name: getRequiredText(formData, 'product_name'),
    url: getOptionalText(formData, 'url'),
    notes: getOptionalText(formData, 'notes')
  };
}

export async function createFilter(formData: FormData) {
  try {
    const { supabase } = await requireAdmin();
    const payload = parseFilterPayload(formData);

    const { error } = await supabase.from('filters').insert(payload);
    if (error) {
      throw new Error('Unable to create filter.');
    }

    revalidatePath('/admin');
    redirect('/admin?status=success&message=Filter+created');
  } catch (error) {
    redirect(`/admin/new?status=error&message=${encodeURIComponent((error as Error).message)}`);
  }
}

export async function updateFilter(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) {
    redirect('/admin?status=error&message=Missing+filter+id');
  }

  try {
    const { supabase } = await requireAdmin();
    const payload = parseFilterPayload(formData);

    const { error } = await supabase.from('filters').update(payload).eq('id', id);
    if (error) {
      throw new Error('Unable to update filter.');
    }

    revalidatePath('/admin');
    redirect(`/admin/edit/${id}?status=success&message=Filter+updated`);
  } catch (error) {
    redirect(`/admin/edit/${id}?status=error&message=${encodeURIComponent((error as Error).message)}`);
  }
}

export async function deleteFilter(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) {
    redirect('/admin?status=error&message=Missing+filter+id');
  }

  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from('filters').delete().eq('id', id);
    if (error) {
      throw new Error('Unable to delete filter.');
    }
    revalidatePath('/admin');
    redirect('/admin?status=success&message=Filter+deleted');
  } catch (error) {
    redirect(`/admin?status=error&message=${encodeURIComponent((error as Error).message)}`);
  }
}

export async function addAlias(formData: FormData) {
  const filterId = String(formData.get('filter_id') ?? '').trim();
  const alias = String(formData.get('alias') ?? '').trim();
  if (!filterId || !alias) {
    redirect(`/admin/edit/${filterId}?status=error&message=Alias+is+required`);
  }

  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from('aliases').insert({ filter_id: filterId, alias });
    if (error) {
      throw new Error('Unable to add alias.');
    }
    revalidatePath(`/admin/edit/${filterId}`);
    redirect(`/admin/edit/${filterId}?status=success&message=Alias+added`);
  } catch (error) {
    redirect(`/admin/edit/${filterId}?status=error&message=${encodeURIComponent((error as Error).message)}`);
  }
}

export async function deleteAlias(formData: FormData) {
  const aliasId = String(formData.get('alias_id') ?? '').trim();
  const filterId = String(formData.get('filter_id') ?? '').trim();
  if (!aliasId || !filterId) {
    redirect('/admin?status=error&message=Missing+alias+id');
  }

  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from('aliases').delete().eq('id', aliasId);
    if (error) {
      throw new Error('Unable to remove alias.');
    }
    revalidatePath(`/admin/edit/${filterId}`);
    redirect(`/admin/edit/${filterId}?status=success&message=Alias+removed`);
  } catch (error) {
    redirect(`/admin/edit/${filterId}?status=error&message=${encodeURIComponent((error as Error).message)}`);
  }
}

export type ImportState = {
  status: 'idle' | 'success' | 'error';
  inserted: number;
  failed: number;
  errors: { row: number; message: string }[];
};

function normalizeRowValue(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseRowNumber(value: string, field: string) {
  const parsed = Number.parseInt(value, 10);
  if (!value || Number.isNaN(parsed)) {
    throw new Error(`${field} must be a number.`);
  }
  return parsed;
}

export async function importCsv(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  try {
    const { supabase } = await requireAdmin();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return {
        status: 'error',
        inserted: 0,
        failed: 0,
        errors: [{ row: 0, message: 'Please choose a CSV file.' }]
      };
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true
    });

    const errors: { row: number; message: string }[] = [];
    const payloads: Record<string, unknown>[] = [];

    if (parsed.errors.length) {
      parsed.errors.forEach((parseError) => {
        errors.push({
          row: (parseError.row ?? 0) + 1,
          message: parseError.message
        });
      });
    }

    parsed.data.forEach((row, index) => {
      try {
        const brand = normalizeRowValue(row.brand);
        const sku = normalizeRowValue(row.sku);
        const productName = normalizeRowValue(row.product_name);
        const nominalW = normalizeRowValue(row.nominal_w);
        const nominalH = normalizeRowValue(row.nominal_h);
        const thickness = normalizeRowValue(row.thickness);

        if (!brand || !sku || !productName) {
          throw new Error('brand, sku, and product_name are required.');
        }

        const payload = {
          brand,
          series: normalizeRowValue(row.series) || null,
          nominal_w: parseRowNumber(nominalW, 'nominal_w'),
          nominal_h: parseRowNumber(nominalH, 'nominal_h'),
          thickness: parseRowNumber(thickness, 'thickness'),
          merv: normalizeRowValue(row.merv)
            ? parseRowNumber(normalizeRowValue(row.merv), 'merv')
            : null,
          sku,
          upc: normalizeRowValue(row.upc) || null,
          product_name: productName,
          url: normalizeRowValue(row.url) || null,
          notes: normalizeRowValue(row.notes) || null
        };

        payloads.push(payload);
      } catch (error) {
        errors.push({
          row: index + 2,
          message: (error as Error).message
        });
      }
    });

    let inserted = 0;

    if (payloads.length) {
      const { error } = await supabase.from('filters').insert(payloads);
      if (error) {
        return {
          status: 'error',
          inserted: 0,
          failed: payloads.length,
          errors: [{ row: 0, message: 'Database insert failed. Check your CSV.' }]
        };
      }
      inserted = payloads.length;
      revalidatePath('/admin');
    }

    return {
      status: errors.length ? 'error' : 'success',
      inserted,
      failed: errors.length,
      errors
    };
  } catch (error) {
    return {
      status: 'error',
      inserted: 0,
      failed: 0,
      errors: [{ row: 0, message: (error as Error).message }]
    };
  }
}
