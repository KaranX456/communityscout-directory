# Community Compass

Build the public web app for "CommunityScout" – a free, mobile-first search engine for PUBLIC Telegram channels and groups, for adults (18+). Stack: React + TypeScript + Tailwind + shadcn/ui, react-router, @tanstack/react-query, react-helmet-async. Working brand name "CommunityScout" – keep it in ONE constant (src/lib/brand.ts) so it is easy to rename. Footer on every page: "Independent directory. Not affiliated with or endorsed by Telegram."

## CRITICAL BACKEND RULES
The backend ALREADY EXISTS on an external Supabase project. DO NOT enable Lovable Cloud, DO NOT create a new Supabase project/database, DO NOT create or alter tables, DO NOT write migrations or edge functions. Create src/lib/supabase.ts with supabase-js using:
- URL: https://jvtdovtbjrivilzclbva.supabase.co
- publishable/anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dGRvdnRianJpdmlsemNsYnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NjA3NDEsImV4cCI6MjEwNjMzNjc0MX0.a4X-v9EId7LayvWxhpAl0zxaJtjVT07sfWVHv2Wdv7w
(this is a public anon key; hard-coding it is fine). Use ONLY this API surface:
1. supabase.functions.invoke('search', { body }) – body: { q: string, minMembers?: number (default 10000), adaptive?: boolean (default true; send false when the user manually changes the minimum), kind?: 'channel'|'group', category?: slug, language?: string (e.g. 'en'), country?: ISO2, showAdult?: boolean, sort?: 'best'|'members', limit?: number, offset?: number }. Response: { results: Row[], meta: { total, relaxed, appliedMinMembers, expansions, latencyMs, notice } } or { error, message } (429 = rate limited; show message). Row: { id, username, title, description, kind, category, language, country, member_count, member_count_updated_at, last_post_at, verified, adult, source, relevance, score }.
2. supabase.functions.invoke('submit-community', { body: { link, category?, note?, website: '' } }) – `website` is a hidden honeypot field the UI must render invisibly (aria-hidden, tabIndex -1) and leave empty. Response { ok, message } or { error, message }.
3. supabase.rpc('browse_communities', { p_category, p_language, p_country, p_kind, p_show_adult, p_limit, p_offset }) → rows with total_count.
4. supabase.rpc('site_facets') → { categories: [{slug,name,count}], languages: string[], countries: string[], total }.
5. supabase.from('categories').select('slug,name').order('sort_order').
6. supabase.from('feedback').insert({ community_id, kind: 'relevant'|'not_relevant'|'incorrect'|'spam_scam', query }) (insert only, never select).
7. supabase.from('takedown_requests').insert({ target, reason, contact_email }).
The database may be EMPTY at first – design good empty states (search: "No communities found. Know one? Submit it." with link to /submit; home: hide stats when total is 0).

## PAGES / ROUTES
/ Home: big centered search field (autofocus, placeholder "Search topics, e.g. learn English, crypto news, football…"), category chips from categories, small line of facts from site_facets (only if total>0), short "How it works" (3 points: type anything – we handle synonyms & typos; results ranked by relevance then popularity; open directly in Telegram).
/search?q=…&min=…&kind=…&cat=…&lang=…&country=…&adult=…&sort=… Results page. ALL state lives in URL params so every search is a clean shareable link. Top bar: search input. Filter panel (drawer on mobile, sidebar on desktop): minimum members (presets: Any, 100, 1K, 5K, 10K default, 50K, 100K, 1M + custom number), type (Both/Channels/Groups), category, language, country, "Show adult results" switch (DEFAULT OFF), sort (Best match | Most members). Result cards (see below), "Load more" pagination (limit 20, offset; stop at 200 results). Show skeleton loaders. When meta.relaxed is true show a clear inline banner with meta.notice. Show "~N results · Xs" subtly. Debounce nothing – search on submit.
/category/:slug Browse page using browse_communities, with an intro paragraph, filters for kind, and pagination. Give each page unique <title>, meta description, canonical, Open Graph tags, and JSON-LD (CollectionPage/ItemList) via react-helmet-async. Include a /category index listing all categories.
/submit "Add a community" form: link field (accepts @name, name or t.me/name; explain private invite links are NOT accepted), optional category select, optional note (max 500), honeypot; show success/error messages from the function.
/terms /privacy /takedown /about – real, sensible draft content (clearly marked "Draft – pending final approval"). Terms: 18+ only, we index only public community-level metadata, no member lists/messages, we do not create/host/endorse communities, some may contain adult/offensive material or scams, users are responsible for checking that what they access and do is lawful where they live, illegal content is never indexed and takedown requests are handled promptly, service provided as-is, continued use = acceptance. Privacy: no accounts needed to search; we store anonymous search queries (no personal identifiers) to improve quality; rate limiting uses a hashed network identifier; feedback and submissions are stored; contact for requests. /takedown has a form posting to takedown_requests (target community link/name, reason, optional contact email).
404 page.

