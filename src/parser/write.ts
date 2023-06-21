import { Entity, getLastVersionEvents } from "../datafus";
import { ICustomDataOutput } from "../buffer/DataRW";
import { getEntityAttributes } from "./read";
import { chunk } from "pastable";
import { BooleanByteWrapper } from "../buffer/BooleanByteWrapper";

export const writeMessage = (data: any) => {
    const { json } = getLastVersionEvents();
    const messageContentBuffer = new ICustomDataOutput();

    const entityName = data._name;
    const entity = json[entityName] as Entity;

    writeEntity(data, entity, messageContentBuffer);

    const messageContent = messageContentBuffer.trim();

    const typeLenCode = getTypeLenCode(messageContent.byteLength);
    const header = (Number(entity.id) << 2) | typeLenCode;

    const output = new ICustomDataOutput();

    output.writeUnsignedShort(header);

    writeTypeLen(output, typeLenCode, messageContent.byteLength);
    output.append(messageContent);

    return output;
};

const writeEntity = (data: any, entity: Entity, output: ICustomDataOutput) => {
    const { json } = getLastVersionEvents();
    if (entity.superclass && entity.superclass !== "NetworkMessage") {
        writeEntity(data, json[entity.superclass], output);
    }

    const { attributes, booleanAttributes } = getEntityAttributes(entity);
    const hasMultipleBooleanAttributes = booleanAttributes.length > 1;

    if (hasMultipleBooleanAttributes) {
        const chunks = chunk(booleanAttributes, 8);

        for (const chunk of chunks) {
            let bitMask = 0;
            for (let i = 0; i < chunk.length; i++) {
                const booleanAttribute = chunk[i];

                if (data[booleanAttribute]) {
                    bitMask = BooleanByteWrapper.setFlag(bitMask, i, true);
                }
            }

            output.writeUnsignedByte(bitMask);
        }
    }

    const remainingAttributes = hasMultipleBooleanAttributes
        ? attributes
        : entity.attributes;

    for (const [key, value] of Object.entries(remainingAttributes || {})) {
        writeSingleAttribute(data[key], value, output);
    }
};
const writeSingleAttribute = (
    data: any,
    type: string,
    output: ICustomDataOutput
): any => {
    if (!type || type === "None") return null;

    const { properties, json } = getLastVersionEvents();

    if (type.includes("Vector<")) {
        const hasTypeId = type.includes("TypeIdVector<");
        const [vectorLengthType, vectorType] = type
            .replace(hasTypeId ? "TypeIdVector<" : "Vector<", "")
            .replace(">", "")
            .split(",");

        writeSingleAttribute(data.length, vectorLengthType, output);
        for (let i = 0; i < data.length; i++) {
            const item = data[i];

            if (hasTypeId) {
                const typeId = Number(json[item._name].id);
                output.writeUnsignedShort(typeId);
            }

            writeSingleAttribute(item, vectorType, output);
        }
        return;
    }

    if (type.includes("TypeId<")) {
        const typeId = Number(json[data._name].id);
        output.writeUnsignedShort(typeId);

        const finalType = properties[typeId];
        return writeSingleAttribute(data, finalType, output);
    }

    if (json[type]) {
        return writeEntity(data, json[type], output);
    }

    // @ts-ignore
    return output["write" + type](data);
};

const getTypeLenCode = (length: number) => {
    if (length > 65535) return 3;
    if (length > 255) return 2;
    if (length > 0) return 1;
    return 0;
};

const writeTypeLen = (
    output: ICustomDataOutput,
    typeLenCode: number,
    length: number
) => {
    switch (typeLenCode) {
        case 0:
            return;
        case 1:
            output.writeUnsignedByte(length);
            break;
        case 2:
            output.writeShort(length);
            break;
        case 3:
            const high = (length >> 16) & 255;
            const low = length & 65535;

            output.writeUnsignedByte(high);
            output.writeUnsignedByte(low);
    }
};
