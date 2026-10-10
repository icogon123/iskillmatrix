import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Kyc from '../models/Kyc.js';
import Ledger, { INCOME_CATEGORIES, walletMatch } from '../models/Ledger.js';
import Withdrawal from '../models/Withdrawal.js';
import Deposit from '../models/Deposit.js';
import AppError from '../utils/AppError.js';
import { CATEGORY_LABELS, WALLET_LABELS } from '../services/ledgerService.js';
import { parseDayIST, addDays } from '../utils/dates.js';
import { escapeRegex } from '../utils/pagination.js';
import { maskTail, maskPan } from '../utils/mask.js';
import { round2 } from '../utils/money.js';

const LIMIT = 5000;
const col = (key, label, type = 'text') => ({ key, label, type });
const who = (u) => (u ? `${u.memberId || ''}` : '');
const name = (u) => (u ? u.fullName : '');

function range(query, field) {
  const from = parseDayIST(query.from);
  const to = parseDayIST(query.to);
  if (!from && !to) return {};
  return { [field]: { ...(from ? { $gte: from } : {}), ...(to ? { $lt: addDays(to, 1) } : {}) } };
}

async function memberIds(search) {
  if (!search) return null;
  const rx = new RegExp(escapeRegex(search), 'i');
  return User.find({ $or: [{ fullName: rx }, { memberId: rx }, { username: rx }] }).distinct('_id');
}

const sumOf = (rows, key) => round2(rows.reduce((a, r) => a + (Number(r[key]) || 0), 0));

