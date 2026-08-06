# Contributing to FreeOnSteam

Thank you for helping improve FreeOnSteam. All code, interface text, tests, commit messages, and documentation must be written in English.

## Development workflow

1. Create a focused branch from the repository default branch.
2. Install the exact dependency graph with `npm ci`.
3. Copy `.env.example` to `.env.local` when local Firestore access is needed.
4. Make the smallest change that solves the issue.
5. Add or update mocked tests for behavior changes.
6. Run `npm run check` before opening a pull request.

Do not call live Steam endpoints from automated tests. Do not add SteamDB scraping or automation.

## Promotion filter changes

False positives are more harmful than false negatives. A promotion must remain rejected unless the available Steam data establishes all required conditions. Every filtering change should include:

- A paid game at a real 100% discount that is accepted.
- Nearby invalid examples that are rejected.
- A malformed or ambiguous upstream response.
- Any new Free-to-Play, demo, DLC, trial, or free-weekend edge case.

## Security and privacy

- Never commit credentials, tokens, cookies, `.env.local`, or service-account keys.
- Use Application Default Credentials.
- Do not add an unauthenticated synchronization endpoint.
- Keep external links generated from validated Steam App IDs.
- Report a suspected vulnerability privately to the repository owner before public disclosure.

## Commits and pull requests

Use Gitmoji with concise, imperative messages, for example `✨ Add offer expiration sorting`. Keep unrelated changes in separate commits. Pull requests should explain the behavior, risk, and checks performed.
