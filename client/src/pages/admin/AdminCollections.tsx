import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { zodResolver } from '../_local/rhf';
import { Field } from '../../components/forms/Field';
import ErrorState from '../../components/feedback/ErrorState';
import { Modal, toast } from '../_local/ui';
import type { CollectionDef } from '../../types';

const nanToUndefined = (v: unknown) =>
  typeof v === 'number' && Number.isNaN(v) ? undefined : v;

const schema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  slug: z
    .string()
    .min(2, 'Min 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string().optional(),
  imageUrl: z.preprocess(
    (v: unknown) => (v === '' ? undefined : v),
    z.string().url('Enter a valid URL').optional(),
  ),
  sortOrder: z.preprocess(nanToUndefined, z.number().int().default(0)),
  active: z.boolean(),
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

function CollectionForm({
  initial,
  onDone,
}: {
  initial: CollectionDef | null;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      slug: initial?.slug ?? '',
      description: initial?.description ?? '',
      imageUrl: initial?.imageUrl ?? '',
      sortOrder: initial?.sortOrder ?? 0,
      active: initial?.active ?? true,
    },
  });

  const autoSlug = () => {
    if (!getValues('slug')) {
      const s = slugify(getValues('name'));
      if (s) setValue('slug', s, { shouldValidate: true });
    }
  };

  const onSubmit = async (v: FormValues) => {
    const payload: Partial<CollectionDef> = {
      name: v.name.trim(),
      slug: v.slug.trim(),
      description: v.description?.trim() || undefined,
      imageUrl: v.imageUrl?.trim() || undefined,
      sortOrder: v.sortOrder,
      active: v.active,
    };
    setSaving(true);
    try {
      if (initial) {
        await api.admin.collections.update(initial._id, payload);
        toast('Collection updated');
      } else {
        await api.admin.collections.create(payload);
        toast('Collection created');
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
        <Field label="Name" htmlFor="col-name" required error={errors.name?.message}>
          <input id="col-name" className="input" {...register('name')} onBlur={autoSlug} />
        </Field>
        <Field label="Slug" htmlFor="col-slug" required error={errors.slug?.message}>
          <input id="col-slug" className="input" {...register('slug')} />
        </Field>
      </div>
      <Field label="Description" htmlFor="col-desc" error={errors.description?.message}>
        <textarea id="col-desc" className="input min-h-[90px]" {...register('description')} />
      </Field>
      <Field label="Image URL" htmlFor="col-img" error={errors.imageUrl?.message}>
        <input id="col-img" className="input" placeholder="https://..." {...register('imageUrl')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sort order" htmlFor="col-sort" error={errors.sortOrder?.message}>
          <input
            id="col-sort"
            type="number"
            step="1"
            className="input"
            {...register('sortOrder', { valueAsNumber: true })}
          />
        </Field>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" {...register('active')} />
            Active (visible to shoppers)
          </label>
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn">
        {saving ? 'Saving...' : initial ? 'Save changes' : 'Create collection'}
      </button>
    </form>
  );
}

export default function AdminCollections() {
  const [items, setItems] = useState<CollectionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: CollectionDef | null }>({
    open: false,
    editing: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.collections.list();
      setItems(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (c: CollectionDef) => {
    try {
      await api.admin.collections.update(c._id, { active: !c.active });
      toast(c.active ? 'Collection hidden' : 'Collection visible');
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const remove = async (c: CollectionDef) => {
    if (!window.confirm(`Delete collection "${c.name}"? Products stay, they just lose this tag.`))
      return;
    try {
      await api.admin.collections.remove(c._id);
      toast('Collection deleted');
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">Collections</h1>
        <button
          type="button"
          onClick={() => setModal({ open: true, editing: null })}
          className="btn"
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> New collection
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading...</p>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No collections yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Slug</th>
                <th className="py-2 pr-4 font-medium">Sort</th>
                <th className="py-2 pr-4 font-medium">Active</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id} className="border-b border-line">
                  <td className="py-3 pr-4 font-medium">{c.name}</td>
                  <td className="py-3 pr-4 text-muted">/{c.slug}</td>
                  <td className="py-3 pr-4 text-muted">{c.sortOrder}</td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => void toggleActive(c)}
                      aria-pressed={c.active}
                      className={`inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest ${
                        c.active ? 'bg-green-50 text-green-800' : 'bg-paper text-muted'
                      }`}
                    >
                      {c.active ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-3 text-[13px]">
                      <button
                        type="button"
                        onClick={() => setModal({ open: true, editing: c })}
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(c)}
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
        title={modal.editing ? 'Edit collection' : 'New collection'}
      >
        <CollectionForm
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
