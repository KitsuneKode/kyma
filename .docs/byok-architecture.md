# BYOK Architecture

Design note for workspace bring-your-own-key (BYOK) provider credentials.
Companion to `.docs/security-and-maintainability.md` and Phase E of
`.plans/operational-credibility-next.md`.

## Non-negotiable principles

1. **Keys never reach the client.** Browser bundles, RSC props, and public
   Convex queries must never see plaintext or ciphertext provider secrets.
2. **Encrypt at rest.** Workspace keys are stored only as AES-GCM ciphertext +
   IV on `workspaceSettings.providerKeys` (see `convex/helpers/encryption.ts`).
3. **Decrypt only in server / job / agent execution.** Decryption happens in
   trusted runtimes for the duration of a request or job, then discarded.
4. **Shared resolution boundary.** All model/provider selection goes through
   `lib/providers/resolve-model.ts` (and agent runtime resolvers), not ad-hoc
   SDK calls from UI code.
5. **Log redaction.** Audit events, diagnostics, and error reports may record
   `provider`, `keyId`, `label`, and `maskedKeyTail` only — never raw keys,
   ciphertext, or IVs.

## Trust boundaries

| Surface                                        | May see                                   | Must not see                |
| ---------------------------------------------- | ----------------------------------------- | --------------------------- |
| Recruiter settings UI / `getWorkspaceSettings` | provider, keyId, label, maskedKeyTail     | plaintext, encryptedKey, iv |
| Org-admin mutations (`addProviderKey`)         | plaintext only in mutation args (server)  | — (encrypt before persist)  |
| Next.js route handlers / Inngest jobs          | decrypted keys in-memory for the call     | client responses, logs      |
| LiveKit agent worker                           | decrypted keys for cascade LLM / realtime | Convex public query results |
| Audit trail (`auditEvents`)                    | provider / keyId / label / model ids      | any secret material         |

## Encrypt at rest

Implementation: `convex/helpers/encryption.ts`

- Algorithm: AES-256-GCM
- Envelope key: `KYMA_ENCRYPTION_KEY` (64-char hex = 32 bytes)
- Stored fields per key entry: `encryptedKey`, `iv`, plus non-secret metadata
  (`keyId`, `provider`, `label`, `maskedKeyTail`, `addedAt`, `addedBy`)
- Write path: `convex/recruiter/workspace.ts` → `addProviderKey` calls
  `encryptProviderKey` before insert/patch

If `KYMA_ENCRYPTION_KEY` is missing, encryption/decryption throws. Bootstrap
and health checks treat missing encryption as a configuration failure when
encrypted keys already exist.

## Decrypt only in trusted runtimes

| Runtime                    | Entry                        | Decrypt helper                                                                           |
| -------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| Convex action (admin test) | `testProviderConnection`     | `decryptProviderKey`                                                                     |
| Next.js / Inngest          | report-chat, process-session | `decryptWorkspaceKey` / `tryResolveWorkspaceApiKeys` in `lib/providers/resolve-model.ts` |
| Agent worker               | interviewer media routing    | runtime env + resolve helpers                                                            |

`getWorkspaceSettingsForReportChat` may return **encrypted** key records to an
authenticated server action so the Next.js route can decrypt locally. That
payload must never be forwarded to the browser.

## Platform keys vs BYOK

Resolution order for model **ids** (per stage):

```
templateOverrides[kind] ?? workspaceDefaults[kind] ?? env[kind] ?? DEFAULT_MODELS[kind]
```

Resolution order for API **credentials**:

1. Org BYOK (latest matching provider key on `workspaceSettings`, decrypted)
2. Platform env fallbacks (`OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, …)

Platform keys remain the safe default for MVP critical path when BYOK is unset
or misconfigured. Cascade STT/TTS currently prefer LiveKit inference gateway
model strings; cascade LLM and realtime modes honor org/platform OpenAI (and
related) keys as documented in `.docs/architecture.md`.

## Log and audit redaction

- Diagnostics: invite tokens via `redactInviteToken`; never log provider secrets
- Audit actions (shipped):
  - `workspace.provider_key.added` / `.removed` — metadata: provider, keyId, label, maskedKeyTail
  - `workspace.default_models.updated` — model id overrides only
  - `workspace.candidate_release_mode.updated` — mode only
- Error reporting (`lib/ops/error-reporting.ts`) must not attach request bodies
  that contain provider keys

## Already shipped vs remaining

### Shipped

- AES-GCM encrypt/decrypt helpers + `KYMA_ENCRYPTION_KEY` env contract
- Org-admin add/remove provider key mutations with encrypted storage
- Client-safe settings query (masked metadata only)
- Server resolve helpers (`resolve-model.ts`) and agent BYOK for cascade LLM /
  realtime where wired
- `testProviderConnection` admin action
- Bootstrap BYOK summary validation (no decrypt in public path beyond config checks)
- Audit events for provider key add/remove and model/release settings
- HTTP rate limits including LiveKit token mint on interview bootstrap

### Remaining (do not expand critical path until closed)

- Broader provider coverage and UI polish for key lifecycle
- Owner-run verification item 6 (BYOK provider validation end-to-end)
- Ensure every future provider call site uses shared resolve helpers only
- Optional: hash rate-limit keys that embed invite tokens if logs ever capture
  limiter keys

### Rotation (shipped)

- `KYMA_ENCRYPTION_KEY_PREVIOUS` (64-char hex, optional) — previous envelope key
- Decrypt tries current key (with AAD `orgId` then without), then previous key; encrypt always uses current key
- `convex/helpers/encryption.ts` and `lib/providers/resolve-model.ts` both support fallback; old ciphertext remains readable after rotation without migration
- To rotate: set new `KYMA_ENCRYPTION_KEY`, keep old as `KYMA_ENCRYPTION_KEY_PREVIOUS` for one deploy cycle, then remove previous after all workspaces have re-saved keys (or run a re-encryption job)
- AAD binding to `orgId` prevents ciphertext portability between workspaces

## Related files

- `convex/helpers/encryption.ts`
- `convex/recruiter/workspace.ts`
- `lib/providers/resolve-model.ts`
- `lib/agent/validate-provider-keys.ts`
- `agents/interviewer.ts` / `lib/agent/resolve-runtime-model.ts`
- `.docs/architecture.md` (agent media routing)
- `.docs/security-and-maintainability.md`
