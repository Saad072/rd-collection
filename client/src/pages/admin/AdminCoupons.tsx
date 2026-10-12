import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { formatINR } from '../../lib/pricing';
import { zodResolver } from '../_local/rhf';
import { Field } from '../../components/forms/Field';
import ErrorState from '../../components/feedback/ErrorState';
import { Modal, formatDate, toast } from '../_local/ui';
import type { Coupon } from '../../types';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))
    ? undefined
    : v;

const schema = z
  .object({
    code: z
      .string()
      .min(3, 'Min 3 characters')
      .transform((s) => s.trim().toUpperCase().replace(/\s+/g, '')),
    type: z.enum(['flat', 'percent']),
    value: z.preprocess(
      emptyToUndefined,
      z
        .number({ required_error: 'Enter a value', invalid_type_error: 'Enter a number' })
        .gt(0, 'Must be above 0'),
    ),
    minOrderRupees: z.preprocess(
      emptyToUndefined,
      z.number({ invalid_type_error: 'Enter a number' }).min(0, 'Cannot be negative').optional(),
    ),
    maxDiscountRupees: z.preprocess(
      emptyToUndefined,
      z
        .number({ invalid_type_error: 'Enter a number' })
        .gt(0, 'Must be above 0')
        .optional(),
    ),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    usageLimit: z.preprocess(
      emptyToUndefined,
      z
        .number({ invalid_type_error: 'Enter a number' })
        .int('Whole numbers only')
        .min(1, 'At least 1')
        .optional(),
    ),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'percent' && typeof v.value === 'number' && v.value > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Percent discount cannot exceed 90',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function toInputValue(iso: string | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}

function CouponForm({ initial, onDone }: { initial: Coupon | null; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: initial?.code ?? '',
      type: initial?.type ?? 'flat',
      value:
        initial?.type === 'flat' && initial
          ? initial.value / 100
          : initial
            ? initial.value
            : (undefined as unknown as number),
      minOrderRupees: initial ? initial.minOrderPaise / 100 : undefined,
      maxDiscountRupees: initial?.maxDiscountPaise ? initial.maxDiscountPaise / 100 : undefined,
      startsAt: toInputValue(initial?.startsAt),
      endsAt: toInputValue(initial?.endsAt),
      usageLimit: initial?.usageLimit,
      active: initial?.active ?? true,
    },
  });

  const type = watch('type');

  const onSubmit = async (v: FormValues) => {
    const payload: Partial<Coupon> = {
      code: v.code,
      type: v.type,
      value: v.type === 'flat' ? Math.round((v.value as number) * 100) : (v.value as number),
      minOrderPaise: v.minOrderRupees ? Math.round(v.minOrderRupees * 100) : 0,
      maxDiscountPaise: v.maxDiscountRupees ? Math.round(v.maxDiscountRupees * 100) : undefined,
      startsAt: v.startsAt?.trim() ? new Date(v.startsAt).toISOString() : undefined,
      endsAt: v.endsAt?.trim() ? new Date(v.endsAt).toISOString() : undefined,
      usageLimit: v.usageLimit,
      active: v.active,
    };
    setSaving(true);
    try {
      if (initial) {
        await api.admin.coupons.update(initial._id, payload);
        toast('Coupon updated');
      } else {
        await api.admin.coupons.create(payload);
        toast('Coupon created');
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
        <Field
          label="Code"
          htmlFor="cpn-code"
          required
          error={errors.code?.message}
          hint="Saved in UPPERCASE."
        >
          <input
            id="cpn-code"
            className="input uppercase"
            placeholder="e.g. DIWALI10"
            {...register('code')}
          />
        </Field>
        <Field label="Type" htmlFor="cpn-type" error={errors.type?.message}>
          <select id="cpn-type" className="input" {...register('type')}>
            <option value="flat">Flat (₹ off)</option>
            <option value="percent">Percent (% off)</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={type === 'flat' ? 'Discount (₹)' : 'Discount (%)'}
          htmlFor="cpn-value"
          required
          error={errors.value?.message}
          hint={type === 'flat' ? 'Enter rupees — converted to paise on save.' : 'Number between 1 and 90.'}
        >
          <input
            id="cpn-value"
            type="number"
            min={0}
            step="1"
            className="input"
            {...register('value', { valueAsNumber: true })}
          />
        </Field>
        <Field
          label="Min order (₹)"
          htmlFor="cpn-min"
          error={errors.minOrderRupees?.message}
          hint="Leave empty for no minimum."
        >
          <input
            id="cpn-min"
            type="number"
            min={0}
            step="1"
            className="input"
            {...register('minOrderRupees', { valueAsNumber: true })}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Max discount (₹)"
          htmlFor="cpn-max"
          error={errors.maxDiscountRupees?.message}
          hint="Cap for percent coupons. Empty = no cap."
        >
          <input
            id="cpn-max"
            type="number"
            min={0}
            step="1"
            className="input"
            {...register('maxDiscountRupees', { valueAsNumber: true })}
          />
        </Field>
        <Field
          label="Usage limit"
          htmlFor="cpn-limit"
          error={errors.usageLimit?.message}
          hint="Empty = unlimited uses."
        >
          <input
            id="cpn-limit"
            type="number"
            min={1}
            step="1"
            className="input"
            {...register('usageLimit', { valueAsNumber: true })}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts at" htmlFor="cpn-start" error={errors.startsAt?.message}>
          <input id="cpn-start" type="datetime-local" className="input" {...register('startsAt')} />
        </Field>
        <Field label="Ends at" htmlFor="cpn-end" error={errors.endsAt?.message}>
          <input id="cpn-end" type="datetime-local" className="input" {...register('endsAt')} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" {...register('active')} />
        Active (shoppers can use it)
      </label>
      <button type="submit" disabled={saving} className="btn">
        {saving ? 'Saving...' : initial ? 'Save changes' : 'Create coupon'}
      </button>
    </form>
  );
}

export default function AdminCoupons() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: Coupon | null }>({
    open: false,
    editing: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.coupons.list();
      setItems(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (c: Coupon) => {
    try {
      await api.admin.coupons.update(c._id, { active: !c.active });
      toast(c.active ? 'Coupon deactivated' : 'Coupon activated');
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed');
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await api.admin.coupons.remove(c._id);
      toast('Coupon deleted');
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const validity = (c: Coupon) => {
    if (!c.startsAt && !c.endsAt) return '—';
    const from = c.startsAt ? formatDate(c.startsAt) : '…';
    const to = c.endsAt ? formatDate(c.endsAt) : '…';
    return `${from} → ${to}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">Coupons</h1>
        <button
          type="button"
          onClick={() => setModal({ open: true, editing: null })}
          className="btn"
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> New coupon
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading...</p>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No coupons yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Value</th>
                <th className="py-2 pr-4 font-medium">Min order</th>
                <th className="py-2 pr-4 font-medium">Validity</th>
                <th className="py-2 pr-4 font-medium">Used</th>
                <th className="py-2 pr-4 font-medium">Active</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id} className="border-b border-line">
                  <td className="py-3 pr-4 font-mono font-medium">{c.code}</td>
                  <td className="py-3 pr-4">
                    {c.type === 'flat' ? formatINR(c.value) : `${c.value}%`}
                  </td>
                  <td className="py-3 pr-4 text-muted">{formatINR(c.minOrderPaise)}</td>
                  <td className="py-3 pr-4 text-muted">{validity(c)}</td>
                  <td className="py-3 pr-4 text-muted">
                    {c.usedCount}/{c.usageLimit ?? 'unlimited'}
                  </td>
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
        title={modal.editing ? 'Edit coupon' : 'New coupon'}
        wide
      >
        <CouponForm
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
