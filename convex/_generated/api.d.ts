/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as eventConfig from "../eventConfig.js";
import type * as events from "../events.js";
import type * as games from "../games.js";
import type * as hostAuth from "../hostAuth.js";
import type * as puzzleResults from "../puzzleResults.js";
import type * as scores from "../scores.js";
import type * as sharedState from "../sharedState.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  eventConfig: typeof eventConfig;
  events: typeof events;
  games: typeof games;
  hostAuth: typeof hostAuth;
  puzzleResults: typeof puzzleResults;
  scores: typeof scores;
  sharedState: typeof sharedState;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
