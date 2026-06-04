import { PublicPageLayout } from '@/components/shared/public-page-layout';

export default function ContactPage() {
  return (
    <PublicPageLayout title="Contact Us">
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-2">Get in Touch</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We&apos;d love to hear from you. Whether you have a question about our services, 
            pricing, or anything else, our team is ready to answer.
          </p>
        </section>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Email</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Support: support@aidraft.bond</li>
              <li>Billing: billing@aidraft.bond</li>
              <li>Legal: legal@aidraft.bond</li>
              <li>Privacy: privacy@aidraft.bond</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3">Hours</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Monday - Friday: 9:00 AM - 6:00 PM IST</li>
              <li>Saturday: 10:00 AM - 2:00 PM IST</li>
              <li>Sunday: Closed</li>
            </ul>
          </div>
        </div>

        <section>
          <h3 className="text-sm font-semibold mb-2">Response Time</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We typically respond within 24 hours on business days. For urgent matters, 
            please include &quot;URGENT&quot; in your email subject line.
          </p>
        </section>
      </div>
    </PublicPageLayout>
  );
}
