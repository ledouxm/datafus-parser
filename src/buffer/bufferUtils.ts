import { ICustomDataInput, ICustomDataOutput } from "./DataRW";

const MASK_10000000 = 128;
const MASK_01111111 = 127;
const SHORT_SIZE = 16;

const INT_SIZE = 32;
const CHUNCK_BIT_SIZE = 7;
const SHORT_MAX_VALUE = 32767;
const SHORT_MIN_VALUE = -32768;
const UNSIGNED_SHORT_MAX_VALUE = 65536;

export const readVarInt = (input: ICustomDataInput) => {
  var _loc4_: number = 0;
  var _loc1_: number = 0;
  var _loc2_: number = 0;
  var _loc3_: boolean = false;
  while (_loc2_ < INT_SIZE) {
    _loc4_ = input.readUnsignedByte();
    _loc3_ = (_loc4_ & MASK_10000000) === MASK_10000000;
    if (_loc2_ > 0) {
      _loc1_ = _loc1_ + ((_loc4_ & MASK_01111111) << _loc2_);
    } else {
      _loc1_ = _loc1_ + (_loc4_ & MASK_01111111);
    }
    _loc2_ = _loc2_ + CHUNCK_BIT_SIZE;
    if (!_loc3_) {
      return _loc1_;
    }
  }
  throw new Error("Too much data");
};

export const readVarLong = (input: ICustomDataInput) => {
  let low = 0;
  let high = 0;
  let size = 0;
  let lastByte = 0;
  while (true) {
    lastByte = input.readUnsignedByte();
    if (size === 28) {
      break;
    }
    if (lastByte >= 128) {
      low = low | ((lastByte & 127) << size);
      size += 7;
      continue;
    }
    low = low | (lastByte << size);
    return low;
  }
  if (lastByte >= 128) {
    lastByte = lastByte & 127;
    low = low | (lastByte << size);
    high = lastByte >>> 4;
    size = 3;
    while (true) {
      lastByte = input.readUnsignedByte();
      if (size < 32) {
        if (lastByte >= 128) {
          high = high | ((lastByte & 127) << size);
        } else {
          break;
        }
      }
      size += 7;
    }
    high = high | (lastByte << size);
    return high * 4294967296 + low;
  }

  low = low | (lastByte << size);
  high = lastByte >>> 4;
  return high * 4294967296 + low;
};

export const readVarShort = (input: ICustomDataInput): number => {
  var _loc4_: number = 0;
  var _loc1_: number = 0;
  var _loc2_: number = 0;
  var _loc3_: boolean = false;
  while (_loc2_ < SHORT_SIZE) {
    _loc4_ = input.readUnsignedByte();
    _loc3_ = (_loc4_ & MASK_10000000) === MASK_10000000;
    if (_loc2_ > 0) {
      _loc1_ = _loc1_ + ((_loc4_ & MASK_01111111) << _loc2_);
    } else {
      _loc1_ = _loc1_ + (_loc4_ & MASK_01111111);
    }
    _loc2_ = _loc2_ + CHUNCK_BIT_SIZE;
    if (!_loc3_) {
      if (_loc1_ > SHORT_MAX_VALUE) {
        _loc1_ = _loc1_ - UNSIGNED_SHORT_MAX_VALUE;
      }
      return _loc1_;
    }
  }
  throw new Error("Too much data");
};

export const readUtf = (input: ICustomDataInput, number?: number) => {
  const nb = number ?? input.readUnsignedShort();
  let str = "";
  for (let i = 0; i < nb; i++) {
    str += String.fromCharCode(input.readUnsignedByte());
  }

  return str;
};

export const writeUtf = (
  output: ICustomDataOutput,
  str: string,
  noCount?: boolean
) => {
  if (!noCount) output.writeShort(str.length);

  const buf = Buffer.from(str);
  for (let i = 0; i < str.length; i++) {
    output.writeUnsignedByte(buf[i]);
  }
};

export const writeVarInt = (output: ICustomDataOutput, value: number) => {
  var _loc5_ = 0;
  var _loc2_ = new ICustomDataOutput();

  if (value >= 0 && value <= MASK_01111111) {
    _loc2_.writeUnsignedByte(value);
    output.writeUnsignedBytes(_loc2_.trim());
    return;
  }
  var _loc3_ = value;
  var _loc4_ = new ICustomDataOutput();
  while (_loc3_ !== 0) {
    _loc4_.writeUnsignedByte(_loc3_ & MASK_01111111);

    const reader = new ICustomDataInput(_loc4_.trim());
    reader.offset = reader.buffer.length - 1;

    _loc5_ = reader.readByte();
    _loc3_ = _loc3_ >>> CHUNCK_BIT_SIZE;
    if (_loc3_ > 0) {
      _loc5_ = _loc5_ | MASK_10000000;
    }
    _loc2_.writeUnsignedByte(_loc5_);
  }
  output.writeUnsignedBytes(_loc2_.trim());
};

export const writeVarShort = (output: ICustomDataOutput, value: number) => {
  var _loc5_ = 0;
  if (value > SHORT_MAX_VALUE || value < SHORT_MIN_VALUE) {
    throw new Error("Forbidden value");
  }
  var _loc2_ = new ICustomDataOutput();
  let loc2Offset = 0;
  if (value >= 0 && value <= MASK_01111111) {
    _loc2_.writeUnsignedByte(value);
    loc2Offset++;
    output.writeUnsignedBytes(_loc2_.trim());
    return;
  }
  var _loc3_ = value & 65535;
  var _loc4_ = new ICustomDataOutput();
  let loc4Offset = 0;
  while (_loc3_ !== 0) {
    _loc4_.writeUnsignedByte(_loc3_ & MASK_01111111);
    loc4Offset++;

    const reader = new ICustomDataInput(_loc4_.trim());
    reader.offset = reader.buffer.length - 1;

    _loc5_ = reader.readByte();
    _loc3_ = _loc3_ >>> CHUNCK_BIT_SIZE;
    if (_loc3_ > 0) {
      _loc5_ = _loc5_ | MASK_10000000;
    }
    _loc2_.writeUnsignedByte(_loc5_);
  }
  output.writeUnsignedBytes(_loc2_.trim());
};

const makeInt64 = (num: number) => {
  const high = Math.floor(num / 4294967296);
  return {
    low: num,
    high: high === 0 ? 0 : high | 1,
  };
};

const writeint32 = (output: ICustomDataOutput, number: number) => {
  while (number >= 128) {
    output.writeUnsignedByte((number & 127) | 128);
    number >>>= 7;
  }
  output.writeUnsignedByte(number);
};

export const writeVarLong = (output: ICustomDataOutput, value: number) => {
  const local_2 = makeInt64(value);

  if (local_2.high == 0) {
    writeint32(output, local_2.low);
  } else {
    for (let i = 0; i < 4; i++) {
      output.writeUnsignedByte((local_2.low & 127) | 128);
      local_2.low >>>= 7;
    }
    if ((local_2.high & (268435455 << 3)) == 0) {
      output.writeUnsignedByte((local_2.high << 4) | local_2.low);
    } else {
      const b = (((local_2.high << 4) | local_2.low) & 127) | 128;
      output.writeUnsignedByte(b);
      writeint32(output, local_2.high >>> 3);
    }
  }
};
