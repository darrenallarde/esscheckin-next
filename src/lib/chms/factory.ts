/**
 * ChMS Provider Factory
 *
 * Creates the correct adapter instance based on connection config.
 * Used by edge functions and server-side code.
 */

import type { ChmsConnectionWithCredentials } from "./types";
import type { ChmsProviderAdapter } from "./provider";
import { RockAdapter } from "./adapters/rock";
import { PlanningCenterAdapter } from "./adapters/planning-center";
import { CcbAdapter } from "./adapters/ccb";

/**
 * Create the appropriate provider adapter for a ChMS connection.
 * The returned adapter is NOT yet authenticated — call authenticate() first.
 *
 * @param connection - Connection config with credentials (from service-role RPC)
 * @returns Configured but unauthenticated adapter
 * @throws If provider is unknown
 */
export function createChmsAdapter(
  connection: ChmsConnectionWithCredentials
): ChmsProviderAdapter {
  switch (connection.provider) {
    case "rock":
      return new RockAdapter(connection);
    case "planning_center":
      return new PlanningCenterAdapter(connection);
    case "ccb":
      return new CcbAdapter(connection);
    default:
      throw new Error(
        `Unknown ChMS provider: ${connection.provider}. Supported: rock, planning_center, ccb`
      );
  }
}
