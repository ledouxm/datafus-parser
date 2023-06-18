export class BooleanByteWrapper {
    static getFlag(a: number, pos: number) {
        if (pos < 0 || pos > 7) throw new Error("Bytebox overflow.");

        return (a & Math.pow(2, pos)) !== 0;
    }

    static setFlag(a: number, pos: number, b: boolean) {
        if (pos < 0 || pos > 7) throw new Error("Bytebox overflow.");

        const factor = Math.pow(2, pos);
        if (b) {
            return a | factor;
        } else {
            return a & (255 - factor);
        }
    }
}
