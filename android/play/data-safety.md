# Play Console answers

Based on the code on the `android-app` branch (versionCode 1). Recheck if you add
libraries, analytics, crash reporting, ads, or a server.

## Data safety

### Overview

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (see below) |
| Is all user data collected by your app encrypted in transit? | **Yes** (all requests are HTTPS; cleartext is blocked by default at targetSdk 36 and there is no network security config that allows it) |
| Do you provide a way for users to request that their data is deleted? | **No** (the developer holds no data; everything on the device is deleted by uninstalling or clearing storage). If the form lets you add a note, say that. |
| Independent security review | No |

### Data types

Only one type applies:

**App activity > In-app search history: Collected, not shared.**

- Collected: Yes. The theme search text (a built-in theme or text the user types)
  is sent from the device to wallhaven.cc, and to google.serper.dev if the user
  added a key. Google counts any transmission off the device as "collection",
  even if it never reaches the developer, so this is the safe answer.
- Processed ephemerally: **Yes**. The app keeps nothing off-device; it sends
  the text, uses the results, and that's it. (The third party may log it, which
  is covered by their policy.)
- Required or optional: **Required** (the app can't search without a theme).
- Purpose: **App functionality**.
- Shared: **No**. Google exempts transfers the user starts and would reasonably
  expect ("user-initiated action"): the user picks the theme, and the app says
  in Settings and in the listing that images come from Wallhaven and, with the
  user's own key, Serper. The Serper request is also made with the user's own
  API key on their own account. If you prefer maximum caution, marking it
  "Shared" with purpose App functionality is also defensible; it just looks
  scarier on the listing.

Everything else: **not collected**.

- No personal info, location, contacts, photos/files, messages, health,
  financial info, or device IDs are read or sent.
- IP address and user agent are sent as part of normal network requests. Google
  does not require disclosing these by themselves unless you use them (the
  developer doesn't receive them at all).
- The Serper API key is a credential the user supplies for their own Serper
  account. It is not one of Google's data types. It stays in private storage,
  is excluded from backup, and is only sent to google.serper.dev.
- Downloaded images are public web content, not user data.
- Settings, history, and skipped-image URLs stay on the device (they may be
  included in the user's own Android backup, which is not developer collection).

## Content rating (IARC questionnaire)

- Email: infwallpapers@gmail.com
- Category: **All other app types** (utility / personalization)
- Violence: No
- Fear / horror: No
- Sexuality / nudity: No
- Language (profanity): No
- Controlled substances (drugs, alcohol, tobacco): No
- Crude humor: No
- Gambling / simulated gambling: No
- Does the app let users interact or exchange content with other users? **No**
- Does the app share the user's current location with other users? **No**
- Does the app let users buy digital goods? **No**
- Does the app contain swastikas or other extremist symbols? **No**
- Is the app a web browser or search engine / does it give unrestricted
  internet access? **No**. It is not a browser; it only fetches images with
  safe search forced on and never shows web pages. This is a judgement call:
  the custom-theme box does let users search web images freely (filtered). If
  the wording in the form covers "any user-entered search of web content", answer
  Yes. That may raise the rating, which is fine for a 13+ target audience.

Expected result: low rating (e.g. Everyone / PEGI 3), possibly higher if you
answer Yes to the internet question.

## Target audience and content

- Target age groups: **13-15, 16-17, 18 and over** (chosen 2026-10-01).
  Nothing under 13: images come from third-party websites and safe-search
  filters are not perfect, so it must not be aimed at children.
- Appeals to children? **No** (no child-focused design or characters).
- This keeps the app out of the Families policy requirements.

## Ads

- Does your app contain ads? **No**

## Other App content declarations

- App access: **All functionality is available without special access** (no login).
- News app: No
- COVID-19 contact tracing/status: No
- Government app: No
- Financial features: None
- Health: No
- Advertising ID: **No** (the app doesn't use it; no ads/analytics libraries)
