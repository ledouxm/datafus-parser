import { promises as fs, promises } from "fs";
import { getOutputFolder, initDatafusParser } from "./datafus";
import { ICustomDataInput } from "./buffer/DataRW";
import { BooleanByteWrapper } from "./buffer/BooleanByteWrapper";
import { chunk } from "pastable";
import path from "path";

export const getLastVersionEvents = async (version?: string) => {
  if (ref.json && ref.properties) return ref;

  if (!version) version = await initDatafusParser();

  const folder = path.join(getOutputFolder(), version, "/data/A/");

  const json = JSON.parse(await fs.readFile(folder + "events.json", "utf-8"));
  const propertiesRaw = await fs.readFile(
    folder + "events.properties",
    "utf-8"
  );
  const properties = Object.fromEntries(
    propertiesRaw.split("\n").map((line) => {
      const split = line.split("=");
      return [split[1], split[0]];
    })
  );

  ref.json = json;
  ref.properties = properties;

  return ref;
};

const ref = { json: null as any, properties: null as any } as {
  json: EntityJson;
  properties: EntityProperties;
};

export const readMessage = async (hex: string) => {
  const { json, properties } = await getLastVersionEvents();

  const input = new ICustomDataInput(Buffer.from(hex, "hex"));
  const header = input.readUnsignedShort();
  const id = extractBits(header, 14, 2);

  const lengthByteSize = extractBits(header, 2, 0);
  const entityName: string = properties[id];

  if (!entityName) throw new Error(`Unknown entity ${id}`);

  const entity: any = json[entityName] as any;

  // it seems not to be needed anymore
  // if (!isFromClient) {
  //   const instanceId = input.readUnsignedInt();
  // }

  const messageLength = readMessageLength(input, lengthByteSize);

  const inputData = Buffer.from(input.buffer.subarray(input.offset));
  const data = readEntity(new ICustomDataInput(inputData), entity);

  return data;
};

const readEntity = (input: ICustomDataInput, entity: Entity) => {
  const result: Record<string, any> = {};
  if (entity.superclass && entity.superclass !== "NetworkMessage") {
    Object.assign(result, readEntity(input, ref.json[entity.superclass]));
  }

  const { attributes, booleanAttributes } = Object.entries(
    entity.attributes
  ).reduce(
    (acc, [key, value]) => {
      if (value === "Boolean") acc.booleanAttributes.push(key);
      else acc.attributes[key] = value;

      return acc;
    },
    {
      attributes: {} as Record<string, string>,
      booleanAttributes: [] as string[],
    }
  );

  const hasMultipleBooleanAttributes = booleanAttributes.length > 1;

  if (hasMultipleBooleanAttributes && booleanAttributes.length) {
    const chunks = chunk(booleanAttributes, 8);

    for (const chunk of chunks) {
      const bitMask = input.readUnsignedByte();
      for (let i = 0; i < chunk.length; i++) {
        const booleanAttribute = chunk[i];

        result[booleanAttribute] = BooleanByteWrapper.getFlag(bitMask, i);
      }
    }
  }

  for (const [key, value] of Object.entries(
    hasMultipleBooleanAttributes ? attributes : entity.attributes
  )) {
    result[key] = readSingleAttribute(input, value);
  }

  return result;
};

const readSingleAttribute = (input: ICustomDataInput, type: string): any => {
  if (!type || type === "None") return null;

  if (type.includes("Vector<")) {
    const hasTypeId = type.includes("TypeIdVector<");
    const [vectorLengthType, vectorType] = type
      .replace(hasTypeId ? "TypeIdVector<" : "Vector<", "")
      .replace(">", "")
      .split(",");

    const vectorLength = readSingleAttribute(input, vectorLengthType);
    const vector = [];
    for (let i = 0; i < vectorLength; i++) {
      const typeId = hasTypeId && input.readUnsignedShort();
      const finalType = typeId ? ref.properties[typeId] : vectorType;
      vector.push(readSingleAttribute(input, finalType));
    }
    return vector;
  }

  if (type.includes("TypeId<")) {
    const typeId = input.readUnsignedShort();
    const finalType = ref.properties[typeId];
    return readSingleAttribute(input, finalType);
  }

  if (ref.json[type]) {
    return readEntity(input, ref.json[type]);
  }

  // @ts-ignore
  return input["read" + type]();
};

/**
 * 'VarLong',
  'Int',
  'AccountTagInformation',
  'VarInt',
  'Double',
  'Short',
  'Byte',
  'VarShort',
  'Boolean',
  'String',
  'Float',
  'uuid',
  'UnsignedInt',

 */

const readMessageLength = (input: ICustomDataInput, lengthByteSize: number) => {
  if (lengthByteSize === 0) return 0;
  if (lengthByteSize === 1) return input.readUnsignedByte();
  if (lengthByteSize === 2) return input.readUnsignedShort();
  if (lengthByteSize === 3)
    return (
      ((input.readByte() & 255) << 16) +
      ((input.readByte() & 255) << 8) +
      (input.readByte() & 255)
    );
};

const extractBits = (
  number: number,
  number_of_bits: number,
  bits_to_skip: number
) => {
  const mask = (1 << number_of_bits) - 1;
  return (number >> bits_to_skip) & mask;
};

export type EntityJson = Record<string, Entity>;
export type Entity = {
  file: string;
  id: string;
  superclass: any;
  interfaces: string[];
  attributes: Record<string, string>;
};

export type EntityProperties = Record<string, string>;
