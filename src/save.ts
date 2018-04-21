import { compressToUTF16, decompressFromUTF16, compressToBase64, decompressFromBase64 } from 'lz-string';

const saveVersion = 1;

interface SaveData {
  version: number,
  data: object,
}

export function save(data: object): void {
  const saveFile = generateSave(data, compressToUTF16);
  localStorage.setItem("save", saveFile);
}

export function exportSave(data: object): string {
  return generateSave(data, compressToBase64);
}

export function importSave(data: string): object {
  return loadSave(data, decompressFromBase64);
}

export function load(): object {
  var file = localStorage.getItem("save");
  return loadSave(file, decompressFromUTF16);
}

export function hardReset() {
  localStorage.setItem("save", null);
}

function generateSave(data: object, compressor: (data: string) => string): string {
  const saveData: SaveData = {
    version: saveVersion,
    data: data,
  }
  return compressor(JSON.stringify(saveData));
}

function loadSave(saveFile: string, decompressor: (data: string) => string): object {
  if (!saveFile) {
    return null;
  }
  const saveData = <SaveData> JSON.parse(decompressor(saveFile));
  if (saveData && saveData.version && saveData.data) {
    // Save upgrade code goes here.

    if (saveData.version !== saveVersion) {
      throw "Unable to load save.";
    }

    return saveData.data;
  }

  return null;
}
