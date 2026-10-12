import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { zodResolver } from '../_local/rhf';
import { Field } from '../../components/forms/Field';
import ErrorState from '../../components/feedback/ErrorState';
import { Modal, resolveImage, toast } from '../_local/ui';
import type { Banner } from '../../types';

const nanToUndefined = (v: unknown) =>
  typeof v === 'number' && Number.isNaN(v) ? undefined : v;

const optionalUrl = z.preprocess(
  (v: unknown) => (v === '' ? undefined : v),
  z.string().url('Enter a valid URL').optional(),
);

const schema = z.object({
  position: z.enum(['home-hero', 'home-promo']),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  imageUrl: z.string().min(1, 'Required').url('Enter a valid URL'),
  mobileImageUrl: optionalUrl,
  ctaLabel: z.string().optional(),
  ctaUrl: optionalUrl,
  sortOrder: z.preprocess(nanToUndefined, z.number().int().default(0)),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function BannerForm({ initial, onDone }: { initial: Banner | null; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      position: (initial?.position === 'home-promo' ? 'home-promo' : 'home-hero') as
        | 'home-hero'
        | 'home-promo',
      title: initial?.title ?? '',
      subtitle: initial?.subtitle ?? '',
      imageUrl: initial?.imageUrl ?? '',
      mobileImageUrl: initial?.mobileImageUrl ?? '',
      ctaLabel: initial?.ctaLabel ?? '',
      ctaUrl: initial?.ctaUrl ?? '',
      sortOrder: initial?.sortOrder ?? 0,
      active: initial?.active ?? true,
    },
  });

  const onSubmit = async (v: FormValues) => {
    const payload: Partial<Banner> = {
      position: v.position,
      title: v.title?.trim() || undefined,
      subtitle: v.subtitle?.trim() || undefined,
      imageUrl: v.imageUrl.trim(),
      mobileImageUrl: v.mobileImageUrl?.trim() || undefined,
      ctaLabel: v.ctaLabel?.trim() || undefined,
      ctaUrl: v.ctaUrl?.trim() || undefined,
      sortOrder: v.sortOrder,
      active: v.active,
    };
    setSaving(true);
    try {
      if (initial) {
        await api.admin.banners.update(initial._id, payload);
        toast('Banner updated');
      } else {
        await api.admin.banners.create(payload);
        toast('Banner created');
      }
      onDone();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Position" htmlFor="bnr-pos" error={errors.position?.message}>
          <select id="bnr-pos" className="input" {...register('position')}>
            <option value="home-hero">Home hero</option>
            <option value="home-promo">Home promo</option>
          </select>
        </Field>
        <Field label="Sort order" htmlFor="bnr-sort" error={errors.sortOrder?.message}>
          <input
            id="bnr-sort"
            type="number"
            step="1"
            className="input"
            {...register('sortOrder', { valueAsNumber: true })}
          />
        </Field>
      </div>
      <Field label="Title" htmlFor="bnr-title" error={errors.title?.message}>
        <input id="bnr-title" className="input" {...register('title')} />
      </Field>
      <Field label="Subtitle" htmlFor="bnr-sub" error={errors.subtitle?.message}>
        <input id="bnr-sub" className="input" {...register('subtitle')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Image URL" htmlFor="bnr-img" required error={errors.imageUrl?.message}>
          <input
            id="bnr-img"
            className="input"
            placeholder="https://..."
            {...register('imageUrl')}
          />
        </Field>
        <Field
          label="Mobile image URL"
          htmlFor="bnr-mimg"
          error={errors.mobileImageUrl?.message}
          hint="Optional — shown on small screens."
        >
          <input
            id="bnr-mimg"
            className="input"
            placeholder="https://..."
            {...register('mobileImageUrl')}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CTA label" htmlFor="bnr-cta-label" error={errors.ctaLabel?.message}>
          <input
            id="bnr-cta-label"
            className="input"
            placeholder="e.g. Shop now"
            {...register('ctaLabel')}
          />
        </Field>
        <Field label="CTA URL" htmlFor="bnr-cta-url" error={errors.ctaUrl?.message}>
          <input
            id="bnr-cta-url"
            className="input"
            placeholder="/collections/new-arrivals"
            {...register('ctaUrl')}
          />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" {...register('active')} />
        Active (visible on the store)
      </label>
      <button type="submit" disabled={saving} className="btn">
        {saving ? 'Saving...' : initial ? 'Save changes' : 'Create banner'}
      </button>
    </form>
  );
}

export default function AdminBanners() {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: Banner | null }>({
    open: false,
    editing: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.banners.list();
      setItems(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (b: Banner) => {
    try {
      await api.admin.banners.update(b._id, { active: !b.active });
      toast(b.active ? 'Banner hidden' : 'Banner visible');
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const remove = async (b: Banner) => {
    if (!window.confirm(`Delete banner "${b.title || b.position}"?`)) return;
    try {
      await api.admin.banners.remove(b._id);
      toast('Banner deleted');
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">Banners</h1>
        <button
          type="button"
          onClick={() => setModal({ open: true, editing: null })}
          className="btn"
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> New banner
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading...</p>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No banners yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                <th className="py-2 pr-4 font-medium">Preview</th>
                <th className="py-2 pr-4 font-medium">Position</th>
                <th className="py-2 pr-4 font-medium">Title</th>
                <th className="py-2 pr-4 font-medium">Sort</th>
                <th className="py-2 pr-4 font-medium">Active</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b._id} className="border-b border-line">
                  <td className="py-3 pr-4">
                    <img
                      src={resolveImage(b.imageUrl)}
                      alt=""
                      className="h-11 w-20 border border-line object-cover"
                    />
                  </td>
                  <td className="py-3 pr-4 text-muted">{b.position}</td>
                  <td className="py-3 pr-4 font-medium">{b.title || '—'}</td>
                  <td className="py-3 pr-4 text-muted">{b.sortOrder}</td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => void toggleActive(b)}
                      aria-pressed={b.active}
                      className={`inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest ${
                        b.active ? 'bg-green-50 text-green-800' : 'bg-paper text-muted'
                      }`}
                    >
                      {b.active ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-3 text-[13px]">
                      <button
                        type="button"
                        onClick={() => setModal({ open: true, editing: b })}
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(b)}
                        className="flex items-center gap-1 text-sale hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Edit banner' : 'New banner'}
        wide
      >
        <BannerForm
          key={modal.editing?._id ?? 'new'}
          initial={modal.editing}
          onDone={() => {
            setModal({ open: false, editing: null });
            void load();
          }}
        />
      </Modal>
    </div>
  );
}
