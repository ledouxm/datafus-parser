import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import {
    downloadAndExtractDatafusZip,
    getLatestRelease,
    getOutputFolder,
    initDatafusParser,
} from "../src/datafus";
import { readMessage } from "../src";
import { writeMessage } from "../src/parser/write";

describe("datafus-parser", () => {
    const outputFolder = getOutputFolder();

    it("should download datafus zip file", async () => {
        const release = await getLatestRelease({
            owner: "ledouxm",
            repo: "datafus",
        });
        await downloadAndExtractDatafusZip(release);

        const files = await fs.readdir(outputFolder);
        expect(files).toContain(release.version);

        const AFiles = await fs.readdir(
            `${outputFolder}/${release.version}/data/A`
        );

        expect(AFiles).toContain("events.json");
        expect(AFiles).toContain("events.properties");
    });

    it("should parse a packet", async () => {
        await initDatafusParser();
        const { entity } = readMessage(
            "58c12604b79a01000000000000010100000032000a4a75616e2d426f6d6261427889362ce540000000"
        );
        expect(entity._name).toBe("RecruitmentInformationMessage");
    });

    it("should write a packet", async () => {
        await initDatafusParser();

        const result = writeMessage({
            recruitmentData: {
                minLevelFacultative: false,
                invalidatedByModeration: false,
                recruitmentAutoLocked: true,
                socialId: 19767,
                recruitmentType: 0,
                recruitmentTitle: "",
                recruitmentText: "",
                selectedLanguages: [1],
                selectedCriterion: [],
                minLevel: 50,
                lastEditPlayerName: "Juan-Bomba",
                lastEditDate: 1686099906132,
                _name: "GuildRecruitmentInformation",
                minSuccess: 0,
                minSuccessFacultative: false,
            },
            _name: "RecruitmentInformationMessage",
        });

        expect(result.buffer.toString("hex")).toBe(
            "58c12604b79a01000000000000010100000032000a4a75616e2d426f6d6261427889362ce540000000"
        );
    });

    it("should parse a packet with extra data at the end", async () => {
        await initDatafusParser();
        const hex =
            "58c12604b79a01000000000000010100000032000a4a75616e2d426f6d6261427889362ce5400000009999";
        const { entity, usedBytes } = readMessage(hex);

        expect(entity._name).toBe("RecruitmentInformationMessage");
        expect(usedBytes).toBe(hex.length / 2 - 2);
    });

    afterAll(async () => {
        try {
            await fs.rm(outputFolder, { recursive: true, force: true });
        } catch {}
    });
});
