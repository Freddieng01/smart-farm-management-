// One place for how money is shown across the whole system.
// The system uses the Zambian kwacha (ZMW), written as K1,250.00.
export const CURRENCY_SYMBOL = 'K';
export const CURRENCY_CODE = 'ZMW';

export const money = (n) => {
    const value = Number(n || 0);
    const text = Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    // a negative amount reads "-K1,250.00", not "K-1,250.00"
    return `${value < 0 && text !== '0.00' ? '-' : ''}${CURRENCY_SYMBOL}${text}`;
};
