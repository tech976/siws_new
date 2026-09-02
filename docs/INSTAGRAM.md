# Connecting the Instagram feed

The front page has a six-post Instagram grid ("Life at SIWS"). This is how to
make it show real posts from [@siws_wadala](https://www.instagram.com/siws_wadala/).

Roughly 20–30 minutes, done once. **Nothing here is urgent** — until it is done
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

So the only supported route is an **access token**. The good news is that
@siws_wadala is already a *professional* (business) account, which is the one
prerequisite that cannot be fixed in software.

---

## What you need before starting

- The Instagram login for **@siws_wadala**
- A **Facebook account** — Meta requires one to create a developer app, even
  though this only touches Instagram
- About 25 minutes

---

## Step 1 — Create a Meta developer app

1. Go to <https://developers.facebook.com/apps> and log in.
2. **Create app**.
3. For "What do you want your app to do?", choose **Other**, then **Business**.
4. Name it something recognisable — `SIWS Website Feed` — and create it.

## Step 2 — Add Instagram

1. In the app dashboard, find **Instagram** in the product list and click
   **Set up**.
2. Choose **API setup with Instagram login**.
3. Under **Add account**, connect **@siws_wadala** and accept the permission
   prompt.

Only the read permission (`instagram_business_basic`) is needed. The site never
posts, deletes or changes anything — it only reads.

## Step 3 — Generate a long-lived token

In the same Instagram setup screen, use **Generate token** for @siws_wadala.

Copy the token immediately — Meta shows it once. It is a long string beginning
`IGAA...`.

> This is a **long-lived** token: it lasts **60 days**. See "Keeping it alive"
> below, and do that part now rather than later.

## Step 4 — Put it on the server

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
2. When it fires, refresh the token:

   ```bash
   curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=YOUR_CURRENT_TOKEN"
   ```

   The response contains a new token with another 60 days on it. Put it in
   `.env` and restart.

A token can only be refreshed while it is **still valid**. If it has already
expired, start again from Step 3.

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
