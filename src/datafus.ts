import axios from "axios";
import { promises as fs, createWriteStream } from "fs";
import decompress from "decompress";
import { getOrCreateFolder } from "./utils";
import path from "path";

const ref = {
    json: null as any,
    properties: null as any,
    version: null as any,
} as {
    json: EntityJson;
    properties: EntityProperties;
    version: string;
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

export const getLastVersionEvents = () => {
    if (ref.json && ref.properties) return ref;
    throw new Error("You must call initDatafusParser() first");
};

export const fetchAndStoreLastVersionEvents = async (version?: string) => {
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

export const initDatafusParser = async ({
    owner = "bot4dofus",
    repo = "Datafus",
}: {
    owner?: string;
    repo?: string;
} = {}) => {
    const resp = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/releases/latest`
    );

    const version: string = resp.data.tag_name;
    if (!(await doesVersionFolderExists(version))) {
        console.log("Found new version", version);
        const zipUrl = resp.data.assets[0].browser_download_url;

        await downloadDatafusZip({ version, zipUrl });
        await extractDatafusZip(version);
        await cleanup(version);
    }
    console.log("Found existing version", version);

    await fetchAndStoreLastVersionEvents(version);

    return version;
};

const downloadDatafusZip = async ({
    version,
    zipUrl,
}: {
    version: string;
    zipUrl: string;
}) => {
    const outputFolder = await getOrCreateOutputFolder();
    const destZipFile = `${outputFolder}/${version}.zip`;
    console.log("Downloading Datafus.zip to", destZipFile);

    const writer = createWriteStream(destZipFile);

    const response = await axios({
        url: zipUrl,
        method: "GET",
        responseType: "stream",
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
};

const extractDatafusZip = async (version: string) => {
    const outputFolder = await getOrCreateOutputFolder();
    const srcZipFile = `${outputFolder}/${version}.zip`;
    const destFolder = `${outputFolder}/${version}`;

    console.log("Extracting Datafus.zip to", destFolder);

    await getOrCreateFolder(destFolder);
    await decompress(srcZipFile, destFolder);
};

const cleanup = async (version: string) => {
    const folder = await getOrCreateOutputFolder();
    const versionFolder = await fs.readdir(folder);

    console.log("Cleaning up", versionFolder);

    await Promise.all(
        versionFolder.map(async (file) => {
            if (file !== version) {
                const path = `${folder}/${file}`;
                if ((await fs.stat(path)).isDirectory()) {
                    await fs.rmdir(`${folder}/${file}`, { recursive: true });
                } else {
                    await fs.unlink(path);
                }
            }
        })
    );
};

export const getOutputFolder = () =>
    path.join(process.cwd(), "node_modules", "datafus-parser", "output");

const getOrCreateOutputFolder = () => getOrCreateFolder(getOutputFolder());

const doesVersionFolderExists = async (version: string) => {
    const folder = await getOrCreateOutputFolder();
    const versionFolder = await fs.readdir(folder);

    return versionFolder.includes(version);
};
