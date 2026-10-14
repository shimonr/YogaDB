# Browser test coverage

Feature coverage, not line coverage: every page and every action a user or admin can take in the UI
has a Playwright test. API-only behavior (limits, imports, backups) is covered by `backend/tests/`.

`smoke.spec.ts` is read-only and safe on any site. `qa-flows.spec.ts` changes data and runs only on a
QA site with `E2E_QA_FLOWS=1` (the reset test also needs `E2E_QA_RESET=1`). Admin tests need
`E2E_USERNAME`/`E2E_PASSWORD` of an admin.

| Area | What is checked | Spec |
| --- | --- | --- |
| Home, navigation | Home loads, sidebar and phone menu navigate, sidebar collapses/expands, breadcrumbs link back, unknown URLs go home | smoke |
| About | Shows the version the API reports | smoke |
| Asanas | Top 10 and "View All" (every pose), detail page, photos load, photo page and back link | smoke |
| Transitions, flows, classes | List pages show every item, detail pages, breadcrumbs name the item | smoke |
| Search | Text search, type and difficulty filters, reset, no-results message, transition mode | smoke |
| Games | All four games: match games finish a round, Sanskrit games score rounds and never offer "No Sanskrit" | smoke |
| Login, account | Wrong password error, login, account page, password change errors, signed-out redirects | smoke |
| Forgot / reset password | Pages, missing and invalid tokens, mismatched passwords | smoke |
| Forgot password by email | Emailed link sets a new password (needs `E2E_MAILPIT_PASSWORD`) | qa-flows |
| Register, rate, upload | New user registers, rates an asana, uploads a photo | qa-flows |
| Admin: read-only | Storage meter, email status and test button state, user lists, user page, ranking log, activity log filters and user details, DB browser, SQL (read-only enforced, errors shown) | smoke |
| Admin: content | Create, edit and delete transitions; create and delete a flow and a class; rank a class; activity log shows the changes | qa-flows |
| Admin: users | Reset link, password reset requests, using the link, deleting a user's photo and the user | qa-flows |
| QA tools | Reset QA to a clean state | qa-flows |

## Run locally

Start the API (`backend`, port 8000) and the dev server with the API on the same origin, then point
the tests at it:

```bash
cd frontend
VITE_API_BASE_URL=/api npx vite            # vite.config.ts proxies /api to localhost:8000
E2E_BASE_URL=http://localhost:5173 E2E_USERNAME=shimon E2E_PASSWORD=adm npm run e2e
```

Add `QA_MODE=true` to the API's environment and `E2E_QA_FLOWS=1 E2E_QA_RESET=1` to the test command
to run the data-changing tests against the local database.

## Not in the UI (so not browser-tested)

Editing asanas, flows and classes, and creating asanas, exist only in the API. Flows and transitions
can't be ranked from their pages.
