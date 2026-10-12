import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { zodResolver } from '../_local/rhf';
import { Field } from '../../components/forms/Field';
import ErrorState from '../../components/feedback/ErrorState';
import { toast } from '../_local/ui';
import type { Category, CollectionDef, Product, Variant } from '../../types';

/* ---------- zod schemas ---------- */

const nanToUndefined = (v: unknown) =>
  typeof v === 'number' && Number.isNaN(v) ? undefined : v;

const positiveRupees = z.preprocess(
  nanToUndefined,
  z
    .number({ required_error: 'Enter a price', invalid_type_error: 'Enter a number' })
    .gt(0, 'Must be above 0'),
);

const optionalPositiveRupees = z.preprocess(
  (v: unknown) =>
    v === '' || v === null || v === undefined || nanToUndefined(v) === undefined
      ? undefined
      : v,
  z
    .number({ invalid_type_error: 'Enter a number' })
    .gt(0, 'Must be above 0')
    .optional(),
);

const nonNegativeInt = z.preprocess(
  nanToUndefined,
  z
    .number({ required_error: 'Enter stock', invalid_type_error: 'Enter a number' })
    .int('Whole numbers only')
    .min(0, 'Cannot be negative'),
);

const schema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  slug: z
    .string()
    .min(2, 'Min 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string().min(10, 'Min 10 characters'),
  category: z.string().min(1, 'Pick a category'),
  collections: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published', 'archived']),
  isNew: z.boolean().default(false),
  fabric: z.string().optional(),
  images: z
    .array(
      z.object({
        url: z.string().min(1, 'Required').url('Enter a valid URL'),
        alt: z.string().max(120).optional(),
      }),
    )
    .min(1, 'Add at least one image'),
  attributes: z
    .array(
      z.object({
        key: z.string().optional(),
        value: z.string().optional(),
      }),
    )
    .default([]),
  variants: z
    .array(
      z.object({
        size: z.string().min(1, 'Required'),
        color: z.string().min(1, 'Required'),
        sku: z.string().min(1, 'Required'),
        priceRupees: positiveRupees,
        compareAtRupees: optionalPositiveRupees,
        stock: nonNegativeInt,
        active: z.boolean(),
      }),
    )
    .min(1, 'Add at least one variant'),
});

