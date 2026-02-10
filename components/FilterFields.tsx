import type { Filter } from '@/lib/types';

type FilterDefaults = Partial<Filter> & {
  nominal_w?: number | null;
  nominal_h?: number | null;
  thickness?: number | null;
  merv?: number | null;
};

type FilterFieldsProps = {
  defaults?: FilterDefaults;
};

export default function FilterFields({ defaults }: FilterFieldsProps) {
  return (
    <div className="grid" style={{ gap: '16px' }}>
      <div className="form-row">
        <div>
          <label htmlFor="brand">Brand</label>
          <input id="brand" name="brand" required defaultValue={defaults?.brand ?? ''} />
        </div>
        <div>
          <label htmlFor="series">Series</label>
          <input id="series" name="series" defaultValue={defaults?.series ?? ''} />
        </div>
        <div>
          <label htmlFor="product_name">Product name</label>
          <input
            id="product_name"
            name="product_name"
            required
            defaultValue={defaults?.product_name ?? ''}
          />
        </div>
      </div>

      <div className="form-row">
        <div>
          <label htmlFor="nominal_w">Nominal width</label>
          <input
            id="nominal_w"
            name="nominal_w"
            type="number"
            required
            defaultValue={defaults?.nominal_w ?? ''}
          />
        </div>
        <div>
          <label htmlFor="nominal_h">Nominal height</label>
          <input
            id="nominal_h"
            name="nominal_h"
            type="number"
            required
            defaultValue={defaults?.nominal_h ?? ''}
          />
        </div>
        <div>
          <label htmlFor="thickness">Thickness</label>
          <input
            id="thickness"
            name="thickness"
            type="number"
            required
            defaultValue={defaults?.thickness ?? ''}
          />
        </div>
        <div>
          <label htmlFor="merv">MERV</label>
          <input
            id="merv"
            name="merv"
            type="number"
            defaultValue={defaults?.merv ?? ''}
          />
        </div>
      </div>

      <div className="form-row">
        <div>
          <label htmlFor="sku">SKU</label>
          <input id="sku" name="sku" required defaultValue={defaults?.sku ?? ''} />
        </div>
        <div>
          <label htmlFor="upc">UPC</label>
          <input id="upc" name="upc" defaultValue={defaults?.upc ?? ''} />
        </div>
        <div>
          <label htmlFor="url">Product URL</label>
          <input id="url" name="url" type="url" defaultValue={defaults?.url ?? ''} />
        </div>
      </div>

      <div>
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ''} />
      </div>
    </div>
  );
}
