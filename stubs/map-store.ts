/** Stub for CloudTAK host map store when typechecking outside CloudTAK. */
export function useMapStore(): { mission?: { meta: { guid: string } }; toImport: unknown[] } {
    return { toImport: [] };
}
