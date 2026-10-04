import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Send } from 'lucide-react';
import { useSiteQuery } from '../../api/publicApi';
import { Button, Input, Textarea } from '../../components/ui';
import { PageHero } from './sections';

export default function Contact() {
  const { data } = useSiteQuery();
  const site = data?.site || {};
  const [form, setForm] = useState({ name: '', subject: '', message: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const send = (e) => {
    e.preventDefault();
    const body = `${form.message}\n\n— ${form.name}`;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(form.subject || 'Enquiry from website')}&body=${encodeURIComponent(body)}`;
  };

  const cards = [
    site.email && [Mail, 'Email us', site.email, `mailto:${site.email}`],
    site.phone && [Phone, 'Call us', site.phone, `tel:${site.phone}`],
    site.whatsapp && [MessageCircle, 'WhatsApp', site.whatsapp, `https://wa.me/${site.whatsapp.replace(/\D/g, '')}`],
    site.address && [MapPin, 'Visit us', site.address],
  ].filter(Boolean);

  return (
    <>
      <PageHero kicker="We are here to help" title="Contact" gold="us" sub="Questions about packages, payments or your account? Reach out and our support team will get back to you." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          {cards.map(([Icon, title, value, href]) => (
            <div key={title} className="card flex items-start gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-300"><Icon className="size-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted">{title}</p>
                {href ? <a href={href} className="mt-0.5 block truncate font-semibold hover:text-gold-400">{value}</a> : <p className="mt-0.5 font-semibold">{value}</p>}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="card space-y-4 p-6 lg:col-span-3">
          <h3 className="text-lg font-bold">Send us a message</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Your name" value={form.name} onChange={set('name')} required />
            <Input label="Subject" value={form.subject} onChange={set('subject')} />
          </div>
          <Textarea label="Message" rows={5} value={form.message} onChange={set('message')} required />
          <Button type="submit" disabled={!site.email}><Send className="size-4" /> Send via email</Button>
        </form>
      </section>
    </>
  );
}
