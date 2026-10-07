import { Link, createFileRoute } from "@tanstack/react-router";

import { Prose } from "@/components/notices";
import { PageShell } from "@/components/site-chrome";
import { BRAND } from "@/lib/brand";

const TITLE = `Privacy Policy — ${BRAND.name}`;
const DESC = `What ${BRAND.name} stores when you search, and what it deliberately does not store.`;

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <PageShell className="public-legal">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <div className="mt-6">
        <Prose>
          <h2>No account needed</h2>
          <p>
            You do not need to register or sign in to search. We do not ask for your name, email
            address or phone number in order to use the site.
          </p>

          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Search queries</strong> — stored anonymously, without personal identifiers,
              so we can improve result quality.
            </li>
            <li>
              <strong>Rate limiting</strong> — to prevent abuse we store a hashed (irreversible)
              network identifier for a short period. We do not keep raw IP addresses for
              analytics.
            </li>
            <li>
              <strong>Feedback</strong> — when you rate a result we store which community, which
              rating, and the query that produced it.
            </li>
            <li>
              <strong>Submissions and removal requests</strong> — the link, note and any contact
              email you choose to give us.
            </li>
          </ul>

          <h2>Local storage on your device</h2>
          <p>
            We store your 18+ confirmation, your adult-content acknowledgement and your theme
            choice in your browser&apos;s local storage. This never leaves your device and can be
            cleared in your browser settings.
          </p>

          <h2>Sharing</h2>
          <p>
            We do not sell personal data. Data is processed by our hosting and database providers
            solely to run the service. Opening a listing takes you to Telegram, which has its own
            privacy policy.
          </p>

          <h2>Your requests</h2>
          <p>
            To ask about, correct or delete data associated with you, contact{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="text-primary underline underline-offset-2"
            >
              {BRAND.contactEmail}
            </a>
            . For removing a community listing, use the{" "}
            <Link to="/takedown" className="text-primary underline underline-offset-2">
              removal request form
            </Link>
            .
          </p>

          <p>{BRAND.disclaimer}</p>
        </Prose>
      </div>
    </PageShell>
  );
}
