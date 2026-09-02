# Connecting the Instagram feed

The front page has a six-post Instagram grid ("Life at SIWS"). This is how to
make it show real posts from [@siws_wadala](https://www.instagram.com/siws_wadala/).

**The feed is already working and needs nothing from you.** This document
explains how, and what the alternatives are if you ever want more control.

---

## Background

Meta shut the **Basic Display API** down on **4 December 2024**, so there is no
longer an API that returns a public account's posts without credentials. That is
why most guides on this subject send you to a developer app and an access token.

Scraping the profile page is not a workaround either: Instagram rate-limits by
IP, blocks datacentre address ranges, and forbids it in their terms — it would
work on a laptop and fail on the server.

What still works, and what this site uses, is Instagram's own **profile embed**.
It is a supported, public feature intended for exactly this, needs no
credentials, and is what makes the section below maintenance-free.

---

## It already works — nothing to set up

The section is **already live and updating itself**. No token, no Meta developer
app, no access to the school's Instagram account, and no third-party service.

It reads the latest six posts from the account's own public embed page and
renders them in SIWS styling: 4:5 portrait tiles, six across on a desktop and
three on a phone. When SIWS posts something new it appears here on its own,
within fifteen minutes.

**There is nothing to maintain.** No links to paste, no token to refresh, no
subscription.

### If Instagram changes something

The post data is read from an undocumented part of that page, so Meta could
change it without notice. The section is built for that: if the read returns
nothing, it falls back automatically to Instagram's own profile embed — a
supported, stable feature that keeps working.

The worst realistic outcome is therefore that the tiles revert to Instagram's
square grid in Instagram's styling. The section cannot break the page, and it
cannot show an empty frame. If you ever see square tiles with Instagram's own
header, that is what has happened, and it is worth telling a developer.

To point the section at a different account, change **Account name** in the
admin panel.

---

## The other two modes

Set under **Where the posts come from** on the section.

**Chosen posts** — paste a link per post, when you want to control exactly which
six appear (say, to keep an exam-results post at the top). Each embedded post
still pulls its picture, caption and likes live from Instagram; only the choice
of posts is yours. Open a post on Instagram, copy the address bar, paste.

**Pictures uploaded here** — an ordinary picture grid that links to Instagram.
For when you want a fixed, hand-designed row that does not change.

---

## A note on paid widgets

Elfsight, RSS.app, Tagembed and similar services do offer auto-updating feeds
from a public username without account access, from about $5/month.

**They are not needed here** — the profile embed above does the same job for
free — and they are worth actively avoiding for a school site. None of them can
use an official Meta API for arbitrary public profiles, so they scrape, which
breaches Meta's terms and can break without warning. Elfsight also caches for up
to 48 hours, so a new post can take two days to appear; the profile embed is
immediate.

---

## The API routes

**Not needed for a working feed** — the profile embed above already updates
itself. These exist only if you want the posts rendered in the site's own design
rather than inside Instagram's frame, which requires reading the posts as data.

Both need a Meta developer app.

**Route A — Business Discovery. You do NOT need the school's Instagram login.**

Meta lets any professional account read the public posts of *another* public
professional account. @siws_wadala is public and professional, so this works
using credentials **you** create. Nobody has to hand over the school's password,
and nobody has to click "authorise" on the school account.

The cost is that you create a Facebook Page and a professional Instagram account
of your own — both free, and the Instagram account can be a brand new throwaway
that never posts anything.

**Route B — the school's own account.** Simpler, fewer steps, but it needs
someone who can sign in as @siws_wadala.

> **If you do not have access to the school account, use Route A.** It is the
> whole reason it is documented first.

Third-party widgets (LightWidget, SnapWidget, SociableKIT, Smash Balloon) are
**not** a way around this. They all run on the same Graph API and all require
connecting the account you want to display. Paying for one does not remove the
requirement — it just adds a bill.

---

# Route A — without access to the school account

## A1. Create your own professional Instagram account

Skip if you already have one you can use. It never needs to post.

1. Sign up for a new Instagram account.
2. **Settings → Account type and tools → Switch to professional account**.
3. Pick any category (e.g. *Education*). Choose **Business**.

## A2. Create a Facebook Page and link it

Business Discovery uses the Facebook login path, so a Page is required.

1. Create a Facebook Page (<https://www.facebook.com/pages/create>). Any name.
2. On the Instagram app: **Settings → Accounts Centre → Add accounts**, and
   connect the Page from step 1.

## A3. Create a Meta developer app

1. <https://developers.facebook.com/apps> → **Create app**.
2. Choose **Other**, then **Business**.
3. Name it `SIWS Website Feed`.

## A4. Get a token in Graph API Explorer

1. Open <https://developers.facebook.com/tools/explorer>.
2. Pick your app, then **Generate Access Token** and log in.
3. Add these permissions:
   - `instagram_basic`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
4. Generate, and copy the token.

## A5. Find your own Instagram user id

In the Explorer, run:

```
me/accounts?fields=instagram_business_account{id,username}
```

The `id` inside `instagram_business_account` is **your** Instagram user id — a
long number. Copy it. (Confirm `username` is *your* account, not the school's.)

## A6. Check it can read the school account

Still in the Explorer, replace `YOUR_ID` and run:

```
YOUR_ID?fields=business_discovery.username(siws_wadala){media.limit(6){id,caption,media_url,permalink}}
```

Six recent posts come back as JSON. **That confirms the whole thing works** —
without anyone touching the school's account.

If you get *"Invalid user id"*, the target is not a public professional account.
If you get a permissions error, re-check step A4.

## A7. Exchange for a long-lived token

The Explorer token lasts about an hour. Swap it for a 60-day one:

```bash
curl -s "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN"
```

`APP_ID` and `APP_SECRET` are in your app's **Settings → Basic**.

## A8. Put it on the server

In `.env` on the VPS:

```
INSTAGRAM_ACCESS_TOKEN=EAAG...your long-lived token...
INSTAGRAM_USER_ID=17841400000000000
INSTAGRAM_TARGET_USERNAME=siws_wadala
```

Then `pm2 restart siws`. Done.

---

# Route B — with access to the school account

Use this only if someone can sign in as @siws_wadala. Set
**`INSTAGRAM_ACCESS_TOKEN` only** and leave the other two variables blank.

## B1. Create a Meta developer app

1. Go to <https://developers.facebook.com/apps> and log in.
2. **Create app**.
3. For "What do you want your app to do?", choose **Other**, then **Business**.
4. Name it something recognisable — `SIWS Website Feed` — and create it.

## B2. Add Instagram

1. In the app dashboard, find **Instagram** in the product list and click
   **Set up**.
2. Choose **API setup with Instagram login**.
3. Under **Add account**, connect **@siws_wadala** and accept the permission
   prompt.

Only the read permission (`instagram_business_basic`) is needed. The site never
posts, deletes or changes anything — it only reads.

## B3. Generate a long-lived token

In the same Instagram setup screen, use **Generate token** for @siws_wadala.

Copy the token immediately — Meta shows it once. It is a long string beginning
`IGAA...`.

> This is a **long-lived** token: it lasts **60 days**. See "Keeping it alive"
> below, and do that part now rather than later.

## B4. Put it on the server

Add it to `.env` on the VPS:

```
INSTAGRAM_ACCESS_TOKEN=IGAA...your token here...
```

Then restart the app:

```bash
pm2 restart siws
```

The grid switches to live posts within 15 minutes (see "Caching" below), or
immediately after a restart.

**Never commit this token.** `.env` is in `.gitignore` and must stay there. A
leaked token lets anyone read the account's media until it is revoked.

---

## Keeping it alive

A long-lived token expires after **60 days**. When it does, the grid quietly
falls back to the CMS posts — the page keeps working, which is deliberate, but
it also means nobody notices.

**Do this now, while you are thinking about it:**

1. Put a repeating calendar reminder every **50 days**, titled something like
   "Refresh SIWS Instagram token".
2. When it fires, refresh the token. **The command differs by route.**

   Route A (Business Discovery) — re-exchange, as in step A7:

   ```bash
   curl -s "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=CURRENT_TOKEN"
   ```

   Route B (own account):

   ```bash
   curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=CURRENT_TOKEN"
   ```

   Either way the response contains a new token with another 60 days on it. Put
   it in `.env` and `pm2 restart siws`.

A token can only be refreshed while it is **still valid**. If it has already
expired, start again from B3 (route B) or A4 (route A).

---

## Checking it worked

Visit the front page and look at "Life at SIWS". If those are the account's real
recent posts, it is working.

If they are the posts entered in the admin panel — or the section is missing —
check the application log:

```bash
pm2 logs siws --lines 100 | grep instagram
```

| What the log says | What it means |
|---|---|
| Nothing at all | No token is set. The grid is using CMS posts. |
| `[instagram] 400 Bad Request` | The token has expired or been revoked. Generate a new one (Step 3). |
| `[instagram] 429` | Rate limited. Rare; it clears by itself. |
| `[instagram] feed unavailable` | Meta was slow or unreachable. Clears by itself. |

In every one of those cases the page still renders. The feed is the least
important thing on the front page and is built never to be the reason it breaks.

---

## Caching

A fetched feed is reused for **15 minutes**.

Instagram allows 200 calls an hour, and the front page is served to every
visitor — without caching, a single busy morning would exhaust that. A new post
therefore takes up to 15 minutes to appear, which is the right trade for a
school that posts a few times a week.

---

## The fallback posts

In the admin panel, open the front page and find the **Instagram feed** section.
Its **Posts** list is what shows when the live connection is unavailable.

It is worth filling in with six recent posts even after the token is working. It
costs ten minutes and is what stands between a token expiry and an empty space
on the front page.

For each post: upload the picture, paste the post's caption, and paste the
address of that individual post (open the post on Instagram and copy the URL
from the address bar).
