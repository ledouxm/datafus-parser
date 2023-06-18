import axios from "axios";
import { promises as fs, createWriteStream } from "fs";
import decompress from "decompress";
import { getOrCreateFolder } from "./utils";

export const initDatafusParser = async () => {
  const resp = await axios.get(
    "https://api.github.com/repos/bot4dofus/Datafus/releases/latest"
  );

  const version: string = resp.data.tag_name;

  if (await doesVersionFolderExists(version)) {
    return version;
  }

  const zipUrl = resp.data.assets[0].browser_download_url;

  await downloadDatafusZip({ version, zipUrl });
  await extractDatafusZip(version);
  await cleanup(version);

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

  await getOrCreateFolder(destFolder);

  await decompress(srcZipFile, destFolder);
};

const cleanup = async (version: string) => {
  const folder = await getOrCreateOutputFolder();
  const versionFolder = await fs.readdir(folder);

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

const getOrCreateOutputFolder = () => getOrCreateFolder("./output");

const doesVersionFolderExists = async (version: string) => {
  const folder = await getOrCreateOutputFolder();
  const versionFolder = await fs.readdir(folder);

  return versionFolder.includes(version);
};
