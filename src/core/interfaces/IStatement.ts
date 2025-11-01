/**
 * Interface for prepared SQL statements
 * Provides a runtime-agnostic abstraction over database prepared statements
 */
export interface IStatement<T = any> {
  /**
   * Execute the statement and return a single row
   * @param params - Parameters to bind to the statement
   * @returns The first row or undefined if no results
   */
  get(...params: any[]): T | undefined;

  /**
   * Execute the statement and return all rows
   * @param params - Parameters to bind to the statement
   * @returns Array of all matching rows
   */
  all(...params: any[]): T[];

  /**
   * Execute the statement without returning results
   * Useful for INSERT, UPDATE, DELETE statements
   * @param params - Parameters to bind to the statement
   */
  run(...params: any[]): void;

  /**
   * Finalize the statement and free resources
   */
  finalize(): void;
}
