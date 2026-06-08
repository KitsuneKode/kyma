type IdentityLike = Record<string, unknown>

export function getOrgContextFromIdentity(identity: IdentityLike) {
  const orgIdCandidate = identity['org_id']
  const orgRoleCandidate = identity['org_role']
  const orgPermissionsCandidate = identity['org_permissions']
  const orgId =
    typeof orgIdCandidate === 'string' && orgIdCandidate.trim()
      ? orgIdCandidate
      : null
  const orgRole =
    typeof orgRoleCandidate === 'string' && orgRoleCandidate.trim()
      ? orgRoleCandidate
      : null
  const orgPermissions = Array.isArray(orgPermissionsCandidate)
    ? orgPermissionsCandidate.filter(
        (permission): permission is string => typeof permission === 'string'
      )
    : []
  return { orgId, orgRole, orgPermissions }
}
