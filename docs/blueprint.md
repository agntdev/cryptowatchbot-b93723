# Crypto Tracker Bot — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A private Telegram bot that lets users track crypto prices, set custom price thresholds and percentage change alerts, and receive daily summaries. Users manage a personal watchlist with inline buttons or free-text tickers, configure quiet hours, and set morning summary times. The bot owner receives analytics about user activity and alert patterns.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual Telegram users
- crypto investors
- Telegram bot owners

## Success criteria

- Users can successfully track crypto prices and receive alerts
- Owner can view analytics dashboard with user count and top alerts
- System handles price feed failures with silent retries

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu and start onboarding
- **/price** (command, actor: user, command: /price) — Request current price(s) for a specific ticker or all watchlist coins
- **/admin_stats** (command, actor: owner, command: /admin_stats) — Show admin analytics dashboard with user count and top alerts
- **Manage Watchlist** (button, actor: user, callback: watchlist:manage) — View and modify watchlist items with inline buttons
  - inputs: ticker, display name, alert rules
  - outputs: updated watchlist, alert confirmation
- **Add Ticker** (button, actor: user, callback: watchlist:add) — Add a new coin to the watchlist with free-text input
  - inputs: ticker symbol
  - outputs: confirmation message, validation suggestions
- **Set Morning Summary** (button, actor: user, callback: summary:configure) — Configure daily morning summary time
  - inputs: local time
  - outputs: confirmation message
- **Set Quiet Hours** (button, actor: user, callback: quiet:configure) — Configure alert suppression hours
  - inputs: start time, end time
  - outputs: confirmation message

## Flows

### Onboarding
_Trigger:_ /start

1. Display welcome message
2. Create user profile
3. Prompt for timezone selection

_Data touched:_ User profile

### Watchlist Management
_Trigger:_ watchlist:manage

1. Display current watchlist items
2. Show inline buttons for common coins
3. Show 'Add Ticker' option
4. Handle add/remove actions

_Data touched:_ Watchlist item

### Alert Configuration
_Trigger:_ alert:configure

1. Select coin from watchlist
2. Choose alert type (price threshold or percent move)
3. Set parameters for selected alert type
4. Confirm and save alert rule

_Data touched:_ Alert rule

### Price Check
_Trigger:_ /price

1. Parse ticker parameter
2. Fetch current price data
3. Display price with context
4. Handle unknown ticker case

_Data touched:_ Watchlist item

### Morning Summary
_Trigger:_ summary:time

1. Check if outside quiet hours
2. Fetch all watchlist prices
3. Display summary with recent changes
4. Handle no-changes case

_Data touched:_ User profile, Watchlist item

### Alert Trigger
_Trigger:_ price update

1. Check all active alert rules
2. Evaluate price changes against rules
3. Send alert message if rule matches
4. Apply cooldown period
5. Log alert event

_Data touched:_ Alert rule, Alert event log

### Admin Analytics
_Trigger:_ /admin_stats

1. Verify owner identity
2. Fetch user count
3. Fetch top 10 alert rules
4. Display analytics dashboard

_Data touched:_ User profile, Alert event log

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User profile** _(retention: persistent)_ — User-specific settings and preferences
  - fields: Telegram ID, timezone, quiet hours start, quiet hours end, morning summary time, cooldown length
- **Watchlist item** _(retention: persistent)_ — A cryptocurrency being tracked by a user
  - fields: ticker, display name, alert rules, enabled flag
- **Alert rule** _(retention: persistent)_ — A user-defined condition for price alerts
  - fields: type, parameters, last-fired timestamp
- **Alert event log** _(retention: persistent)_ — Record of all triggered alerts
  - fields: user, ticker, rule, old price, new price, percent change, timestamp

## Integrations

- **Telegram** (required) — Bot API messaging
- **Price Feed API** (required) — Cryptocurrency price data
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /admin_stats command to view analytics
- Configure default cooldown period
- Set common ticker buttons (BTC, ETH, TON)

## Notifications

- Price alerts to users
- Morning summaries to users
- Admin analytics dashboard

## Permissions & privacy

- Private user data stored securely
- No group chat interactions
- No external data sharing

## Edge cases

- Unknown or invalid ticker symbols
- Price feed API failures
- Multiple alerts triggering simultaneously
- Quiet hours overlapping with morning summary time
- User timezone changes after onboarding

## Required tests

- Verify alert triggers with price changes
- Test morning summary delivery outside quiet hours
- Validate unknown ticker handling
- Confirm admin analytics display
- Test cooldown period behavior

## Assumptions

- Users will provide accurate ticker symbols
- Price feed API will eventually succeed after retries
- Owner will maintain the default cooldown period
- Users will set appropriate quiet hours
