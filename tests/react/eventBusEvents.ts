import "./eventBus";
declare module "./eventBus" {
    export interface EventBusEvents {
        a: (a: number) => string;
        b: () => void;
        c: (c: { a: number; b: string; }) => void;
    }
}
