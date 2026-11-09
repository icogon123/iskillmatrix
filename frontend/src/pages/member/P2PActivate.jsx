import { useState } from 'react';
import { UserPlus, Lock, HandCoins, ArrowLeftRight, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaymentInfoQuery, useWalletPurchaseMutation, useActivationsQuery } from '../../api/memberApi';
import { errorMessage } from '../../app/api';
import { PageHeader, Card, CardHeader, Select, Button, Notice, PageLoader, ErrorState, DataTable, Pagination } from '../../components/ui';
import PasswordInput from '../../components/common/PasswordInput';
import Money from '../../components/common/Money';
import MemberFinder from './MemberFinder';
import WalletChoice from './WalletChoice';
import { WALLET_LABELS } from '../../lib/constants';
import { inr, dateTime } from '../../lib/format';

/** Bundles that can be bought for this member: any bundle if they have none, otherwise only higher ones (upgrade). */
const bundlesFor = (packages, m) => (m?.bundle ? packages.filter((p) => p.price > (m.bundlePrice || 0)) : packages);

const activationProblem = (packages) => (m) => {
  if (m.relation === 'self') return m.bundle ? 'You cannot upgrade your own bundle. A member in your upline or downline can upgrade it for you.' : 'To activate your own bundle, use Activate Bundle in the menu.';
  if (m.status !== 'active') return 'This member’s account is not approved yet.';
  if (m.bundle) {
    if (!m.canUpgrade) return `Already has the ${m.bundle} bundle. You can only upgrade members in your upline or downline.`;
    if (!bundlesFor(packages, m).length) return `Already on the highest bundle (${m.bundle}).`;
    return null;
  }
  if (!m.canActivate) return 'This member cannot be activated.';
  return null;
};

