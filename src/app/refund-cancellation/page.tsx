import { PublicPageLayout } from '@/components/shared/public-page-layout';

export default function RefundCancellationPage() {
  return (
    <PublicPageLayout title="Refund & Cancellation Policy">
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Subscription Cancellation</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You may cancel your subscription at any time from your account settings. Upon cancellation, 
            your subscription will remain active until the end of the current billing period.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Refund Policy</h2>
          <ul className="text-sm leading-relaxed text-muted-foreground space-y-2 list-disc pl-4">
            <li><strong>Within 7 days:</strong> Full refund if you&apos;re not satisfied with the service</li>
            <li><strong>After 7 days:</strong> No refund for the current billing period, but you can cancel to prevent future charges</li>
            <li><strong>Annual plans:</strong> Pro-rated refund available within the first 30 days</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. How to Request a Refund</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Send an email to billing@aidraft.bond with your account details and reason for refund. 
            Refunds will be processed within 5-7 business days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Service Interruption</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If our service experiences significant downtime, affected users will be credited 
            proportionally to their subscription period.
          </p>
        </section>
      </div>
    </PublicPageLayout>
  );
}
