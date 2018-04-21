import { compressToUTF16, decompressFromUTF16, compressToBase64, decompressFromBase64 } from 'lz-string';

const saveVersion = 1;

interface SaveData {
  version: number,
  data: object,
}

/**
 * Saves the `data` parameter to local storage.
 * @param data The data to save.
 */
export function save(data: object): void {
  const saveFile = generateSave(data, compressToUTF16);
  localStorage.setItem("save", saveFile);
}

/**
 * Returns a compressed and Base64 encoded version of `data`.
 * @param data The data to save.
 */
export function exportSave(data: object): string {
  return generateSave(data, compressToBase64);
}

/**
 * Returns the deserialized object contained in `data`.
 * @param data A string containing data to be loaded.
 */
export function importSave(data: string): object {
  return loadSave(data, decompressFromBase64);
}

/**
 * Loads the last save from local storage.
 */
export function load(): object {
  var file = localStorage.getItem("save");
  return loadSave(file, decompressFromUTF16);
}

/**
 * Deletes all save data from local storage.
 */
export function hardReset() {
  localStorage.setItem("save", null);
}

/**
 * Compresses and encodes some data for later deserialization.
 * @param data The data to save.
 * @param compressor The compressor to use when compressing this save file
 */
function generateSave(data: object, compressor: (data: string) => string): string {
  const saveData: SaveData = {
    version: saveVersion,
    data: data,
  }
  return compressor(JSON.stringify(saveData));
}

/**
 * Decodes and decompresses some data from a save file.
 * @param saveFile A string containing the save data.
 * @param decompressor The decompressor to use when decompressing this save file.
 */
function loadSave(saveFile: string, decompressor: (data: string) => string): object {
  if (!saveFile) {
    return null;
  }
  const saveData = <SaveData> JSON.parse(decompressor(saveFile));
  if (saveData && saveData.version && saveData.data) {
    upgradeSave(saveData.data, saveData.version);
    return saveData.data;
  }

  return null;
}

/**
 * Upgrades a save file to the latest version.
 * @param saveFile The save file to be upgraded.
 * @param version The inital version of the save file.
 */
function upgradeSave(saveFile: object, version: number) {
  if (version == saveVersion) {
    return saveFile;
  }

  // Save upgrade code goes here.

  throw "Unable to upgrade save.";
}
