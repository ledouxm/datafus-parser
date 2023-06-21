import {
    readUtf,
    readVarInt,
    readVarLong,
    readVarShort,
    writeUtf,
    writeVarInt,
    writeVarLong,
    writeVarShort,
} from "./bufferUtils";

export class ICustomDataInput {
    buffer: Buffer;
    offset = 0;

    constructor(initialBuffer?: Buffer) {
        this.offset = 0;

        if (initialBuffer) this.buffer = Buffer.from([...initialBuffer]);
        else this.buffer = Buffer.alloc(0);
    }

    readUtfBytes(nb: number) {
        const result = this.buffer.toString(
            "utf8",
            this.offset,
            this.offset + nb
        );
        this.offset += nb;
        return result;
    }

    readNbBytes(nb: number) {
        let str = [];
        for (let i = 0; i < nb; i++) {
            str.push(this.readUnsignedByte());
        }

        return str;
    }

    readBytes(buf: Buffer, start: number, end: number) {
        let str = "";
        for (let i = start; i < end; i++) {
            str += buf.readUInt8().toString();
        }
        this.offset += str.length;
        return str;
    }
    readBoolean() {
        const result = !!this.buffer.readUInt8(this.offset);
        this.offset += 1;
        return result;
    }
    readByte() {
        const result = this.buffer.readInt8(this.offset);
        this.offset += 1;
        return result;
    }
    readDouble() {
        const result = this.buffer.readDoubleBE(this.offset);
        this.offset += 8;
        return result;
    }
    readInt() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
    }
    readShort() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
    }
    readFloat() {
        const result = this.buffer.readFloatBE(this.offset);
        this.offset += 4;
        return result;
    }
    readUnsignedByte() {
        const result = this.buffer.readUInt8(this.offset);
        this.offset += 1;
        return result;
    }
    readUnsignedInt() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
    }
    readUnsignedShort() {
        const result = this.buffer.readUInt16BE(this.offset);
        this.offset += 2;
        return result;
    }
    readString(nb?: number) {
        return readUtf(this, nb);
    }
    readVarInt() {
        return readVarInt(this);
    }
    readVarLong() {
        return readVarLong(this);
    }
    readVarShort() {
        return readVarShort(this);
    }
    readVarUhInt() {
        return readVarInt(this);
    }
    readVarUhLong() {
        return readVarLong(this);
    }
    readVarUhShort() {
        return readVarShort(this);
    }
}
export class ICustomDataOutput {
    buffer: Buffer;
    offset: number;

    constructor(initialBuffer?: Buffer) {
        this.offset = 0;
        if (initialBuffer) this.buffer = initialBuffer;
        else this.buffer = Buffer.alloc(65535 * 3);
    }

    append(buffer: Buffer) {
        const trimed = this.trim();

        this.buffer = Buffer.concat([trimed, buffer]);

        return this.buffer;
    }

    trim() {
        return this.buffer.subarray(0, this.offset);
    }

    writeBytes(buf: Buffer) {
        const intBuffer = Int8Array.from(buf);
        for (let i = 0; i < buf.length; i++) {
            this.writeByte(intBuffer[i]);
        }
    }
    writeUnsignedBytes(buf: Buffer) {
        for (let i = 0; i < buf.length; i++) {
            this.writeUnsignedByte(buf[i]);
        }
    }
    writeBoolean(value: boolean) {
        const result = !!this.buffer.writeUInt8(value ? 1 : 0, this.offset);
        this.offset += 1;
        return result;
    }
    writeByte(num: number) {
        const result = this.buffer.writeInt8(num, this.offset);
        this.offset += 1;
        return result;
    }

    writeDouble(num: number) {
        const result = this.buffer.writeDoubleBE(num, this.offset);
        this.offset += 8;
        return result;
    }
    writeInt(num: number) {
        const result = this.buffer.writeInt32BE(num, this.offset);
        this.offset += 4;
        return result;
    }
    writeShort(num: number) {
        const result = this.buffer.writeInt16BE(num, this.offset);
        this.offset += 2;
        return result;
    }
    writeString(str: string) {
        return writeUtf(this, str);
    }
    writeFloat(num: number) {
        const result = this.buffer.writeFloatBE(num, this.offset);
        this.offset += 4;
        return result;
    }
    writeUnsignedByte(num: number) {
        const result = this.buffer.writeUInt8(num, this.offset);
        this.offset += 1;
        return result;
    }
    writeUnsignedInt(num: number) {
        const result = this.buffer.writeUInt32BE(num, this.offset);
        this.offset += 4;
        return result;
    }
    writeUnsignedShort(num: number) {
        const result = this.buffer.writeUInt16BE(num, this.offset);
        this.offset += 2;
        return result;
    }
    writeUTF(data: string, noCount?: boolean) {
        return writeUtf(this, data, noCount);
    }
    writeVarInt(num: number) {
        return writeVarInt(this, num);
    }
    writeVarLong(num: number) {
        return writeVarLong(this, num);
    }
    writeVarShort(num: number) {
        return writeVarShort(this, num);
    }
    writeVarUhInt(num: number) {
        return writeVarInt(this, num);
    }
    writeVarUhLong(num: number) {
        return writeVarLong(this, num);
    }
    writeVarUhShort(num: number) {
        return writeVarShort(this, num);
    }
}
