import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field } from '../components/forms/Field';
import { zodResolver } from './_local/rhf';
import { ApiError } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your name'),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
      .or(z.literal(''))
      .optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { user, loading, register: registerUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const from = ((location.state as { from?: string } | null) ?? {}).from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  });

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      });
      navigate(from, { replace: true });
    } catch (e) {
      setSubmitError(
        e instanceof ApiError ? e.message : 'Could not create your account. Please try again.',
      );
    }
  });

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-2xl">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        One account for faster checkout, order tracking, and saved addresses.
      </p>

      {submitError && (
        <p role="alert" className="mt-6 border border-sale/40 bg-sale/5 p-3 text-sm text-sale">
          {submitError}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Full name" htmlFor="reg-name" required error={errors.name?.message}>
          <input id="reg-name" className="input" autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="reg-email" required error={errors.email?.message}>
          <input
            id="reg-email"
            type="email"
            className="input"
            autoComplete="email"
            {...register('email')}
          />
        </Field>
        <Field
          label="Phone (optional)"
          htmlFor="reg-phone"
          hint="10-digit mobile number"
          error={errors.phone?.message}
        >
          <input
            id="reg-phone"
            className="input"
            inputMode="numeric"
            autoComplete="tel"
            {...register('phone')}
          />
        </Field>
        <Field label="Password" htmlFor="reg-password" required error={errors.password?.message}>
          <input
            id="reg-password"
            type="password"
            className="input"
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>
        <Field
          label="Confirm password"
          htmlFor="reg-confirm"
          required
          error={errors.confirmPassword?.message}
        >
          <input
            id="reg-confirm"
            type="password"
            className="input"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
        </Field>
        <button type="submit" disabled={isSubmitting} className="btn w-full disabled:opacity-60">
          {isSubmitting ? 'Creating your account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="underline hover:text-ink">
          Sign in
        </Link>
      </p>
    </div>
  );
}
