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
import type * as agentConfig from "../agentConfig.js";
import type * as agentWorker from "../agentWorker.js";
import type * as devSeed from "../devSeed.js";
import type * as devSeedMutations from "../devSeedMutations.js";
import type * as helpers_audit from "../helpers/audit.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_clerkIdentity from "../helpers/clerkIdentity.js";
import type * as helpers_devSeedSpectrum from "../helpers/devSeedSpectrum.js";
import type * as helpers_encryption from "../helpers/encryption.js";
import type * as helpers_finalizeInterviewProcessing from "../helpers/finalizeInterviewProcessing.js";
import type * as helpers_interviewPolicy from "../helpers/interviewPolicy.js";
import type * as helpers_interviewSession from "../helpers/interviewSession.js";
import type * as helpers_orgAccess from "../helpers/orgAccess.js";
import type * as helpers_orgContext from "../helpers/orgContext.js";
import type * as helpers_processingAuth from "../helpers/processingAuth.js";
import type * as helpers_releasePolicy from "../helpers/releasePolicy.js";
import type * as helpers_templates from "../helpers/templates.js";
import type * as helpers_transcriptSegments from "../helpers/transcriptSegments.js";
import type * as interviews_bootstrap from "../interviews/bootstrap.js";
import type * as interviews_candidatePortal from "../interviews/candidatePortal.js";
import type * as interviews_processing from "../interviews/processing.js";
import type * as interviews_public from "../interviews/public.js";
import type * as interviews_sessionEvents from "../interviews/sessionEvents.js";
import type * as interviews_transcript from "../interviews/transcript.js";
import type * as lib_customFunctions from "../lib/customFunctions.js";
import type * as livekit from "../livekit.js";
import type * as onboarding from "../onboarding.js";
import type * as orgs from "../orgs.js";
import type * as processing from "../processing.js";
import type * as processingPipeline from "../processingPipeline.js";
import type * as profile from "../profile.js";
import type * as rateLimiter from "../rateLimiter.js";
import type * as readiness from "../readiness.js";
import type * as recruiter from "../recruiter.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as visualObservations from "../visualObservations.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agentConfig: typeof agentConfig;
  agentWorker: typeof agentWorker;
  devSeed: typeof devSeed;
  devSeedMutations: typeof devSeedMutations;
  "helpers/audit": typeof helpers_audit;
  "helpers/auth": typeof helpers_auth;
  "helpers/clerkIdentity": typeof helpers_clerkIdentity;
  "helpers/devSeedSpectrum": typeof helpers_devSeedSpectrum;
  "helpers/encryption": typeof helpers_encryption;
  "helpers/finalizeInterviewProcessing": typeof helpers_finalizeInterviewProcessing;
  "helpers/interviewPolicy": typeof helpers_interviewPolicy;
  "helpers/interviewSession": typeof helpers_interviewSession;
  "helpers/orgAccess": typeof helpers_orgAccess;
  "helpers/orgContext": typeof helpers_orgContext;
  "helpers/processingAuth": typeof helpers_processingAuth;
  "helpers/releasePolicy": typeof helpers_releasePolicy;
  "helpers/templates": typeof helpers_templates;
  "helpers/transcriptSegments": typeof helpers_transcriptSegments;
  "interviews/bootstrap": typeof interviews_bootstrap;
  "interviews/candidatePortal": typeof interviews_candidatePortal;
  "interviews/processing": typeof interviews_processing;
  "interviews/public": typeof interviews_public;
  "interviews/sessionEvents": typeof interviews_sessionEvents;
  "interviews/transcript": typeof interviews_transcript;
  "lib/customFunctions": typeof lib_customFunctions;
  livekit: typeof livekit;
  onboarding: typeof onboarding;
  orgs: typeof orgs;
  processing: typeof processing;
  processingPipeline: typeof processingPipeline;
  profile: typeof profile;
  rateLimiter: typeof rateLimiter;
  readiness: typeof readiness;
  recruiter: typeof recruiter;
  users: typeof users;
  validators: typeof validators;
  visualObservations: typeof visualObservations;
  workspace: typeof workspace;
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
