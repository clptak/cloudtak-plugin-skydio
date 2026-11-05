interface StubOverlay {
    id: number;
    name: string;
    visible: boolean;
    type: string;
    styles: Array<{ id: string }>;
    _error?: Error;
    update(body: { visible?: boolean }): Promise<void>;
}

/** Stub for CloudTAK's OverlayManager when typechecking outside CloudTAK. */
export default class OverlayManager {
    static readonly loaded: StubOverlay[] = [];
}
