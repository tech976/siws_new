/**
 * Instagram's own profile embed — the account's latest posts, automatically.
 *
 * WHY THIS IS THE DEFAULT. It is the only route that is both fully automatic
 * and needs nothing at all: no access token, no Meta developer app, and no
 * access to the school's Instagram account. Instagram serves the grid itself
 * from `/<username>/embed/`, and returns it with `no-store`, so what a visitor
 * sees is what the account looks like at that moment.
 *
 * When SIWS posts something new it appears here on its own. Nobody has to
 * paste a link, upload a picture, or refresh a token — which is what makes it
 * the right default for a section nobody will be assigned to maintain.
 *
 * WHAT IT COSTS. The frame is Instagram's, so its look is theirs: a profile
 * header, a six-post grid, and their own typography inside our card. It cannot
 * be restyled — cross-origin frames are opaque to us — so the surrounding
 * section carries the SIWS treatment and the frame sits inside it as a quoted
 * object rather than pretending to be part of the page.
 *
 * PRIVACY. The frame is served by Instagram and sets Meta's cookies for anyone
 * who scrolls to it. `loading="lazy"` means it is not requested until the
 * visitor approaches, so it stays off the page entirely for the majority who
 * never reach the bottom.
 */
export const InstagramProfileEmbed = ({ handle }: { handle?: string | null }) => {
  const account = handle?.replace(/^@/, '').trim()
  if (!account) return null

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      {/*
        SIZING THE FRAME.
        
        The frame is cross-origin: it cannot report its content height and we
        cannot read it. A fixed pixel height therefore either clips the bottom
        row of the grid or leaves a band of white beneath it, and which one it
        does changes with the viewport.

        Instagram lays the embed out as a profile header above two rows of
        square thirds, so its height is `2 × (width / 3) + header`. Measured
        from 358px to 1160px wide, that header is a constant 223px, dropping to
        196px below ~560px where the follower line reflows.

        `padding-top` in a percentage resolves against the CONTAINER'S WIDTH —
        the one property that does — so 66.667% is exactly two square thirds,
        and the header is added to it as a fixed strip. The frame is then
        positioned to fill the box. `height` and `vw` were both tried first and
        are both wrong here: a percentage height resolves against the parent's
        height, and `vw` against the viewport rather than this column.
      */}
      <div className="relative pt-[calc(66.6667%+196px)] sm:pt-[calc(66.6667%+223px)]">
        <iframe
          src={`https://www.instagram.com/${account}/embed/`}
          title={`Latest posts from @${account} on Instagram`}
          loading="lazy"
          className="absolute inset-0 block h-full w-full border-0"
          scrolling="no"
        />
      </div>
    </div>
  )
}
