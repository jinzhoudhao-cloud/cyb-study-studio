# Public release review

## Round 1: user experience and state ownership

- Library entry separates course practice from the example/import mode.
- Course visibility is a server setting; guests cannot bypass it through the bank URL.
- Guest progress stays in the current browser. Signed-in accounts have separate browser namespaces and cloud records. The original owner's records have an explicit migration path.
- A new account may opt to import browser guest progress. Shared-computer records are not silently assigned to another person.
- Nickname sharing is optional; the list indicates recent activity rather than a total user count. Nicknames are unverified and may repeat.
- Demo mode and the generated offline version have local-only progress; the interface and documentation state these limits.

## Round 2: permissions, data handling, and abuse

- Administrative writes verify the hosting platform's authenticated owner identity on the server. No admin credential is shipped to the browser or public source.
- Visibility and nickname mutations require same-origin JSON requests with bounded streamed bodies. Nickname text uses restricted characters and DOM text rendering.
- Nickname tokens are random, HttpOnly and SameSite; production cookies use Secure. Only hashes are stored. Public responses omit identity/session IDs.
- Expiring sessions, new-session limits, heartbeat limits, progress write limits and administrator nickname moderation constrain basic abuse.
- Cloud deletion replaces answers with a minimal tombstone. Version and epoch checks stop stale clients automatically resurrecting prior answers.
- The export uses an explicit source allowlist and fresh history, replaces the hosting project identity, and scans for owner-specific strings and common credential patterns. Runtime databases, environment files and personal progress exports are excluded.
- Runtime dependencies were updated after an audit found vulnerable packages. The final production-dependency audit must be checked alongside the release.

## Verification and limits

Automated tests cover 240 randomized attempts, stable grading, progress merge/isolation, hidden-bank access, owner authorization, nickname validation/consent/moderation/expiry/rate limits, and deletion conflicts. Actual local HTTP tests cover home, 80 questions, login, administrator toggling, sample fallback and nickname join/list/leave.

The browser automation tool was unavailable during this release, so visual rendering and physical phone testing were not confirmed. Course hiding cannot revoke existing open-source/downloaded copies. These application limits do not replace hosting-level protection against large-scale traffic.
