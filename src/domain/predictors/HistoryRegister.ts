import type { Outcome } from "../shared/Outcome";
import { assertNonNegativeInteger, assertPositiveInteger, toBitString } from "../shared/BitString";

export class HistoryRegister {
  readonly bits: number;
  readonly value: number;

  constructor(bits: number, value: number) {
    assertPositiveInteger(bits, "bits");
    assertNonNegativeInteger(value, "value");

    const maxValue = 2 ** bits - 1;
    if (value > maxValue) {
      throw new RangeError(`history value ${value} exceeds ${bits}-bit maximum ${maxValue}`);
    }

    this.bits = bits;
    this.value = value;
  }

  shiftIn(actual: Outcome): HistoryRegister {
    const nextBit = actual === "T" ? 1 : 0;
    const nextValue = ((this.value << 1) | nextBit) % 2 ** this.bits;

    return new HistoryRegister(this.bits, nextValue);
  }

  toBits(): string {
    return toBitString(this.value, this.bits);
  }
}
