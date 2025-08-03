"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = tagsIntersect;
function tagsIntersect(t1, t2) {
    for (const tag of t1) {
        if (t2.indexOf(tag) !== -1) {
            return true;
        }
    }
    return false;
}
