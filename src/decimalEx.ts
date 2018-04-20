import { Decimal } from 'decimal.js-light';
declare module 'decimal.js-light' {
  interface Decimal {
    render(): number;
  }
}

Decimal.prototype.render = function() {
  return this.toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();
}
