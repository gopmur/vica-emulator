import { Reg, Op } from "viasm";

enum Fl {
    OVERFLOW,
    LESS,
    EQUAL,
    CIAE,
    CIBE,
    EIAE,
    EIBE,
}

type Register = { name: string; value: number };

export class Vica {
    readonly _memory_SIZE: number;
    readonly REGISTER_SIZE: number = 18;

    private _memory: number[];
    private _registers: Register[];

    constructor(_memorySize: number) {
        this._memory_SIZE = _memorySize;
        this._memory = new Array(this._memory_SIZE);
        this._registers = new Array(this.REGISTER_SIZE);
        this.init();
    }

    loadFile(code: string) {
        for (let i = 0; i < code.length; i += 2) {
            this._memory[i >> 1] = parseInt(code.substring(i, i + 2), 16);
        }
    }

    init() {
        for (let i = 0; i < this._memory_SIZE; i++) {
            this._memory[i] = 0;
        }
        for (
            let registerNumber = 0;
            registerNumber < this.REGISTER_SIZE;
            registerNumber++
        ) {
            this._registers[registerNumber] = {
                name: Reg[registerNumber],
                value: 0,
            };
        }
        this._registers[Reg.sp].value = this._memory_SIZE - 4;
    }

    get registers(): Register[] {
        return this._registers;
    }

    get memory(): number[] {
        return this._memory;
    }

