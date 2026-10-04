import { Award, Lock, Crown } from 'lucide-react';
import { useAchievementsQuery } from '../../api/memberApi';
import { PageHeader, Card, ProgressBar, PageLoader, ErrorState } from '../../components/ui';
import BadgeMedal from '../../components/common/BadgeMedal';
import Money from '../../components/common/Money';
import { inr, date } from '../../lib/format';

export default function Achievements() {
  const { data, isLoading, error, refetch } = useAchievementsQuery();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const achieved = new Map(data.history.map((h) => [h.badge, h]));
  const currentIdx = data.ladder.findIndex((b) => b.key === data.current?.key);
  const royalty = new Map(data.royalty.slabs.map((s) => [s.badgeKey, s.percent]));

  return (
    <div>
      <PageHeader icon={Award} title="Achievements" subtitle="Badges are based on lifetime earnings and are permanent once achieved." />
      <div className="hero-gradient relative overflow-hidden rounded-3xl p-6 shadow-glow">
        <div className="flex items-center gap-5">
          <BadgeMedal badgeKey={data.current?.key} size="lg" locked={!data.current} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-brand-100/85">Current badge</p>
            <p className="gold-text font-display text-2xl font-black sm:text-3xl">{data.current?.name || 'Not yet achieved'}</p>
            <p className="mt-1 text-sm text-brand-100/85">Lifetime earnings <Money value={data.lifetimeEarnings} className="font-bold text-white" /></p>
          </div>
        </div>
        {data.next && (
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-xs text-brand-100/85">
              <span>Next: {data.next.name} ({inr(data.next.threshold)})</span>
              <span><Money value={data.requiredAmount} /> to go</span>
            </div>
            <ProgressBar value={data.progress} tone="gold" className="bg-white/15" />
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {data.ladder.map((b, i) => {
          const got = achieved.get(b.key) || i <= currentIdx;
          return (
            <Card key={b.key} className={`card-pad flex flex-col items-center gap-2 text-center ${got ? 'border-gold-400/40' : ''}`}>
              <BadgeMedal badgeKey={b.key} locked={!got} />
              <p className="text-sm font-bold">{b.name}</p>
              <p className="text-xs text-muted">{inr(b.threshold)}</p>
              {royalty.has(b.key) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2 py-0.5 text-[10px] font-bold text-gold-400"><Crown className="size-3" />{royalty.get(b.key)}% royalty</span>
              )}
              {got ? (
                <p className="text-[11px] text-success">{achieved.get(b.key) ? `Achieved ${date(achieved.get(b.key).achievedAt)}` : 'Achieved'}</p>
              ) : (
                <p className="flex items-center gap-1 text-[11px] text-subtle"><Lock className="size-3" /> Locked</p>
              )}
            </Card>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-subtle">
        Royalty is paid monthly from Emerald Executive onwards on your {data.royalty.basis === 'own' ? 'own' : 'team’s'} Active + Passive income for the month.
      </p>
    </div>
  );
}