type FormValues = z.infer<typeof schema>;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ---------- component ---------- */

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';

  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<CollectionDef[]>([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      category: '',
      collections: [],
      status: 'draft',
      isNew: false,
      fabric: '',
      images: [{ url: '', alt: '' }],
      attributes: [
        { key: 'seoTitle', value: '' },
        { key: 'seoDescription', value: '' },
      ],
      variants: [
        {
          size: '',
          color: '',
          sku: '',
          priceRupees: undefined as unknown as number,
          compareAtRupees: undefined,
          stock: 0,
          active: true,
        },
      ],
    },
  });

  const images = useFieldArray({ control, name: 'images' });
  const attrs = useFieldArray({ control, name: 'attributes' });
  const variants = useFieldArray({ control, name: 'variants' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      setBootError('');
      try {
        const [cats, cols] = await Promise.all([api.getCategories(), api.getCollections()]);
        if (cancelled) return;
        setCategories(cats.filter((c) => c.active));
        setCollections(cols.filter((c) => c.active));
        if (isEdit && id) {
          const p = await api.admin.products.get(id);
          if (cancelled) return;
          reset({
            name: p.name,
            slug: p.slug,
            description: p.description,
            category: p.category,
            collections: p.collections ?? [],
            status: p.status,
            isNew: p.isNew,
            fabric: p.fabric ?? '',
            images: p.images.map((img) => ({ url: img.url, alt: img.alt ?? '' })),
            attributes: Object.entries(p.attributes ?? {}).map(([key, value]) => ({
              key,
              value,
            })),
            variants: p.variants.map((v) => ({
              size: v.size,
              color: v.color,
              sku: v.sku,
              priceRupees: v.pricePaise / 100,
              compareAtRupees: v.compareAtPaise ? v.compareAtPaise / 100 : undefined,
              stock: v.stock,
              active: v.active,
            })),
          });
        }
      } catch (e) {
        if (!cancelled) setBootError(e instanceof ApiError ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, reset]);

  const autoSlug = () => {
    if (!isEdit || !getValues('slug')) {
      const s = slugify(getValues('name'));
      if (s) setValue('slug', s, { shouldValidate: true });
    }
  };

  const onSubmit = async (v: FormValues) => {
    const attributes: Record<string, string> = {};
    for (const a of v.attributes) {
      const key = a.key?.trim();
      if (key) attributes[key] = a.value ?? '';
    }
    const variantPayload = v.variants.map((vt) => ({
      sku: vt.sku.trim(),
      size: vt.size.trim(),
      color: vt.color.trim(),
      pricePaise: Math.round(vt.priceRupees * 100),
      compareAtPaise: vt.compareAtRupees ? Math.round(vt.compareAtRupees * 100) : undefined,
      stock: vt.stock,
      active: vt.active,
    })) as unknown as Variant[];

    const payload: Partial<Product> = {
      name: v.name.trim(),
      slug: v.slug.trim(),
      description: v.description.trim(),
      category: v.category,
      collections: v.collections,
      status: v.status,
      isNew: v.isNew,
      fabric: v.fabric?.trim() || undefined,
      images: v.images.map((img) => ({ url: img.url.trim(), alt: img.alt?.trim() || v.name.trim() })),
      attributes: attributes,
      variants: variantPayload,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await api.admin.products.update(id, payload);
        toast('Product updated');
      } else {
        await api.admin.products.create(payload);
        toast('Product created');
      }
      navigate('/admin/products');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!isEdit || !id) return;
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api.admin.products.remove(id);
      toast('Product deleted');
      navigate('/admin/products');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  if (bootLoading) {
    return <p className="py-10 text-center text-sm text-muted">Loading...</p>;
  }

  if (bootError) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <ErrorState message={bootError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-xl">{isEdit ? 'Edit product' : 'New product'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
        {/* basic info */}
        <section className="space-y-4 border border-line p-5">
          <h2 className="text-[15px] font-semibold uppercase tracking-widest">Basic info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" required error={errors.name?.message}>
              <input
                id="name"
                className="input"
                {...register('name')}
                onBlur={autoSlug}
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="slug"
              required
              error={errors.slug?.message}
              hint={isEdit ? 'Changing the slug changes the product URL.' : 'Auto-generated from the name.'}
            >
              <input id="slug" className="input" {...register('slug')} />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" required error={errors.description?.message}>
            <textarea id="description" className="input min-h-[120px]" {...register('description')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="category" required error={errors.category?.message}>
              <select id="category" className="input" {...register('category')}>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fabric" htmlFor="fabric" error={errors.fabric?.message}>
              <input id="fabric" className="input" placeholder="e.g. Cotton" {...register('fabric')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <select id="status" className="input" {...register('status')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...register('isNew')} />
                Mark as new arrival
              </label>
            </div>
          </div>
          <Field label="Collections" hint="Tick every collection this product belongs to.">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {collections.map((c) => (
                <label key={c._id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    value={c.slug}
                    className="h-4 w-4"
                    {...register('collections')}
                  />
                  {c.name}
                </label>
              ))}
              {collections.length === 0 && (
                <p className="text-sm text-muted">No collections yet.</p>
              )}
            </div>
          </Field>
        </section>

        {/* images */}
        <section className="space-y-4 border border-line p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold uppercase tracking-widest">Images</h2>
            <button
              type="button"
              onClick={() => images.append({ url: '', alt: '' })}
              className="btn btn-outline !px-3 !py-1.5 text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> Add image
            </button>
          </div>
          {errors.images?.message && (
            <p role="alert" className="text-xs text-sale">
              {errors.images.message}
            </p>
          )}
          {images.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_160px]">
                <Field
                  label={`Image ${i + 1} URL`}
                  htmlFor={`image-url-${i}`}
                  required
                  error={errors.images?.[i]?.url?.message}
                >
                  <input
                    id={`image-url-${i}`}
                    className="input"
                    placeholder="https://..."
                    {...register(`images.${i}.url`)}
                  />
                </Field>
                <Field label="Alt text" htmlFor={`image-alt-${i}`} error={errors.images?.[i]?.alt?.message}>
                  <input
                    id={`image-alt-${i}`}
                    className="input"
                    placeholder="Short description"
                    {...register(`images.${i}.alt`)}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => images.remove(i)}
                disabled={images.fields.length <= 1}
                aria-label={`Remove image ${i + 1}`}
                className="mt-6 flex h-10 w-10 shrink-0 items-center justify-center border border-line text-sale disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </section>

        {/* attributes */}
        <section className="space-y-4 border border-line p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold uppercase tracking-widest">Attributes</h2>
            <button
              type="button"
              onClick={() => attrs.append({ key: '', value: '' })}
              className="btn btn-outline !px-3 !py-1.5 text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> Add attribute
            </button>
          </div>
          <p className="text-xs text-muted">
            Key/value pairs like neckline, sleeve length, wash care — plus seoTitle and
            seoDescription for search engines. Rows with an empty key are ignored.
          </p>
          {attrs.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input
                  className="input"
                  placeholder="Key (e.g. seoTitle)"
                  aria-label={`Attribute ${i + 1} key`}
                  {...register(`attributes.${i}.key`)}
                />
                <input
                  className="input"
                  placeholder="Value"
                  aria-label={`Attribute ${i + 1} value`}
                  {...register(`attributes.${i}.value`)}
                />
              </div>
              <button
                type="button"
                onClick={() => attrs.remove(i)}
                aria-label={`Remove attribute ${i + 1}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-line text-sale"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </section>

        {/* variants */}
        <section className="space-y-4 border border-line p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold uppercase tracking-widest">Variants</h2>
            <button
              type="button"
              onClick={() =>
                variants.append({
                  size: '',
                  color: '',
                  sku: '',
                  priceRupees: undefined as unknown as number,
                  compareAtRupees: undefined,
                  stock: 0,
                  active: true,
                })
              }
              className="btn btn-outline !px-3 !py-1.5 text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> Add variant
            </button>
          </div>
          <p className="text-xs text-muted">Prices are entered in rupees (₹).</p>
          {errors.variants?.message && (
            <p role="alert" className="text-xs text-sale">
              {errors.variants.message}
            </p>
          )}
          {variants.fields.map((f, i) => (
            <div key={f.id} className="border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Variant {i + 1}</p>
                <button
                  type="button"
                  onClick={() => variants.remove(i)}
                  disabled={variants.fields.length <= 1}
                  className="flex items-center gap-1 text-xs text-sale disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Size" htmlFor={`v-size-${i}`} required error={errors.variants?.[i]?.size?.message}>
                  <input
                    id={`v-size-${i}`}
                    className="input"
                    placeholder="e.g. M"
                    {...register(`variants.${i}.size`)}
                  />
                </Field>
                <Field label="Colour" htmlFor={`v-color-${i}`} required error={errors.variants?.[i]?.color?.message}>
                  <input
                    id={`v-color-${i}`}
                    className="input"
                    placeholder="e.g. Maroon"
                    {...register(`variants.${i}.color`)}
                  />
                </Field>
                <Field label="SKU" htmlFor={`v-sku-${i}`} required error={errors.variants?.[i]?.sku?.message}>
                  <input
                    id={`v-sku-${i}`}
                    className="input"
                    placeholder="e.g. KUR-M-MRN"
                    {...register(`variants.${i}.sku`)}
                  />
                </Field>
                <Field
                  label="Price (₹)"
                  htmlFor={`v-price-${i}`}
                  required
                  error={errors.variants?.[i]?.priceRupees?.message}
                >
                  <input
                    id={`v-price-${i}`}
                    type="number"
                    min={0}
                    step="1"
                    className="input"
                    {...register(`variants.${i}.priceRupees`, { valueAsNumber: true })}
                  />
                </Field>
                <Field
                  label="Compare-at (₹)"
                  htmlFor={`v-compare-${i}`}
                  hint="Optional MRP for strike-through."
                  error={errors.variants?.[i]?.compareAtRupees?.message}
                >
                  <input
                    id={`v-compare-${i}`}
                    type="number"
                    min={0}
                    step="1"
                    className="input"
                    {...register(`variants.${i}.compareAtRupees`, { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Stock" htmlFor={`v-stock-${i}`} required error={errors.variants?.[i]?.stock?.message}>
                  <input
                    id={`v-stock-${i}`}
                    type="number"
                    min={0}
                    step="1"
                    className="input"
                    {...register(`variants.${i}.stock`, { valueAsNumber: true })}
                  />
                </Field>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register(`variants.${i}.active`)}
                />
                Variant is active (visible to shoppers)
              </label>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="btn">
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => void removeProduct()}
              className="text-sm text-sale hover:underline"
            >
              Delete product
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
