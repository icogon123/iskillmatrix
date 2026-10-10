import mongoose from 'mongoose';
import User from '../models/User.js';

const MEMBER_FILTER = { role: 'member', status: { $nin: ['pending', 'rejected'] } };
const oid = (id) => new mongoose.Types.ObjectId(String(id));

export async function teamStats(userId) {
  const id = oid(userId);
  const [direct, total, active, directActive] = await Promise.all([
    User.countDocuments({ ...MEMBER_FILTER, sponsor: id }),
    User.countDocuments({ ...MEMBER_FILTER, ancestors: id }),
    User.countDocuments({ ...MEMBER_FILTER, ancestors: id, status: 'active', package: { $ne: null } }),
    User.countDocuments({ ...MEMBER_FILTER, sponsor: id, status: 'active', package: { $ne: null } }),
  ]);
  return { direct, total, active, directActive, inactive: total - active };
}

/** Downline counts per level (level 1 = direct referrals). */
export async function levelSummary(userId) {
  const id = oid(userId);
  const rows = await User.aggregate([
    { $match: { ...MEMBER_FILTER, ancestors: id } },
    {
      $group: {
        _id: { $add: [{ $indexOfArray: ['$ancestors', id] }, 1] },
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $ne: [{ $ifNull: ['$package', null] }, null] }] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ level: r._id, total: r.total, active: r.active }));
}

/** Members at a given level below `userId` (paged). */
export async function levelMembers(userId, level, { skip, limit, search }) {
  const id = oid(userId);
  const match = { ...MEMBER_FILTER, ancestors: id };
  if (level) match[`ancestors.${level - 1}`] = id;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ fullName: rx }, { memberId: rx }, { username: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(match)
      .select('memberId fullName username mobile status package packageActivatedAt sponsor ancestors createdAt badge')
      .populate('package', 'name key')
      .populate('sponsor', 'memberId fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(match),
  ]);
  return {
    items: items.map((u) => ({ ...u, level: u.ancestors.findIndex((a) => String(a) === String(id)) + 1, ancestors: undefined })),
    total,
  };
}

/** A node and its direct children, with each child's direct/team counts, for the genealogy view. */
export async function treeNode(nodeId) {
  const node = await User.findById(nodeId)
    .select('memberId fullName status package packageActivatedAt badge sponsor depth createdAt')
    .populate('package', 'name key')
    .lean();
  if (!node) return null;
  const children = await User.find({ ...MEMBER_FILTER, sponsor: node._id })
    .select('memberId fullName status package packageActivatedAt badge createdAt')
    .populate('package', 'name key')
    .sort({ createdAt: 1 })
    .lean();
  const ids = children.map((c) => c._id);
  const [directCounts, teamCounts] = await Promise.all([
    User.aggregate([{ $match: { ...MEMBER_FILTER, sponsor: { $in: ids } } }, { $group: { _id: '$sponsor', n: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { ...MEMBER_FILTER, ancestors: { $in: ids } } },
      { $unwind: '$ancestors' },
      { $match: { ancestors: { $in: ids } } },
      { $group: { _id: '$ancestors', n: { $sum: 1 } } },
    ]),
  ]);
  const dMap = new Map(directCounts.map((d) => [String(d._id), d.n]));
  const tMap = new Map(teamCounts.map((d) => [String(d._id), d.n]));
  const stats = await teamStats(node._id);
  return {
    ...node,
    directCount: stats.direct,
    teamCount: stats.total,
    children: children.map((c) => ({ ...c, directCount: dMap.get(String(c._id)) || 0, teamCount: tMap.get(String(c._id)) || 0 })),
  };
}

/** True when `nodeId` is `viewerId` or somewhere in their downline. */
export async function isInDownline(viewerId, nodeId) {
  if (String(viewerId) === String(nodeId)) return true;
  return Boolean(await User.exists({ _id: nodeId, ancestors: oid(viewerId) }));
}
