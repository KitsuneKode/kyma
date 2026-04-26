/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as helpers_audit from "../helpers/audit.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_interviewPolicy from "../helpers/interviewPolicy.js";
import type * as helpers_templates from "../helpers/templates.js";
import type * as interviews from "../interviews.js";
import type * as livekit from "../livekit.js";
import type * as rateLimiter from "../rateLimiter.js";
import type * as recruiter from "../recruiter.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "helpers/audit": typeof helpers_audit;
  "helpers/auth": typeof helpers_auth;
  "helpers/interviewPolicy": typeof helpers_interviewPolicy;
  "helpers/templates": typeof helpers_templates;
  interviews: typeof interviews;
  livekit: typeof livekit;
  rateLimiter: typeof rateLimiter;
  recruiter: typeof recruiter;
  users: typeof users;
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

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
