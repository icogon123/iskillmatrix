import { Share2, MessageCircle, Send } from 'lucide-react';
import { useProfileQuery } from '../../api/memberApi';
import { PageHeader, Card, CardHeader, CopyButton, Button, PageLoader, ErrorState, Notice } from '../../components/ui';

export default function Referral() {
  const { data, isLoading, error, refetch } = useProfileQuery();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { code, link } = data.referral;
  const message = `Join me on iSkillMatrix — learn trending digital skills and earn with your team. Register here: ${link}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'iSkillMatrix', text: message, url: link });
      } catch {
        /* user cancelled */
      }
    }
  };

  return (
    <div>
      <PageHeader icon={Share2} title="Refer & Earn" subtitle="Anyone who registers with your code or link joins your team." />
      {!data.user.isPackageActive && (
        <Notice tone="gold" title="Activate your bundle to earn from referrals" className="mb-5" action={<Button to="/app/activate" variant="gold" size="sm">Activate</Button>}>
          People can still join with your code, but income is credited only when your own bundle is active.
        </Notice>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-pad">
          <CardHeader title="Your referral code" />
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-gold-400/40 bg-gold-400/10 p-5">
            <p className="font-display text-3xl font-black tracking-wider text-gold-400">{code}</p>
            <CopyButton text={code} />
          </div>
        </Card>
        <Card className="card-pad">
          <CardHeader title="Your referral link" />
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-ink-900 p-4">
            <p className="min-w-0 flex-1 truncate text-sm text-muted">{link}</p>
            <CopyButton text={link} label="Copy link" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" variant="success" size="sm"><MessageCircle className="size-4" /> WhatsApp</Button>
            <Button href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on iSkillMatrix')}`} target="_blank" rel="noreferrer" variant="outline" size="sm"><Send className="size-4" /> Telegram</Button>
            {typeof navigator !== 'undefined' && navigator.share && <Button onClick={share} variant="outline" size="sm"><Share2 className="size-4" /> More</Button>}
          </div>
        </Card>
      </div>
    </div>
  );
}
