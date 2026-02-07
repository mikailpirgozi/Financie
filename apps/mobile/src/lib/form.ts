import { zodResolver as _zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

/**
 * Zod v4 compatible zodResolver wrapper.
 *
 * @hookform/resolvers v3 was typed against Zod v3's class hierarchy.
 * Zod v4 schemas are fully compatible at runtime, but the internal
 * TypeScript types diverged. This wrapper bridges the gap with a
 * single targeted cast so all consumer code stays type-safe.
 */
export function zodResolver(
  schema: z.ZodType,
  schemaOptions?: Parameters<typeof _zodResolver>[1],
  factoryOptions?: Parameters<typeof _zodResolver>[2],
) {
  return _zodResolver(
    schema as unknown as Parameters<typeof _zodResolver>[0],
    schemaOptions,
    factoryOptions,
  );
}
