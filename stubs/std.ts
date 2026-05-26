/** Stub for CloudTAK host `std` when typechecking outside CloudTAK. */
export async function std(
    _url: string,
    _opts?: { method?: string; body?: unknown },
): Promise<unknown> {
    throw new Error('std is only available when the plugin runs inside CloudTAK');
}
