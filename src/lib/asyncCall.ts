export default function asyncCall<
    P extends readonly any[] = readonly any[],
    R = any,
>(
    fn: (...args: P) => R,
    context?: object | null,
    args?: P,
    timeout?: number,
): Promise<R> {
    return new Promise<R>((resolve, reject) => {
        const newArgs = [ ...(args || []) ];
        // const newArgs = [ ...(args || []) ];
        setTimeout(() => {
            try {
                resolve((fn as any).apply(context, newArgs) as R);
            }
            catch (err) {
                reject(err);
            }
        }, timeout || 0);
    });
}
