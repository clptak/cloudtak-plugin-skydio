/** Stub for CloudTAK host `std` when typechecking outside CloudTAK. */
export async function std(
    url: string,
    opts?: { method?: string; body?: unknown },
): Promise<unknown> {
    void url;
    void opts;
    throw new Error('std is only available when the plugin runs inside CloudTAK');
}