const REPORTS = {
  registrations: {
    title: 'Member Registration Report',
    async run(q) {
      const filter = { role: 'member', isRoot: { $ne: true }, ...range(q, 'createdAt') };
      if (q.status) filter.status = q.status;
      if (q.package) filter.$or = [{ package: q.package }, { selectedPackage: q.package }];
      const ids = await memberIds(q.search);
      if (ids) filter._id = { $in: ids };
      const users = await User.find(filter).populate('sponsor', 'memberId fullName').populate('package selectedPackage', 'name')
        .sort({ createdAt: -1 }).limit(LIMIT).lean();
      return {
        columns: [col('memberId', 'Member ID'), col('fullName', 'Name'), col('username', 'Username'), col('mobile', 'Mobile'), col('email', 'Email'),
          col('sponsorId', 'Sponsor ID'), col('sponsorName', 'Sponsor Name'), col('package', 'Bundle'), col('status', 'Status'), col('kycStatus', 'KYC'),
          col('createdAt', 'Registered On', 'date'), col('approvedAt', 'Approved On', 'date')],
        rows: users.map((u) => ({
          memberId: u.memberId, fullName: u.fullName, username: u.username, mobile: u.mobile, email: u.email,
          sponsorId: who(u.sponsor), sponsorName: name(u.sponsor), package: (u.package || u.selectedPackage)?.name || '',
          status: u.status, kycStatus: u.kycStatus, createdAt: u.createdAt, approvedAt: u.approvedAt,
        })),
      };
    },
  },

  'active-members': {
    title: 'Active Member Report',
    async run(q) {
      const filter = { role: 'member', status: 'active', package: { $ne: null }, ...range(q, 'packageActivatedAt') };
      if (q.package) filter.package = q.package;
      const ids = await memberIds(q.search);
      if (ids) filter._id = { $in: ids };
      const users = await User.find(filter).populate('sponsor', 'memberId fullName').populate('package', 'name')
        .sort({ packageActivatedAt: -1 }).limit(LIMIT).lean();
      return {
        columns: [col('memberId', 'Member ID'), col('fullName', 'Name'), col('mobile', 'Mobile'), col('package', 'Bundle'),
          col('packageActivatedAt', 'Activated On', 'date'), col('sponsorId', 'Sponsor ID'), col('badge', 'Badge'), col('lifetimeEarnings', 'Lifetime Earnings', 'money')],
        rows: users.map((u) => ({
          memberId: u.memberId, fullName: u.fullName, mobile: u.mobile, package: u.package?.name, packageActivatedAt: u.packageActivatedAt,
          sponsorId: who(u.sponsor), badge: u.badge || '', lifetimeEarnings: u.lifetimeEarnings,
        })),
      };
    },
  },

  'package-wise': {
    title: 'Bundle-wise Report',
    async run(q) {
      const rows = await Payment.aggregate([
        { $match: { status: 'approved', ...range(q, 'verifiedAt') } },
        { $group: { _id: '$package', members: { $sum: 1 }, amount: { $sum: '$amount' }, gst: { $sum: '$gstAmount' }, systemCost: { $sum: '$systemCost' }, packageCost: { $sum: '$packageCost' } } },
        { $lookup: { from: 'packages', localField: '_id', foreignField: '_id', as: 'pkg' } },
        { $unwind: '$pkg' },
        { $sort: { 'pkg.price': 1 } },
      ]);
      const out = rows.map((r) => ({ package: r.pkg.name, price: r.pkg.price, members: r.members, amount: r.amount, gst: round2(r.gst), systemCost: round2(r.systemCost), packageCost: round2(r.packageCost) }));
      return {
        columns: [col('package', 'Bundle'), col('price', 'Price', 'money'), col('members', 'Members', 'number'), col('amount', 'Collection', 'money'),
          col('gst', 'GST', 'money'), col('systemCost', 'System Cost', 'money'), col('packageCost', 'Bundle Cost', 'money')],
        rows: out,
        summary: { members: out.reduce((a, r) => a + r.members, 0), amount: sumOf(out, 'amount'), gst: sumOf(out, 'gst'), systemCost: sumOf(out, 'systemCost'), packageCost: sumOf(out, 'packageCost') },
      };
    },
  },

  referrals: {
    title: 'Referral / Network Report',
    async run(q) {
      const base = { role: 'member', status: { $nin: ['pending', 'rejected'] } };
      const ids = await memberIds(q.search);
      const users = await User.find({ ...base, ...(ids ? { _id: { $in: ids } } : {}) }).select('memberId fullName package sponsor depth')
        .populate('sponsor', 'memberId').populate('package', 'name').limit(LIMIT).lean();
      const [directs, teams] = await Promise.all([
        User.aggregate([{ $match: base }, { $group: { _id: '$sponsor', n: { $sum: 1 }, active: { $sum: { $cond: [{ $ne: [{ $ifNull: ['$package', null] }, null] }, 1, 0] } } } }]),
        User.aggregate([{ $match: base }, { $unwind: '$ancestors' }, { $group: { _id: '$ancestors', n: { $sum: 1 } } }]),
      ]);
      const d = new Map(directs.map((r) => [String(r._id), r]));
      const t = new Map(teams.map((r) => [String(r._id), r.n]));
      const rows = users
        .map((u) => ({
          memberId: u.memberId, fullName: u.fullName, package: u.package?.name || '-', sponsorId: who(u.sponsor), depth: u.depth,
          directs: d.get(String(u._id))?.n || 0, activeDirects: d.get(String(u._id))?.active || 0, team: t.get(String(u._id)) || 0,
        }))
        .sort((a, b) => b.team - a.team);
      return {
        columns: [col('memberId', 'Member ID'), col('fullName', 'Name'), col('package', 'Bundle'), col('sponsorId', 'Sponsor ID'), col('depth', 'Network Level', 'number'),
          col('directs', 'Direct Referrals', 'number'), col('activeDirects', 'Active Directs', 'number'), col('team', 'Total Downline', 'number')],
        rows,
      };
    },
  },

  income: {
    title: 'Income Report',
    async run(q) {
      const filter = { direction: 'credit', category: q.category && INCOME_CATEGORIES.includes(q.category) ? q.category : { $in: INCOME_CATEGORIES }, ...range(q, 'createdAt') };
      filter.status = q.status || { $in: ['completed', 'pending'] };
      if (q.package) filter.package = q.package;
      const ids = await memberIds(q.search);
      if (ids) filter.user = { $in: ids };
      const rows = await Ledger.find(filter).populate('user sourceUser', 'memberId fullName').populate('package', 'name').sort({ createdAt: -1 }).limit(LIMIT).lean();
      const out = rows.map((r) => ({
        createdAt: r.createdAt, txnId: r.txnId, memberId: who(r.user), fullName: name(r.user), type: CATEGORY_LABELS[r.category],
        source: r.sourceUser ? `${r.sourceUser.memberId} ${r.sourceUser.fullName}` : r.period || '', package: r.package?.name || '', level: r.level || '',
        gross: r.grossAmount, charges: r.charges, net: r.netAmount, status: r.status, remarks: r.remarks,
      }));
      return {
        columns: [col('createdAt', 'Date', 'datetime'), col('txnId', 'Txn ID'), col('memberId', 'Member ID'), col('fullName', 'Name'), col('type', 'Income Type'),
          col('source', 'Source'), col('package', 'Bundle'), col('level', 'Level'), col('gross', 'Gross', 'money'), col('charges', 'Charges', 'money'),
          col('net', 'Net', 'money'), col('status', 'Status'), col('remarks', 'Remarks')],
        rows: out,
        summary: { gross: sumOf(out, 'gross'), net: sumOf(out, 'net') },
      };
    },
  },

  'wallet-ledger': {
    title: 'Wallet Ledger Report',
    async run(q) {
      const filter = { ...range(q, 'createdAt') };
      if (q.category) filter.category = q.category;
      if (q.status) filter.status = q.status;
      if (q.wallet) Object.assign(filter, walletMatch(q.wallet));
      const ids = await memberIds(q.search);
      if (ids) filter.user = { $in: ids };
      const rows = await Ledger.find(filter).populate('user', 'memberId fullName').sort({ createdAt: -1 }).limit(LIMIT).lean();
      const out = rows.map((r) => ({
        createdAt: r.createdAt, txnId: r.txnId, memberId: who(r.user), fullName: name(r.user), wallet: WALLET_LABELS[r.wallet || 'main'], category: CATEGORY_LABELS[r.category],
        credit: r.direction === 'credit' ? r.netAmount : 0, debit: r.direction === 'debit' ? r.netAmount : 0, status: r.status, reference: r.reference || '', remarks: r.remarks,
      }));
      return {
        columns: [col('createdAt', 'Date', 'datetime'), col('txnId', 'Txn ID'), col('memberId', 'Member ID'), col('fullName', 'Name'), col('wallet', 'Wallet'), col('category', 'Type'),
          col('credit', 'Credit', 'money'), col('debit', 'Debit', 'money'), col('status', 'Status'), col('reference', 'Reference'), col('remarks', 'Remarks')],
        rows: out,
        summary: { credit: sumOf(out, 'credit'), debit: sumOf(out, 'debit') },
      };
    },
  },

  withdrawals: {
    title: 'Withdrawal Report',
    async run(q) {
      const filter = { ...range(q, 'createdAt') };
      if (q.status) filter.status = q.status;
      const ids = await memberIds(q.search);
      if (ids) filter.user = { $in: ids };
      const rows = await Withdrawal.find(filter).populate('user', 'memberId fullName').sort({ createdAt: -1 }).limit(LIMIT).lean();
      const out = rows.map((w) => ({
        withdrawalId: w.withdrawalId, createdAt: w.createdAt, memberId: who(w.user), fullName: name(w.user), amount: w.amount, tds: w.tds,
        adminCharge: w.adminCharge, netAmount: w.netAmount, bankName: w.bank?.bankName, accountNumber: maskTail(w.bank?.accountNumber), ifsc: w.bank?.ifsc,
        status: w.status, paymentReference: w.paymentReference || '', processedAt: w.processedAt, adminRemarks: w.adminRemarks || '',
      }));
      return {
        columns: [col('withdrawalId', 'Withdrawal ID'), col('createdAt', 'Requested', 'datetime'), col('memberId', 'Member ID'), col('fullName', 'Name'),
          col('amount', 'Amount', 'money'), col('tds', 'TDS', 'money'), col('adminCharge', 'Admin Charge', 'money'), col('netAmount', 'Net', 'money'),
          col('bankName', 'Bank'), col('accountNumber', 'A/C No.'), col('ifsc', 'IFSC'), col('status', 'Status'), col('paymentReference', 'Payment Ref'),
          col('processedAt', 'Processed', 'datetime'), col('adminRemarks', 'Remarks')],
        rows: out,
        summary: { amount: sumOf(out, 'amount'), tds: sumOf(out, 'tds'), adminCharge: sumOf(out, 'adminCharge'), netAmount: sumOf(out, 'netAmount') },
      };
    },
  },

  tds: {
    title: 'TDS Report',
    async run(q) {
      const filter = { status: 'paid', ...range(q, 'processedAt') };
      const ids = await memberIds(q.search);
      if (ids) filter.user = { $in: ids };
      const rows = await Withdrawal.find(filter).populate('user', 'memberId fullName').sort({ processedAt: -1 }).limit(LIMIT).lean();
      const kycs = await Kyc.find({ user: { $in: rows.map((r) => r.user?._id) } }).select('user panNumber').lean();
      const pan = new Map(kycs.map((k) => [String(k.user), k.panNumber]));
      const out = rows.map((w) => ({
        withdrawalId: w.withdrawalId, processedAt: w.processedAt, memberId: who(w.user), fullName: name(w.user), pan: pan.get(String(w.user?._id)) || '',
        amount: w.amount, tdsPercent: w.tdsPercent, tds: w.tds,
      }));
      return {
        columns: [col('withdrawalId', 'Withdrawal ID'), col('processedAt', 'Paid On', 'datetime'), col('memberId', 'Member ID'), col('fullName', 'Name'),
          col('pan', 'PAN'), col('amount', 'Gross Amount', 'money'), col('tdsPercent', 'TDS %', 'number'), col('tds', 'TDS', 'money')],
        rows: out,
        summary: { amount: sumOf(out, 'amount'), tds: sumOf(out, 'tds') },
      };
    },
  },

  'admin-charges': {
    title: 'Admin Charge Report',
    async run(q) {
      const filter = { status: 'paid', ...range(q, 'processedAt') };
      const ids = await memberIds(q.search);
      if (ids) filter.user = { $in: ids };
      const rows = await Withdrawal.find(filter).populate('user', 'memberId fullName').sort({ processedAt: -1 }).limit(LIMIT).lean();
      const out = rows.map((w) => ({
        withdrawalId: w.withdrawalId, processedAt: w.processedAt, memberId: who(w.user), fullName: name(w.user), amount: w.amount,
        adminChargePercent: w.adminChargePercent, adminCharge: w.adminCharge,
      }));
      return {
        columns: [col('withdrawalId', 'Withdrawal ID'), col('processedAt', 'Paid On', 'datetime'), col('memberId', 'Member ID'), col('fullName', 'Name'),
          col('amount', 'Gross Amount', 'money'), col('adminChargePercent', 'Charge %', 'number'), col('adminCharge', 'Admin Charge', 'money')],
        rows: out,
        summary: { amount: sumOf(out, 'amount'), adminCharge: sumOf(out, 'adminCharge') },
      };
    },
  },

  payments: {
    title: 'Bundle Payment Report',
    async run(q) {
      const filter = { ...range(q, 'createdAt') };
      if (q.status) filter.status = q.status;
      if (q.package) filter.package = q.package;
      const ids = await memberIds(q.search);
      if (ids) filter.user = { $in: ids };
      const rows = await Payment.find(filter).populate('user', 'memberId fullName').populate('package', 'name').populate('verifiedBy', 'fullName')
        .populate('paidBy', 'memberId').sort({ createdAt: -1 }).limit(LIMIT).lean();
      const out = rows.map((p) => ({
        paymentId: p.paymentId, createdAt: p.createdAt, memberId: who(p.user), fullName: name(p.user), package: p.package?.name, amount: p.amount,
        gst: p.gstAmount, systemCost: p.systemCost, packageCost: p.packageCost,
        method: p.method === 'wallet' ? `${WALLET_LABELS[p.wallet] || 'Wallet'}${p.paidBy && String(p.paidBy._id) !== String(p.user?._id) ? ` of ${p.paidBy.memberId}` : ''}` : 'UPI',
        utr: p.utr || '', status: p.status, verifiedAt: p.verifiedAt, verifiedBy: p.verifiedBy?.fullName || '', adminRemarks: p.adminRemarks || '',
      }));
      return {
        columns: [col('paymentId', 'Payment ID'), col('createdAt', 'Submitted', 'datetime'), col('memberId', 'Member ID'), col('fullName', 'Name'),
          col('package', 'Bundle'), col('amount', 'Amount', 'money'), col('gst', 'GST', 'money'), col('systemCost', 'System Cost', 'money'),
          col('packageCost', 'Bundle Cost', 'money'), col('method', 'Paid With'), col('utr', 'UTR'), col('status', 'Status'), col('verifiedAt', 'Verified On', 'datetime'),
          col('verifiedBy', 'Verified By'), col('adminRemarks', 'Remarks')],
        rows: out,
        summary: { amount: sumOf(out, 'amount'), gst: sumOf(out, 'gst'), systemCost: sumOf(out, 'systemCost'), packageCost: sumOf(out, 'packageCost') },
      };
    },
  },

  deposits: {
    title: 'Fund Deposit Report',
    async run(q) {
      const filter = { ...range(q, 'createdAt') };
      if (q.status) filter.status = q.status;
      const ids = await memberIds(q.search);
      if (ids) filter.user = { $in: ids };
      const rows = await Deposit.find(filter).populate('user', 'memberId fullName').populate('verifiedBy', 'fullName').sort({ createdAt: -1 }).limit(LIMIT).lean();
      const out = rows.map((d) => ({
        depositId: d.depositId, createdAt: d.createdAt, memberId: who(d.user), fullName: name(d.user), amount: d.amount, utr: d.utr,
        paymentDate: d.paymentDate, status: d.status, verifiedAt: d.verifiedAt, verifiedBy: d.verifiedBy?.fullName || '', adminRemarks: d.adminRemarks || '',
      }));
      return {
        columns: [col('depositId', 'Deposit ID'), col('createdAt', 'Submitted', 'datetime'), col('memberId', 'Member ID'), col('fullName', 'Name'),
          col('amount', 'Amount', 'money'), col('utr', 'UTR'), col('paymentDate', 'Paid On', 'date'), col('status', 'Status'),
          col('verifiedAt', 'Verified On', 'datetime'), col('verifiedBy', 'Verified By'), col('adminRemarks', 'Remarks')],
        rows: out,
        summary: { amount: sumOf(out, 'amount') },
      };
    },
  },

  kyc: {
    title: 'KYC Report',
    async run(q) {
      const filter = { ...range(q, 'submittedAt') };
      if (q.status) filter.status = q.status;
      const ids = await memberIds(q.search);
      if (ids) filter.user = { $in: ids };
      const rows = await Kyc.find(filter).populate('user', 'memberId fullName').populate('reviewedBy', 'fullName').sort({ submittedAt: -1 }).limit(LIMIT).lean();
      return {
        columns: [col('memberId', 'Member ID'), col('fullName', 'Name'), col('pan', 'PAN'), col('bankName', 'Bank'), col('accountNumber', 'A/C No.'),
          col('ifsc', 'IFSC'), col('status', 'Status'), col('submittedAt', 'Submitted', 'datetime'), col('reviewedAt', 'Reviewed', 'datetime'),
          col('reviewedBy', 'Reviewed By'), col('rejectionReason', 'Reason')],
        rows: rows.map((k) => ({
          memberId: who(k.user), fullName: name(k.user), pan: maskPan(k.panNumber), bankName: k.bankName, accountNumber: maskTail(k.accountNumber), ifsc: k.ifsc,
          status: k.status, submittedAt: k.submittedAt, reviewedAt: k.reviewedAt, reviewedBy: k.reviewedBy?.fullName || '', rejectionReason: k.rejectionReason || '',
        })),
      };
    },
  },
};

export function reportTypes(_req, res) {
  res.json({ types: Object.entries(REPORTS).map(([key, r]) => ({ key, title: r.title })) });
}

export async function runReport(req, res) {
  const report = REPORTS[req.params.type];
  if (!report) throw new AppError('Unknown report', 404);
  const result = await report.run(req.query);
  res.json({ key: req.params.type, title: report.title, limit: LIMIT, ...result });
}
