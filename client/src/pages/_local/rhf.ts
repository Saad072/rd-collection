/**
 * Minimal Zod resolver for React Hook Form.
 *
 * NOTE: `@hookform/resolvers` is not in the client's dependencies, so this
 * page-local resolver bridges Zod schemas to RHF. It supports nested field
 * paths (e.g. `address.city`) by building nested error objects.
 */
import type { FieldErrors, Resolver } from 'react-hook-form';
import type { z } from 'zod';

function setPath(obj: Record<string, unknown>, path: (string | number)[], value: unknown): void {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = String(path[i]);
    const next = cur[key];
    if (typeof next !== 'object' || next === null) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[String(path[path.length - 1])] = value;
}

export function zodResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): Resolver<z.infer<TSchema>> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as z.infer<TSchema>, errors: {} };
    }
    const errors: Record<string, unknown> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.length > 0 ? issue.path : ['_form'];
      setPath(errors, path, { type: issue.code, message: issue.message });
    }
    return { values: {}, errors: errors as FieldErrors<z.infer<TSchema>> };
  };
}
