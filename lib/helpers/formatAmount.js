"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reverseString = (toReverse) => {
    return toReverse.split('').reverse().join('');
};
const formatAmount = (amount, size, insert) => {
    const splitedNumber = amount.toString().split('.');
    const wholeNumber = splitedNumber[0];
    const decimal = splitedNumber[1] || 0;
    let formattedAmount = reverseString(wholeNumber.toString());
    const regex = new RegExp('.{1,' + size + '}', 'g');
    const matchResult = formattedAmount.match(regex);
    if (matchResult === null) {
        return '';
    }
    formattedAmount = matchResult.join(insert);
    if (decimal) {
        formattedAmount = `${decimal}.${matchResult.join(insert)}`;
    }
    return reverseString(formattedAmount);
};
exports.default = formatAmount;
//# sourceMappingURL=formatAmount.js.map