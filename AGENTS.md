<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Scope public theme variables through `body:has(.public-site)` so public portals inherit the theme without changing admin appearance.
- Reuse the presentation-only member-bar helper for logarithmic size comparisons; keep API helpers and URL-state logic unchanged during design work.

- Normalize search sort in the shared URL-state helper and strip non-relevance sort values before invoking search, so default requests follow the backend member-order contract.

- Scope admin theme tokens through `body:has(.admin-site)` so admin dialogs inherit light/dark tokens without altering public pages.
- Share admin dashboard, source and storage query options across the shell and review surfaces to deduplicate RPC requests.
- Keep review eligibility and storage thresholds in browser-safe pure rules with focused tests; batch mutations use existing staff RPCs.