## 18+ GATE
On first visit show a blocking, accessible modal (focus trapped, cannot be dismissed with Esc/outside click) : "CommunityScout is for adults. Confirm you are 18 or older and accept the Terms of Use and Privacy Policy to continue." Buttons: "I am 18 or older – Continue" (store confirmation + timestamp in localStorage key `cs_age_ok`) and "I am under 18 – Leave" (navigate to https://www.google.com). Do not render search results or category listings behind the gate.
Show this notice visibly above results and on category pages: "These are public Telegram communities indexed automatically. We do not create, host or endorse them. Some may contain adult or offensive material, or may be scams. You are responsible for checking that what you access and do is lawful where you live."
Adult results (row.adult===true) get an "Adult" badge. The FIRST time a user clicks the open link of an adult-labelled community show a confirmation dialog ("This community is labelled adult. Continue only if you are 18+ and it is lawful where you live.") and remember acceptance in localStorage (`cs_adult_ok`).

## RESULT CARD
Avatar placeholder (colored initials), title, @username, kind badge (Channel/Group), category badge, language badge, "Verified" badge if verified, "Adult" badge if adult. Description clamped to 3 lines. Member count rounded ("~2.4M", "~15K", "~850") with freshness: "updated 3 days ago" (from member_count_updated_at; if null show "count not verified"). Optional last activity ("last post 2d ago"). Primary button "Open in Telegram" → href https://t.me/{username} target=_blank rel="noopener noreferrer nofollow". A small "Was this helpful?" control with four options: Relevant / Not relevant / Incorrect info / Spam or scam – inserts into feedback (with community_id and the current query), then shows "Thanks for the feedback" and disables further clicks for that card. Feedback must never be required.

## QUALITY BARS
- WCAG 2.1 AA: semantic landmarks, visible focus rings, contrast, labelled controls, keyboard operable dialogs/drawers, reduced-motion respect.
- Fast on mobile networks: code-split routes, no heavy libraries, skeletons, react-query caching (staleTime 5 min for facets/categories).
- Design: clean, modern, trustworthy; light and dark theme (respect system, add toggle); a distinctive but restrained palette (deep teal/indigo primary, generous whitespace, rounded-xl cards, subtle shadows). Avoid looking like a generic template. Great empty/error states everywhere. All copy in English.
- Add /robots.txt allowing all except /search and a static /sitemap.xml listing the static routes (home, /category, /submit, /about, /terms, /privacy, /takedown, and one URL per category slug: technology, news, education, entertainment, music, gaming, sports, business, lifestyle, humor).
- Handle network errors gracefully with retry buttons. Never expose stack traces.
- Do NOT build any admin/login UI in this iteration (it comes next).

When finished, briefly list the routes and any assumptions.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://communityscout-directory.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2e0467b8-b00a-4b04-a63e-2bc82f4d3bbc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
