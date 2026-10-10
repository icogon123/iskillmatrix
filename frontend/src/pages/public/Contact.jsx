import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { useSiteQuery } from '../../api/publicApi';
import { Button, Input, Textarea } from '../../components/ui';
import { usePageTitle } from '../../lib/usePageTitle';
import { container, PageIntro } from './sections';

export default function Contact() {
  usePageTitle('Contact us', 'Questions about iSkillMatrix courses, bundles, payments or your account? Get in touch.');
  const { data } = useSiteQuery();
  const site = data?.site || {};
  const [form, setForm] = useState({ name: '', subject: '', message: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Opens the visitor's email app with the message filled in.
  const send = (e) => {
    e.preventDefault();
    const body = `${form.message}\n\n— ${form.name}`;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(form.subject || 'Question from the website')}&body=${encodeURIComponent(body)}`;
  };

  const methods = [
    site.email && [Mail, 'Email', site.email, `mailto:${site.email}`],
    site.phone && [Phone, 'Phone', site.phone, `tel:${site.phone.replace(/\s/g, '')}`],
    site.whatsapp && [MessageCircle, 'WhatsApp', site.whatsapp, `https://wa.me/${site.whatsapp.replace(/\D/g, '')}`],
    site.address && [MapPin, 'Address', site.address],
  ].filter(Boolean);

  return (
    <>
      <PageIntro eyebrow="Contact" title="We’re here to help."
        description="Questions about a course, a bundle, a payment or your account? Send us a message and our team will get back to you." />

      <section className={`${container} grid gap-12 py-14 sm:py-16 lg:grid-cols-[1fr_1.5fr] lg:gap-16`}>
        <div>
          <h2 className="text-lg font-bold text-fg">Reach us directly</h2>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {methods.map(([Icon, title, value, href]) => (
              <li key={title} className="flex items-start gap-4 py-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-gold-400" />
                <div className="min-w-0">
                  <p className="text-sm text-subtle">{title}</p>
                  {href
                    ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="block break-words font-medium text-fg hover:text-brand-200">{value}</a>
                    : <p className="font-medium text-fg">{value}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={send} className="space-y-4 rounded-2xl border border-line bg-ink-900 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-fg">Send a message</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Your name" value={form.name} onChange={set('name')} autoComplete="name" required />
            <Input label="Subject" value={form.subject} onChange={set('subject')} />
          </div>
          <Textarea label="Message" rows={5} value={form.message} onChange={set('message')} required />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="solid" disabled={!site.email}>Send message</Button>
            <p className="text-xs text-subtle">Opens your email app with the message ready to send.</p>
          </div>
        </form>
      </section>
    </>
  );
}
