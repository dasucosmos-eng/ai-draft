import { PublicPageLayout } from '@/components/shared/public-page-layout';

export default function TermsConditionsPage() {
  return (
    <PublicPageLayout title="Terms & Conditions">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Last updated: January 2025</p>

        <section>
          <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            By using AI Draft Bond, you agree to these terms. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Service Description</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AI Draft Bond provides AI-assisted legal document drafting, case management, and legal research tools 
            for Indian legal professionals. AI-generated content is for reference purposes and should be reviewed 
            by a qualified legal professional before use.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. User Responsibilities</h2>
          <ul className="text-sm leading-relaxed text-muted-foreground space-y-1 list-disc pl-4">
            <li>Ensure all information provided is accurate</li>
            <li>Review AI-generated content before filing</li>
            <li>Not use the service for unauthorized practice of law</li>
            <li>Maintain confidentiality of client information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Disclaimer</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AI Draft Bond is an AI-assisted tool and does not constitute legal advice. All AI-generated documents 
            and suggestions should be thoroughly reviewed by a licensed advocate before use in any legal proceeding. 
            We are not liable for any consequences arising from the use of AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You retain ownership of all content you create. AI-generated drafts are licensed to you for your legal practice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For any questions, contact us at legal@aidraft.bond
          </p>
        </section>
      </div>
    </PublicPageLayout>
  );
}
