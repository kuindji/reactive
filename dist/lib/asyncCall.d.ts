export default function asyncCall<P extends readonly any[] = readonly any[], R = any>(fn: (...args: P) => R, context?: object | null, args?: P, timeout?: number): Promise<R>;
