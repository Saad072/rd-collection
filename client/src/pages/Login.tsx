import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field } from '../components/forms/Field';
import { zodResolver } from './_local/rhf';
import { ApiError } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginState {
  from?: string;
  adminOnly?: boolean;
}

export default function Login() {
  const { user, loading, login } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const state = (location.state as LoginState | null) ?? {};
  const from = state.from ?? '/';
  const adminOnly = state.adminOnly === true;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  });

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setSubmitError(
          e.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : e.message,
        );
      } else {
        setSubmitError('Could not sign you in. Please try again.');
      }
    }
  });

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-2xl">{adminOnly ? 'Admin sign in' : 'Welcome back'}</h1>
      <p className="mt-2 text-sm text-muted">
        {adminOnly
          ? 'This area is restricted to store administrators.'
          : 'Sign in to track your orders and check out faster.'}
      </p>

      {submitError && (
        <p role="alert" className="mt-6 border border-sale/40 bg-sale/5 p-3 text-sm text-sale">
          {submitError}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" htmlFor="login-email" required error={errors.email?.message}>
          <input
            id="login-email"
            type="email"
            className="input"
            autoComplete="email"
            {...register('email')}
          />
        </Field>
        <Field label="Password" htmlFor="login-password" required error={errors.password?.message}>
          <input
            id="login-password"
            type="password"
            className="input"
            autoComplete="current-password"
            {...register('password')}
          />
        </Field>
        <button type="submit" disabled={isSubmitting} className="btn w-full disabled:opacity-60">
          {isSubmitting ? 'Signing you in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/register" state={location.state} className="underline hover:text-ink">
          Create an account
        </Link>
      </p>
    </div>
  );
}
