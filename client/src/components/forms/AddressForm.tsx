import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { Field } from './Field';

/** Shared address validation. Reused by checkout and the account address book. */
export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter the full name'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  addressLine: z.string().trim().min(6, 'Please enter the full street address'),
  locality: z.string().trim().optional().or(z.literal('')),
  landmark: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Please enter the city'),
  state: z.string().trim().min(2, 'Please select the state'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

interface AddressFormProps {
  /** RHF register from the parent form. */
  register: UseFormRegister<any>;
  /** RHF formState.errors (or the nested error object when a prefix is used). */
  errors: FieldErrors<any>;
  /** Optional field-name prefix, e.g. "shipping" -> "shipping.city". */
  prefix?: string;
  /** ID prefix to keep labels unique when several address forms share a page. */
  idPrefix?: string;
}

function errOf(errors: FieldErrors<any>, name: string): string | undefined {
  const e = errors?.[name] as { message?: string } | undefined;
  return typeof e?.message === 'string' ? e.message : undefined;
}

/**
 * Presentational address fields. Works with any parent react-hook-form;
 * pass `errors.shipping` (or the root errors object) when using a prefix.
 */
export function AddressForm({ register, errors, prefix, idPrefix = 'addr' }: AddressFormProps) {
  const n = (field: string) => (prefix ? `${prefix}.${field}` : field);
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Full name" htmlFor={id('fullName')} error={errOf(errors, 'fullName')} required>
          <input id={id('fullName')} className="input" autoComplete="name" {...register(n('fullName'))} />
        </Field>
      </div>
      <Field label="Phone" htmlFor={id('phone')} error={errOf(errors, 'phone')} required hint="10-digit mobile number">
        <input
          id={id('phone')}
          className="input"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="98765 43210"
          {...register(n('phone'))}
        />
      </Field>
      <Field label="Email (optional)" htmlFor={id('email')} error={errOf(errors, 'email')}>
        <input id={id('email')} className="input" type="email" autoComplete="email" {...register(n('email'))} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address" htmlFor={id('addressLine')} error={errOf(errors, 'addressLine')} required>
          <input
            id={id('addressLine')}
            className="input"
            autoComplete="street-address"
            placeholder="House no, street, area"
            {...register(n('addressLine'))}
          />
        </Field>
      </div>
      <Field label="Locality (optional)" htmlFor={id('locality')} error={errOf(errors, 'locality')}>
        <input id={id('locality')} className="input" {...register(n('locality'))} />
      </Field>
      <Field label="Landmark (optional)" htmlFor={id('landmark')} error={errOf(errors, 'landmark')}>
        <input id={id('landmark')} className="input" {...register(n('landmark'))} />
      </Field>
      <Field label="City" htmlFor={id('city')} error={errOf(errors, 'city')} required>
        <input id={id('city')} className="input" autoComplete="address-level2" {...register(n('city'))} />
      </Field>
      <Field label="State" htmlFor={id('state')} error={errOf(errors, 'state')} required>
        <select id={id('state')} className="input" autoComplete="address-level1" {...register(n('state'))}>
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2 sm:max-w-[50%]">
        <Field label="Pincode" htmlFor={id('pincode')} error={errOf(errors, 'pincode')} required>
          <input
            id={id('pincode')}
            className="input"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="302001"
            {...register(n('pincode'))}
          />
        </Field>
      </div>
    </div>
  );
}
