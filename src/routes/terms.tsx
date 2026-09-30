import { createFileRoute } from "@tanstack/react-router";

import { DraftBadge, Prose } from "@/components/notices";
import { PageShell } from "@/components/site-chrome";
import { BRAND } from "@/lib/brand";

const TITLE = `Terms of Use — ${BRAND.name}`;
const DESC = `The rules for using ${BRAND.name}: 18+ only, what we index, and your responsibilities.`;

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <PageShell className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Use</h1>
      <div className="mt-3">
        <DraftBadge />
      </div>
      <div className="mt-6">
        <Prose>
          <h2>1. Adults only</h2>
          <p>
            {BRAND.name} is intended for people aged 18 or older. By using the service you
            confirm that you are at least 18 years old.
          </p>

          <h2>2. What we index</h2>
          <p>
            We index only public, community-level metadata about Telegram channels and groups:
            title, public username, public description, category, language, country and
            approximate member count. We do <strong>not</strong> index member lists, messages,
            files or any content from inside a community, and we do not index private invite
            links.
          </p>

          <h2>3. We are a directory, not a host</h2>
          <p>
            We do not create, host, operate, moderate or endorse any community listed here.
            Links take you to Telegram, a third-party service with its own terms.
          </p>

          <h2>4. Content warning</h2>
          <p>
            Listed communities may contain adult, offensive, inaccurate or misleading material,
            and some may be scams. Listings are generated automatically and labels can be wrong.
            Treat every listing with normal caution and never send money or personal data to
            strangers.
          </p>

          <h2>5. Your responsibility</h2>
          <p>
            You are responsible for checking that what you access and do is lawful where you
            live. If a type of content is restricted in your country, do not access it here.
          </p>

          <h2>6. Illegal content and takedowns</h2>
          <p>
            Content that is illegal — in particular any material involving minors — is never
            knowingly indexed and is removed on discovery. Takedown requests are handled
            promptly; use the removal request form.
          </p>

          <h2>7. Service provided as-is</h2>
          <p>
            The service is provided &ldquo;as is&rdquo;, without warranty of any kind. Data may
            be incomplete, outdated or wrong. To the fullest extent permitted by law we exclude
            liability for any loss arising from use of the service or from any third-party
            community you reach through it.
          </p>

          <h2>8. Changes</h2>
          <p>
            We may update these terms. Continued use of the service means you accept the terms
            in force at that time.
          </p>

          <p>{BRAND.disclaimer}</p>
        </Prose>
      </div>
    </PageShell>
  );
}
