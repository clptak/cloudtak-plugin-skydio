export type RouteRecordRaw = {
    path: string;
    name?: string | symbol;
    component?: unknown;
    children?: RouteRecordRaw[];
    [key: string]: unknown;
};

export type Router = {
    hasRoute: (name: string | symbol) => boolean;
    removeRoute: (name: string | symbol) => void;
    replace: (to: { name: string }) => Promise<unknown>;
    addRoute: (parentOrRoute: string | RouteRecordRaw, route?: RouteRecordRaw) => void;
};
