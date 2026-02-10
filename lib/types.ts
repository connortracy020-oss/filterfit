export type Filter = {
  id: string;
  brand: string;
  series: string | null;
  nominal_w: number;
  nominal_h: number;
  thickness: number;
  merv: number | null;
  sku: string;
  upc: string | null;
  product_name: string;
  url: string | null;
  notes: string | null;
  created_at: string;
};

export type Alias = {
  id: string;
  alias: string;
  filter_id: string;
};
