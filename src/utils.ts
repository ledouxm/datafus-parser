import { promises as fs } from "fs";

export const getOrCreateFolder = async (folder: string) => {
  try {
    await fs.mkdir(folder);
  } catch {}
  return folder;
};
