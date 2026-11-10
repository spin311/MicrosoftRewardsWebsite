# Vision

## Problem

Microsoft Rewards grants points for daily Bing searches and "daily set" tasks. Doing
these manually every day is tedious and easy to forget. Points convert to gift cards,
game currency, or charity donations.

## Product

A set of lightweight clients that automate the daily Bing activity so a signed-in user
collects the maximum daily points with zero effort — either on demand (a button) or
automatically once per day.

## Who it serves

Individual Microsoft Rewards users who want to accumulate points passively. Distributed
free (with a donation link) via the Chrome Web Store, Firefox Add-ons, and as an Android
`.apk` / Play Store app.

## Principles (inferred from the code)

- **Zero infrastructure.** No servers, accounts, or databases owned by the project.
  Everything runs client-side and relies on the user's own Microsoft session.
- **Human-like searches.** Randomized query text (word phrases or random strings),
  randomized delays and jitter between searches, to look organic. — *Intent inferred;
  Needs Verification against Microsoft's current detection behavior.*
- **Cross-platform reach.** Same idea delivered on Chrome, Firefox, and mobile.

## Non-goals

- No analytics/telemetry back to the author (aside from external help page hits).
  **Needs Verification.**
- No handling or storage of Microsoft credentials — login happens in the browser/WebView.

## Compliance note (flag, not a judgment)

Automating Rewards activity may conflict with the Microsoft Rewards Terms of Service.
This is a product/legal risk worth stating explicitly; it is not addressed anywhere in
the codebase. **Needs Verification / owner decision.**
