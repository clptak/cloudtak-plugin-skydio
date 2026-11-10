/** Stub for CloudTAK host `std` when typechecking outside CloudTAK. */
export async function std(
    url: string,
    opts?: { method?: string; body?: unknown },
): Promise<unknown> {
    void url;
    void opts;
    throw new Error('std is only available when the plugin runs inside CloudTAK');
}

export function stdurl(url: string | URL): URL {
    return new URL(url, 'http://localhost');
}

export async function getRuntimeToken(): Promise<string | undefined> {
    return undefined;
}

/** Loose stand-in for CloudTAK's typed API client. */
export const server = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async GET(path: string, opts?: unknown): Promise<{ data?: any; error?: unknown }> {
        void path;
        void opts;
        throw new Error('server is only available when the plugin runs inside CloudTAK');
    },
};
