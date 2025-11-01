import type { IFileSystem } from "../../core/interfaces/IFileSystem.js";

/**
 * Deno adapter for file system operations
 * Wraps Deno file APIs to implement IFileSystem interface
 */
export class DenoFileSystem implements IFileSystem {
  async readTextFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Create a Deno file system adapter
 * @returns A new DenoFileSystem instance
 */
export function createDenoFileSystem(): DenoFileSystem {
  return new DenoFileSystem();
}
