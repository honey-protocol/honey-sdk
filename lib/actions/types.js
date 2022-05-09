"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSuccess = exports.makeError = void 0;
function makeError(error) {
    return { type: 'error', error };
}
exports.makeError = makeError;
function makeSuccess(t) {
    return { type: 'success', value: t };
}
exports.makeSuccess = makeSuccess;
//# sourceMappingURL=types.js.map