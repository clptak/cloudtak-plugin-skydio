import type { Feature } from './types.ts';

/** Stub for CloudTAK host map store when typechecking outside CloudTAK. */
export function useMapStore(): { mission?: { meta: { guid: string } }; toImport: Feature[] } {
    return { toImport: [] };
}
