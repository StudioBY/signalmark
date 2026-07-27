import React from "react";
import PageShell, { Section } from "@/components/signal/PageShell";

const LAST_UPDATED = "27 July 2026";

export default function Terms() {
  return (
    <PageShell
      title="Terms and Privacy"
      subtitle={`The terms of use and the privacy practices of this service. Last updated ${LAST_UPDATED}.`}
    >
      <Section label="Terms of use" id="terms">
        <p>
          This service computes linguistic metrics from publicly available LinkedIn text that you
          provide by submitting a profile URL. The output is a set of language measurements and a
          written description of them.
        </p>
        <p>
          The scores are informational language measurements only. They are not professional,
          hiring, recruitment, financial or career advice, and they are not an assessment of any
          person's competence or character. You are responsible for how you use them.
        </p>
        <p>
          You may only submit profiles that are publicly viewable. Do not use the service to
          analyze private profiles or to circumvent any access restriction.
        </p>
        <p>
          This service is not affiliated with, sponsored by or endorsed by LinkedIn, and LinkedIn
          is a trademark of its owner.
        </p>
        <p>
          The service is provided as is, without warranties of any kind, and liability is limited
          to the maximum extent permitted by applicable law.
        </p>

        <p className="pt-4 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
          Payments and refunds
        </p>
        <p>
          A single report costs $1, charged before the analysis runs. If the analysis cannot be
          completed after payment, the charge is refunded automatically and in full.
        </p>
        <p>
          Payments are processed by Stripe. Card details are entered on Stripe's checkout page and
          never reach this service. During the launch preview period, reports may be offered free
          of charge and the checkout may operate in sandbox mode.
        </p>
        <p>
          Sample reports are provided for demonstration. They are computed from the publicly
          available profile text of public figures, using the same engine as a paid report.
        </p>
      </Section>

      <Section label="Privacy" id="privacy">
        <p>
          The data collected is the email address you submit, the profile URL you ask to analyze,
          and the report derived from that profile's public text.
        </p>
        <p>
          Your email is used to deliver the report as a PDF and, occasionally, product updates
          about this service. You can unsubscribe at any time, and unsubscribing does not affect
          reports you have already purchased.
        </p>
        <p>
          Scraped profile text is cached for up to 7 days, so that repeat analyses of the same
          profile do not re-fetch it. Computed reports are retained so that a purchased report
          stays available to you.
        </p>
        <p>
          No data is sold to third parties. Data is shared only with the processors required to run
          the service: the payment processor, the profile data provider, the email provider and the
          hosting platform.
        </p>
        <p>
          To request removal of your email, a report or a cached profile, write to
          info@signalmark.com and the data will be deleted.
        </p>
      </Section>
    </PageShell>
  );
}