import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import type { IFileSystem } from "../../core/interfaces/IFileSystem.js";

/**
 * Node.js adapter for file system operations
 * Wraps Node.js fs/promises APIs to implement IFileSystem interface
 */
export class NodeFileSystem implements IFileSystem {
  async readTextFile(path: string): Promise<string> {
    return await readFile(path, "utf-8");
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a Node.js file system adapter
 * @returns A new NodeFileSystem instance
 */
export function createNodeFileSystem(): NodeFileSystem {
  return new NodeFileSystem();
}
