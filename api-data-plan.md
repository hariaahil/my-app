# TargetBud Data API Plan

## Production-safe data layer

TargetBud should not call third-party data providers directly from every browser session. The platform API/MCP layer should cache normalized data and expose one stable interface to the web app and AI clients.

### Providers

- Indian stocks: BharatStock for free end-of-day NSE data (50 requests/day on free tier). Use TejHQ as an open/keyless historical-data fallback.
- Mutual funds: mfnav.in or TigZig MF NAV API for AMFI-sourced daily NAV/history.
- Sports: SportScore for cricket/football/basketball/tennis where its attribution/open-source terms fit the deployment; use a dedicated cricket provider such as Cricwix if live cricket is required.

### TargetBud internal endpoints

- GET /api/markets/stocks/quote
- GET /api/markets/stocks/history
- GET /api/markets/stocks/gainers
- GET /api/markets/indices
- GET /api/markets/mutual-funds/search
- GET /api/markets/mutual-funds/nav
- GET /api/sports/live
- GET /api/sports/fixtures
- GET /api/sports/standings
- GET /api/news/latest

### MCP tools

Expose the same normalized services through an authenticated TargetBud MCP server. Example tools:

- stocks_quote
- stocks_history
- market_gainers
- mutual_fund_search
- mutual_fund_nav
- sports_live
- sports_fixtures
- sports_standings
- news_latest

### Caching

Use Supabase/Postgres as the shared cache. Refresh provider data on a schedule and serve cached responses to visitors. This protects free-tier quotas and gives all TargetBud clients one consistent API.

### Security

Provider API keys must never be shipped to browser JavaScript. Store them in Vercel server-side environment variables. User-specific finance data remains protected by Supabase RLS and authenticated requests.
