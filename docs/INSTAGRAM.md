# Connecting the Instagram feed

The front page has a six-post Instagram grid ("Life at SIWS"). This is how to
make it show real posts from [@siws_wadala](https://www.instagram.com/siws_wadala/).

Roughly 30 minutes, done once. **Nothing here is urgent** — until it is done
the grid shows whatever posts staff add in the admin panel, and the site works
normally either way.

---

## Why this is not just a URL

There is no public Instagram feed to read any more. Meta shut the **Basic
Display API** down on **4 December 2024**, and the older unauthenticated tricks
(`?__a=1`, the public oEmbed endpoint) went with it — they now return errors or
a login wall.

Scraping the profile page is not a workaround. Instagram rate-limits by IP,
blocks datacentre address ranges outright, and forbids it in their terms. It
would work on a laptop and fail on the server, which is the worst possible way
for something to break.

So the only supported route is an **access token**.

---

## The simple way (start here)

**No token. No Meta developer app. No access to the school's Instagram.**
About two minutes.

Instagram lets anyone embed a *public post* by its address. The site uses that
directly, so Instagram serves the picture, caption and like count itself.

1. Open <https://www.instagram.com/siws_wadala/> in a browser.
2. Click a post you want to show. The address bar now reads something like
   `https://www.instagram.com/p/DclQoBbiEV-/`. Copy it.
3. In the admin panel, open the front page, find the **Instagram feed** section,
   and paste it under **Instagram post links**.
4. Repeat for six posts. Save.

Done — the grid is live.

**What stays automatic:** each post's picture, caption and likes come from
Instagram every time someone opens the page, so nothing goes stale, and editing
a caption on Instagram updates the website.

**What does not:** the *choice* of which six posts is yours. When the school
posts something new and you want it featured, paste the new link and remove the
oldest. Worth doing once a month.

If that trade is fine — and for most school sites it is — **you can stop
reading here.** The rest of this document is only for making the six posts
update themselves.

---

## Making it fully automatic

Only needed if you want the latest posts to appear with nobody pasting links.
Both routes below need a Meta developer app.

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
