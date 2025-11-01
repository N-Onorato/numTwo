/**
 * Interface for file system operations
 * Provides a runtime-agnostic abstraction over file operations
 */
export interface IFileSystem {
  /**
   * Read a text file
   * @param path - Path to the file
   * @returns The file contents as a string
   */
  readTextFile(path: string): string | Promise<string>;

  /**
   * Check if a file exists
   * @param path - Path to the file
   * @returns True if the file exists
   */
  exists(path: string): boolean | Promise<boolean>;
}
