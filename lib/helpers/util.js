"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Amount = exports.TokenAmount = exports.timeout = exports.shortenPubkey = exports.totalAbbrev = exports.currencyFormatter = exports.setDark = exports.checkDarkTheme = void 0;
const anchor_1 = require("@project-serum/anchor");
// Check for localStorage dark theme preference
// and set if necessary
const checkDarkTheme = async () => {
    const darkTheme = localStorage.getItem('jetDark') === 'true';
    if (darkTheme) {
        (0, exports.setDark)(darkTheme);
    }
};
exports.checkDarkTheme = checkDarkTheme;
// Toggle dark theme root CSS attributes
const setDark = (darkTheme) => {
    if (darkTheme) {
        document.documentElement.style.setProperty('--jet-green', '#53bd9f');
        document.documentElement.style.setProperty('--jet-blue', '#32a5d3');
        document.documentElement.style.setProperty('--black', '#ffffff');
        document.documentElement.style.setProperty('--dark-grey', '#e1e7f1');
        document.documentElement.style.setProperty('--grey', '#504f4f');
        document.documentElement.style.setProperty('--light-grey', '#494848');
        document.documentElement.style.setProperty('--white', '#444444');
        document.documentElement.style.setProperty('--light-shadow', 'rgb(82, 82, 82)');
        document.documentElement.style.setProperty('--dark-shadow', 'rgb(54, 54, 54)');
        document.documentElement.style.setProperty('--input-color', 'rgba(255, 255, 255, 0.8)');
        document.documentElement.style.setProperty('--range-slider-bg', 'rgba(0, 0, 0, 0.25)');
    }
    else {
        document.documentElement.style.setProperty('--jet-green', '#3d9e83');
        document.documentElement.style.setProperty('--jet-blue', '#278db6');
        document.documentElement.style.setProperty('--black', '#1a495e');
        document.documentElement.style.setProperty('--dark-grey', '#949494');
        document.documentElement.style.setProperty('--grey', '#d8dfec');
        document.documentElement.style.setProperty('--light-grey', '#e1e7f1');
        document.documentElement.style.setProperty('--white', '#e5ebf4');
        document.documentElement.style.setProperty('--light-shadow', 'rgb(255, 255, 255)');
        document.documentElement.style.setProperty('--dark-shadow', 'rgb(175, 186, 214)');
        document.documentElement.style.setProperty('--input-color', 'rgba(26, 73, 94, 0.8)');
        document.documentElement.style.setProperty('--range-slider-bg', 'rgba(255, 255, 255, 0.25)');
    }
    localStorage.setItem('jetDark', JSON.stringify(darkTheme));
};
exports.setDark = setDark;
// Format USD or crypto with default or desired decimals
const currencyFormatter = (value, usd, digits) => {
    let currencyFormat;
    let uiCurrency;
    if (usd) {
        currencyFormat = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: digits ?? 2,
        });
    }
    else {
        currencyFormat = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: digits ?? 8,
            maximumFractionDigits: digits ?? 8,
        });
    }
    // Set and strip trailing 0's / unnecessary decimal if not USD
    uiCurrency = currencyFormat.format(value);
    if (!usd) {
        while (uiCurrency.indexOf('.') !== -1 &&
            (uiCurrency[uiCurrency.length - 1] === '0' || uiCurrency[uiCurrency.length - 1] === '.')) {
            uiCurrency = uiCurrency.substring(0, uiCurrency.length - 1);
        }
    }
    return uiCurrency;
};
exports.currencyFormatter = currencyFormatter;
// Abbreviate large totals
const totalAbbrev = (total, price, native, digits) => {
    let t = total;
    if (price && native === false) {
        t = total * price;
    }
    if (t > 1000000000) {
        return `${native ? '' : '$'}${(t / 1000000000).toFixed(1)}B`;
    }
    else if (t > 1000000) {
        return `${native ? '' : '$'}${(t / 1000000).toFixed(1)}M`;
    }
    else {
        return (0, exports.currencyFormatter)(t, !native, native ? digits : 2);
    }
};
exports.totalAbbrev = totalAbbrev;
// Shorten a pubkey with ellipses
const shortenPubkey = (pubkey, halfLength) => {
    return `${pubkey.substring(0, halfLength)}...${pubkey.substring(pubkey.length - halfLength)}`;
};
exports.shortenPubkey = shortenPubkey;
// Manual timeout promise to pause program execution
const timeout = (ms) => {
    return new Promise((res) => {
        setTimeout(() => res(true), ms);
    });
};
exports.timeout = timeout;
// Token Amounts
class TokenAmount {
    constructor(amount, decimals) {
        if (!anchor_1.BN.isBN(amount)) {
            console.warn('Amount is not a BN', amount);
            amount = new anchor_1.BN(0);
        }
        this.amount = amount;
        this.decimals = decimals;
        this.uiAmountFloat = TokenAmount.tokenAmount(amount, decimals);
        this.uiAmount = this.uiAmountFloat.toString();
    }
    static zero(decimals) {
        return new TokenAmount(new anchor_1.BN(0), decimals ?? 0);
    }
    static tokenAccount(tokenAccount, decimals) {
        return new TokenAmount(tokenAccount.amount, decimals);
    }
    static mint(mint) {
        return new TokenAmount(new anchor_1.BN(mint.supply), mint.decimals);
    }
    static tokens(tokenAmount, decimals) {
        return new TokenAmount(TokenAmount.tokensToLamports(tokenAmount, decimals), decimals);
    }
    static tokenAmount(lamports, decimals) {
        const str = lamports.toString(10, decimals);
        return parseFloat(str.slice(0, -decimals) + '.' + str.slice(-decimals));
    }
    static tokenPrice(marketValue, price, decimals) {
        const tokens = price !== 0 ? marketValue / price : 0;
        return TokenAmount.tokens(tokens.toFixed(decimals), decimals);
    }
    // Convert a uiAmount string into lamports BN
    static tokensToLamports(uiAmount, decimals) {
        // Convert from exponential notation (7.46e-7) to regular
        if (uiAmount.indexOf('e+') !== -1 || uiAmount.indexOf('e-') !== -1) {
            uiAmount = Number(uiAmount).toLocaleString('fullwide', { useGrouping: false });
        }
        let lamports = uiAmount;
        // Remove commas
        while (lamports.indexOf(',') !== -1) {
            lamports = lamports.replace(',', '');
        }
        // Determine if there's a decimal, take number of
        // characters after it as fractionalValue
        let fractionalValue = 0;
        let initialPlace = lamports.indexOf('.');
        if (initialPlace !== -1) {
            fractionalValue = lamports.length - (initialPlace + 1);
            // If fractional value is lesser than a lamport, round to nearest lamport
            if (fractionalValue > decimals) {
                lamports = String(parseFloat(lamports).toFixed(decimals));
            }
            // Remove decimal
            lamports = lamports.replace('.', '');
        }
        // Append zeros
        for (let i = 0; i < decimals - fractionalValue; i++) {
            lamports += '0';
        }
        // Return BN value in lamports
        return new anchor_1.BN(lamports);
    }
    add(b) {
        return this.do(b, anchor_1.BN.prototype.add);
    }
    addb(b) {
        return new TokenAmount(this.amount.add(b), this.decimals);
    }
    addn(b) {
        return new TokenAmount(this.amount.addn(b), this.decimals);
    }
    sub(b) {
        return this.do(b, anchor_1.BN.prototype.sub);
    }
    subb(b) {
        return new TokenAmount(this.amount.sub(b), this.decimals);
    }
    subn(b) {
        return new TokenAmount(this.amount.subn(b), this.decimals);
    }
    mul(b) {
        return this.do(b, anchor_1.BN.prototype.mul);
    }
    mulb(b) {
        return new TokenAmount(this.amount.mul(b), this.decimals);
    }
    muln(b) {
        return new TokenAmount(this.amount.muln(b), this.decimals);
    }
    div(b) {
        return this.do(b, anchor_1.BN.prototype.div);
    }
    divb(b) {
        return new TokenAmount(this.amount.div(b), this.decimals);
    }
    divn(b) {
        return new TokenAmount(this.amount.divn(b), this.decimals);
    }
    lt(b) {
        return this.amount.lt(b.amount);
    }
    gt(b) {
        return this.amount.gt(b.amount);
    }
    eq(b) {
        return this.amount.eq(b.amount);
    }
    isZero() {
        return this.amount.isZero();
    }
    do(b, fn) {
        if (this.decimals !== b.decimals) {
            console.warn('Decimal mismatch');
            return TokenAmount.zero(this.decimals);
        }
        let amount = fn.call(this.amount, b.amount);
        return new TokenAmount(amount, this.decimals);
    }
}
exports.TokenAmount = TokenAmount;
class Amount {
    constructor(units, value) {
        this.units = units;
        this.value = value;
    }
    static tokens(amount) {
        return new Amount({ tokens: {} }, new anchor_1.BN(amount));
    }
    static depositNotes(amount) {
        return new Amount({ depositNotes: {} }, new anchor_1.BN(amount));
    }
    static loanNotes(amount) {
        return new Amount({ loanNotes: {} }, new anchor_1.BN(amount));
    }
}
exports.Amount = Amount;
//# sourceMappingURL=util.js.map