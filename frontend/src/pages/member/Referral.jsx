import { Share2, MessageCircle, Send, Lock, UserRoundPlus } from 'lucide-react';
import { useProfileQuery } from '../../api/memberApi';
import { PageHeader, Card, CardHeader, CopyButton, Button, PageLoader, ErrorState, Notice } from '../../components/ui';

export default function Referral() {
  const { data, isLoading, error, refetch } = useProfileQuery();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { code, link } = data.referral;
  const message = `Join me on AroviaSkillTech — learn trending digital skills and earn with your team. Register here: ${link}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'AroviaSkillTech', text: message, url: link });
      } catch {
        /* user cancelled */
      }
    }
  };

  return (
    <div>
      <PageHeader icon={Share2} title="Refer & Earn" subtitle="Anyone who registers with your code or link joins your team."
        actions={data.user.isPackageActive && <Button to="/app/join" variant="solid" size="sm"><UserRoundPlus className="size-4" /> Join a member</Button>} />
      {!data.user.isPackageActive ? (
        <Notice tone="gold" icon={Lock} title="Your ID is not activated yet" action={<Button to="/app/activate" variant="gold" size="sm">Buy a bundle</Button>}>
          Buy at least one course bundle to activate your ID. Your referral code and link unlock as soon as it is active.
        </Notice>
      ) : (
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
              <Button href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on AroviaSkillTech')}`} target="_blank" rel="noreferrer" variant="outline" size="sm"><Send className="size-4" /> Telegram</Button>
              {typeof navigator !== 'undefined' && navigator.share && <Button onClick={share} variant="outline" size="sm"><Share2 className="size-4" /> More</Button>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