    // ? probably has problems with 32bit values
    // ! needs testing for 32bit values
    nextInstruction() {
        let pp = this._registers[Reg.pp].value;
        let op = this._memory[pp];
        let rd = this._memory[pp + 1];
        let ra = this._memory[pp + 2];
        let rb = this._memory[pp + 3];
        let shifts = this._memory[pp + 3];
        let immediate = 0;
        for (let i = 1; i <= 4; i++) {
            immediate <<= 8;
            immediate += this._memory[pp + i + 1];
        }
        let tempWord;
        switch (op as Op) {
            case Op.add:
                this._registers[rd].value =
                    this._registers[ra].value + this._registers[rb].value;
                this._registers[Reg.pp].value += 4;
                break;

            case Op.and:
                this._registers[rd].value =
                    this._registers[ra].value & this._registers[rb].value;
                this._registers[Reg.pp].value += 4;
                break;

            case Op.cmp:
                if (this._registers[rd] < this._registers[ra]) {
                    this._registers[Reg.fl].value |= 1 << Fl.LESS;
                } else {
                    this._registers[Reg.fl].value &= ~(1 << Fl.LESS);
                }
                if (this._registers[rd] == this._registers[ra]) {
                    this._registers[Reg.fl].value |= 1 << Fl.EQUAL;
                } else {
                    this._registers[Reg.fl].value &= ~(1 << Fl.EQUAL);
                }
                this._registers[Reg.pp].value += 3;
                break;

            // ! unsafe implementation
            // ! needs to write only in GPRs
            case Op.div:
                this._registers[rd].value =
                    this._registers[ra].value / this._registers[rb].value;
                this._registers[rd + 1].value =
                    this._registers[ra].value % this._registers[rb].value;
                this._registers[Reg.pp].value += 4;
                break;

            case Op.jeq:
                if (this._registers[Reg.fl].value & (1 << Fl.EQUAL)) {
                    this._registers[Reg.pp].value = this._registers[rd].value;
                } else {
                    this._registers[Reg.pp].value += 2;
                }
                break;

            case Op.jge:
                if (!(this._registers[Reg.fl].value & (1 << Fl.LESS))) {
                    this._registers[Reg.pp].value = this._registers[rd].value;
                } else {
                    this._registers[Reg.pp].value += 2;
                }
                break;

            case Op.jgt:
                if (
                    !(this._registers[Reg.fl].value & (1 << Fl.LESS)) &&
                    !(this._registers[Reg.fl].value & (1 << Fl.EQUAL))
                ) {
                    this._registers[Reg.pp].value = this._registers[rd].value;
                } else {
                    this._registers[Reg.pp].value += 2;
                }
                break;

            case Op.jle:
                if (
                    this._registers[Reg.fl].value & (1 << Fl.LESS) ||
                    this._registers[Reg.fl].value & (1 << Fl.EQUAL)
                ) {
                    this._registers[Reg.pp].value = this._registers[rd].value;
                } else {
                    this._registers[Reg.pp].value += 2;
                }
                break;

            case Op.jlt:
                if (this._registers[Reg.fl].value & (1 << Fl.LESS)) {
                    this._registers[Reg.pp].value = this._registers[rd].value;
                } else {
                    this._registers[Reg.pp].value += 2;
                }
                break;

            case Op.jmp:
                this._registers[Reg.pp].value = this._registers[rd].value;
                break;

            case Op.jnq:
                if (!(this._registers[Reg.fl].value & (1 << Fl.EQUAL))) {
                    this._registers[Reg.pp].value = this._registers[rd].value;
                } else {
                    this._registers[Reg.pp].value += 2;
                }
                break;

            case Op.li:
                this._registers[rd].value = immediate;
                this._registers[Reg.pp].value += 6;
                break;

            // ! address should be mult of 4
            case Op.load:
                tempWord = 0;
                for (let i = 0; i < 3; i++) {
                    tempWord <<= 8;
                    tempWord += this._memory[this._registers[ra].value + i];
                }
                this._registers[rd].value = tempWord;
                this._registers[Reg.pp].value += 3;
                break;

            // ! unsafe just like div
            // ! for now only support for lower word is implemented
            case Op.mul:
                this._registers[rd].value +=
                    this._registers[ra].value * this._registers[rb].value;
                this._registers[Reg.pp].value += 4;
                break;

            case Op.mv:
                this._registers[rd].value = this._registers[ra].value;
                this._registers[Reg.pp].value += 3;
                break;

            case Op.not:
                this._registers[rd].value = ~this._registers[ra].value;
                this._registers[Reg.pp].value += 3;
                break;

            case Op.or:
                this._registers[rd].value =
                    this._registers[ra].value | this._registers[rb].value;
                this._registers[Reg.pp].value += 4;
                break;

            case Op.pop:
                tempWord = 0;
                for (let i = 0; i < 3; i++) {
                    tempWord <<= 8;
                    tempWord += this._memory[this._registers[Reg.sp].value + i];
                }
                this._registers[rd].value = tempWord;
                this._registers[Reg.pp].value += 2;
                break;

            case Op.push:
                this._registers[Reg.sp].value -= 4;
                for (let i = 0; i < 3; i++) {
                    this._memory[this._registers[Reg.sp].value + i] =
                        (this._registers[rd].value >> ((3 - i) * 8)) &
                        ((1 << 8) - 1);
                }
                this._registers[Reg.pp].value += 2;
                break;

            case Op.shl:
                this._registers[rd].value = this._registers[ra].value << shifts;
                this._registers[Reg.pp].value += 4;
                break;

            case Op.shr:
                this._registers[rd].value = this._registers[ra].value >> shifts;
                this._registers[Reg.pp].value += 4;
                break;

            case Op.shra:
                this._registers[rd].value = this._registers[ra].value >>> shifts;
                this._registers[Reg.pp].value += 4;
                break;

            case Op.store:
                for (let i = 0; i < 3; i++) {
                    this._memory[this._registers[rd].value + i] =
                        (this._registers[ra].value >> ((3 - i) * 8)) &
                        ((1 << 8) - 1);
                }
                this._registers[Reg.sp].value += 3;
                break;

            case Op.sub:
                this._registers[rd].value =
                    this._registers[ra].value - this._registers[rb].value;
                this._registers[Reg.pp].value += 4;
                break;
        }
    }
}
