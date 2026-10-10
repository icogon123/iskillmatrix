import AuditLog from '../models/AuditLog.js';

/** Records an audit entry. `actor` is a user document (or null for system jobs). Never throws. */
export async function audit(actor, action, { entityType, entityId, details, ip } = {}) {
  try {
    await AuditLog.create({
      actor: actor?._id,
      actorName: actor ? `${actor.fullName} (${actor.memberId || actor.username})` : 'System',
      actorRole: actor?.role || 'system',
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      details,
      ip,
    });
  } catch (err) {
    console.error('[audit] failed', action, err.message);
  }
}

export const reqAudit = (req, action, opts = {}) => audit(req.user, action, { ...opts, ip: req.ip });
