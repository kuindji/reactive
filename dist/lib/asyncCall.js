"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = asyncCall;
function asyncCall(fn, context, args, timeout) {
    return new Promise((resolve, reject) => {
        const newArgs = [...(args || [])];
        // const newArgs = [ ...(args || []) ];
        setTimeout(() => {
            try {
                resolve(fn.apply(context, newArgs));
            }
            catch (err) {
                reject(err);
            }
        }, timeout || 0);
    });
}
