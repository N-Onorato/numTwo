import type { IStatement } from "./IStatement.js";

/**
 * Interface for database connections
 * Provides a runtime-agnostic abstraction over SQLite database drivers
 */
export interface IDatabase {
  /**
   * Execute a SQL statement directly without returning results
   * @param sql - The SQL statement to execute
   * @param params - Optional parameters to bind
   */
  exec(sql: string, ...params: any[]): void;

  /**
   * Prepare a SQL statement for repeated execution
   * @param sql - The SQL statement to prepare
   * @returns A prepared statement object
   */
  prepare<T = any>(sql: string): IStatement<T>;

  /**
   * Execute a function within a transaction
   * If the function throws an error, the transaction is rolled back
   * Otherwise, the transaction is committed
   * @param fn - The function to execute within the transaction
   * @returns The return value of the function
   */
  transaction<T>(fn: () => T): T;

  /**
   * Close the database connection
   */
  close(): void;
}
