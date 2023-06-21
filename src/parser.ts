import { Entity, getLastVersionEvents } from "./datafus";
import { ICustomDataInput } from "./buffer/DataRW";
import { BooleanByteWrapper } from "./buffer/BooleanByteWrapper";
import { chunk } from "pastable";

export const readMessage = async (hex: string) => {
    const { json, properties } = getLastVersionEvents();

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

    readMessageLength(input, lengthByteSize);

    const inputData = Buffer.from(input.buffer.subarray(input.offset));
    const data = readEntity(
        new ICustomDataInput(inputData),
        entity,
        entityName
    );

    return data;
};

const readEntity = (
    input: ICustomDataInput,
    entity: Entity,
    entityName: string
) => {
    const { json } = getLastVersionEvents();
    const result: Record<string, any> = {};
    if (entity.superclass && entity.superclass !== "NetworkMessage") {
        Object.assign(
            result,
            readEntity(input, json[entity.superclass], entity.superclass)
        );
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

                result[booleanAttribute] = BooleanByteWrapper.getFlag(
                    bitMask,
                    i
                );
            }
        }
    }

    for (const [key, value] of Object.entries(
        hasMultipleBooleanAttributes ? attributes : entity.attributes
    )) {
        result[key] = readSingleAttribute(input, value);
    }

    return { ...result, _name: entityName };
};

const readSingleAttribute = (input: ICustomDataInput, type: string): any => {
    if (!type || type === "None") return null;

    const { properties, json } = getLastVersionEvents();

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
            const finalType = typeId ? properties[typeId] : vectorType;
            vector.push(readSingleAttribute(input, finalType));
        }
        return vector;
    }

    if (type.includes("TypeId<")) {
        const typeId = input.readUnsignedShort();
        const finalType = properties[typeId];
        return readSingleAttribute(input, finalType);
    }

    if (json[type]) {
        return readEntity(input, json[type], type);
    }

    // @ts-ignore
    return input["read" + type]();
};

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
