import { Link, createFileRoute } from "@tanstack/react-router";

import { DraftBadge, Prose } from "@/components/notices";
import { PageShell } from "@/components/site-chrome";
import { BRAND } from "@/lib/brand";

const TITLE = `About — ${BRAND.name}`;
const DESC = `What ${BRAND.name} is, how the index is built, and what it deliberately does not do.`;

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PageShell className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">About {BRAND.name}</h1>
      <div className="mt-3">
        <DraftBadge />
      </div>
      <div className="mt-6">
        <Prose>
          <p>
            {BRAND.name} is a free search engine for <strong>public</strong> Telegram channels
            and groups. Telegram itself has no full directory, so finding a good community
            usually means relying on word of mouth or link-spam lists. We try to do better:
            plain-language search, honest member counts, and clear labels.
          </p>

          <h2>How the index is built</h2>
          <ul>
            <li>We collect community-level metadata from public sources.</li>
            <li>
              We store only public information: title, @username, description, category,
              language, country, and approximate member count.
            </li>
            <li>
              We never collect member lists, messages, or any personal data from inside a
              community.
            </li>
            <li>Human submissions are reviewed before they appear.</li>
          </ul>

          <h2>What we are not</h2>
          <p>
            We do not create, host, moderate or endorse any community. A listing is not a
            recommendation. Communities can change their content at any moment, so always judge
            for yourself before joining or acting on anything you read.
          </p>

          <h2>Help us improve</h2>
          <p>
            Use the feedback buttons on any result,{" "}
            <Link to="/submit" className="text-primary underline underline-offset-2">
              submit a missing community
            </Link>
            , or{" "}
            <Link to="/takedown" className="text-primary underline underline-offset-2">
              request a removal
            </Link>
            .
          </p>
          <p>{BRAND.disclaimer}</p>
        </Prose>
      </div>
    </PageShell>
  );
}
