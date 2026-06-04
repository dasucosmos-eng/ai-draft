import { PublicPageLayout } from '@/components/shared/public-page-layout';

export default function PrivacyPolicyPage() {
  return (
    <PublicPageLayout title="Privacy Policy">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Last updated: January 2025</p>

        <section>
          <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We collect information you provide when registering (name, email, phone number), case-related data you input, 
            and usage data to improve our services. We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
          <ul className="text-sm leading-relaxed text-muted-foreground space-y-1 list-disc pl-4">
            <li>Provide and maintain our AI legal drafting services</li>
            <li>Store your case documents and data securely</li>
            <li>Process AI-generated content for document drafting</li>
            <li>Improve our AI models and services</li>
            <li>Send service-related communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. Data Security</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            All data is encrypted in transit and at rest. We use Firebase/GCP security infrastructure. 
            Your legal documents are stored securely and are accessible only to you.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Data Retention</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You retain full ownership of your data. You may request deletion of your account and all associated data at any time 
            by contacting support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For privacy-related inquiries, contact us at privacy@aidraft.bond
          </p>
        </section>
      </div>
    </PublicPageLayout>
  );
}