export default function P2PActivate() {
  const { data, isLoading, error, refetch } = usePaymentInfoQuery();
  const [purchase, { isLoading: saving }] = useWalletPurchaseMutation();
  const [page, setPage] = useState(1);
  const { data: history, isFetching } = useActivationsQuery({ page, limit: 10 });
  const [username, setUsername] = useState('');
  const [member, setMember] = useState(null);
  const [packageId, setPackageId] = useState('');
  const [wallet, setWallet] = useState('activation');
  const [txnPassword, setTxnPassword] = useState('');

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const check = activationProblem(data.packages);
  const isUpgrade = Boolean(member?.bundle);
  const options = bundlesFor(data.packages, member);
  const pkg = options.find((p) => p._id === packageId);
  const balance = data.wallets[wallet] || 0;
  const short = pkg && pkg.price > balance;
  const ready = member && !check(member) && pkg && !short && txnPassword && !data.walletSuspended;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await purchase({ username: member.username, packageId, wallet, txnPassword }).unwrap();
      toast.success(res.message);
      setUsername('');
      setMember(null);
      setPackageId('');
      setTxnPassword('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader icon={UserPlus} title="P2P Activation"
        subtitle="Activate a course bundle for another member, or upgrade a member in your upline or downline to a higher bundle, with your wallet balance. It is active at once." />

      {data.walletSuspended && (
        <Notice tone="red" icon={Lock} title="Your wallet is suspended" className="mb-5">Wallet payments are on hold until the admin reactivates your wallet.</Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-pad lg:col-span-3">
          <CardHeader title={isUpgrade ? 'Upgrade a member' : 'Activate a member'} subtitle="Find the member by username — usernames are unique" />
          <form onSubmit={submit} className="mt-4 space-y-4">
            <MemberFinder value={username} onChange={setUsername} member={member} onFound={setMember} check={check} disabled={data.walletSuspended} />
            {isUpgrade && !check(member) && (
              <Notice tone="blue" icon={ArrowUpCircle} title={`Upgrade from ${member.bundle}`}>
                Pick a higher bundle. Upgrades are charged at the <b className="text-fg">full bundle price</b> — the current bundle is not deducted — and count as a new ID activation, so the upline earns every bonus in full.
              </Notice>
            )}
            <Select label={isUpgrade ? 'Upgrade to bundle' : 'Course bundle'} value={pkg ? packageId : ''} onChange={(e) => setPackageId(e.target.value)} placeholder="Select a bundle" disabled={data.walletSuspended}
              options={options.map((p) => ({ value: p._id, label: `${p.name} — ${inr(p.price)}` }))} required />
            <WalletChoice wallets={data.wallets} value={wallet} onChange={setWallet} price={pkg?.price || 0} disabled={data.walletSuspended} />
            {pkg && (
              <div className="space-y-1.5 rounded-xl bg-fg/[0.04] p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">{isUpgrade ? 'Upgrade price (full bundle price)' : 'Bundle price'}</span><span className="font-semibold">{inr(pkg.price)}</span></div>
                <div className="flex justify-between"><span className="text-muted">{WALLET_LABELS[wallet]} after payment</span>
                  <span className={short ? 'text-danger' : ''}>{short ? 'Not enough balance' : <Money value={balance - pkg.price} />}</span></div>
              </div>
            )}
            <PasswordInput label="Transaction password" autoComplete="off" value={txnPassword} disabled={data.walletSuspended} onChange={(e) => setTxnPassword(e.target.value)} required />
            <Button type="submit" size="lg" variant="gold" loading={saving} disabled={!ready} className="w-full">
              {member && pkg && !check(member) ? `${isUpgrade ? 'Upgrade' : 'Activate'} ${pkg.name} for ${member.fullName}` : isUpgrade ? 'Upgrade bundle' : 'Activate bundle'}
            </Button>
          </form>
        </Card>

        <Card className="card-pad self-start lg:col-span-2">
          <CardHeader title="How it works" />
          <ol className="mt-4 space-y-3 text-sm text-muted">
            {[
              'Enter the member’s username and press Check to see their name.',
              'Pick the bundle and the wallet that pays — your Activation Wallet or your Main Wallet.',
              'Confirm with your transaction password. The bundle is active instantly and income is shared with the upline as usual.',
              'The member must be approved. A member who has no bundle can be activated by anyone.',
              'To upgrade, the member must be in your upline or downline (not another branch) and you can only move them to a higher bundle. The full price of the new bundle is charged, and it counts as a new ID activation — the upline earns every bonus in full.',
              'You cannot upgrade your own bundle — ask a member in your upline or downline to upgrade it for you.',
            ].map((s, i) => (
              <li key={s} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500/25 text-xs font-bold text-brand-200">{i + 1}</span>{s}</li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button to="/app/deposit" size="sm" variant="outline"><HandCoins className="size-3.5" /> Deposit fund</Button>
            <Button to="/app/transfer" size="sm" variant="outline"><ArrowLeftRight className="size-3.5" /> Top up Activation Wallet</Button>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="card-pad pb-0"><CardHeader title="Bundles paid from my wallets" subtitle="Members you activated, and your own wallet-paid bundle" /></div>
        <DataTable
          loading={isFetching && !history}
          rows={history?.items || []}
          empty={<p className="px-4 py-10 text-center text-sm text-subtle">No wallet activations yet</p>}
          columns={[
            { key: 'date', header: 'Date', render: (r) => <span className="text-xs whitespace-nowrap text-muted">{dateTime(r.createdAt)}</span> },
            { key: 'id', header: 'Payment ID', render: (r) => <span className="font-semibold">{r.paymentId}</span> },
            {
              key: 'member', header: 'Member',
              render: (r) => (r.user?._id === r.paidBy
                ? <span>You</span>
                : <div><p className="font-semibold">{r.user?.fullName}</p><p className="text-xs text-muted">@{r.user?.username} · {r.user?.memberId}</p></div>),
            },
            {
              key: 'pkg', header: 'Bundle',
              render: (r) => (
                <div>
                  <span>{r.package?.name}</span>
                  {r.isUpgrade && (
                    <span className="ml-1.5 inline-block rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-300">
                      Upgrade{r.oldPackage?.name ? ` from ${r.oldPackage.name}` : ''}
                    </span>
                  )}
                </div>
              ),
            },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{inr(r.amount)}</span> },
            { key: 'wallet', header: 'Paid from', render: (r) => <span className="text-xs text-muted">{WALLET_LABELS[r.wallet]}</span> },
          ]}
        />
        <Pagination page={history?.page} pages={history?.pages} total={history?.total} onChange={setPage} />
      </Card>
    </div>
  );
}
