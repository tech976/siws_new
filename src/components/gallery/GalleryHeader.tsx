'use client'

/**
 * The title, the standfirst, and the category tabs.
 *
 * The tabs are a `role="tablist"`, not a row of buttons that happen to look
 * like tabs. That is what makes the arrow keys work the way anyone who has met
 * a tab strip expects: Left and Right move between them, Home and End jump to
 * the ends, and only the selected tab is in the page's tab order — so someone
 * tabbing through the page steps over the whole strip in one press rather than
 * six, and lands on the photographs.
 */
export const GalleryHeader = ({
  categories,
  active,
  onChange,
  counts,
  allLabel,
  children,
}: {
  categories: string[]
  active: string | null
  onChange: (category: string | null) => void
  counts: Record<string, number>
  allLabel: string
  /** Heading and intro, rendered on the server and passed straight through. */
  children?: React.ReactNode
}) => {
  const tabs: { key: string | null; label: string; count: number }[] = [
    { key: null, label: allLabel, count: Object.values(counts).reduce((a, b) => a + b, 0) },
    ...categories.map((category) => ({ key: category, label: category, count: counts[category] ?? 0 })),
  ]

  const move = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()

    const index = tabs.findIndex((tab) => tab.key === active)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowLeft'
            ? (index - 1 + tabs.length) % tabs.length
            : (index + 1) % tabs.length

    onChange(tabs[next]!.key)
    /*
     * Focus follows selection, which is the pattern for a tablist whose panels
     * are cheap to swap — the visitor sees the wall change as they arrow along
     * it rather than having to press Enter at each stop.
     */
    const strip = event.currentTarget
    const button = strip.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]
    button?.focus()
  }

  return (
    <header className="mb-10">
      {children}

      <div
        role="tablist"
        aria-label="Filter photographs by subject"
        onKeyDown={move}
        className="mt-8 flex flex-wrap justify-center gap-2.5"
      >
        {tabs.map((tab) => {
          const selected = tab.key === active
          return (
            <button
              key={tab.key ?? '__all'}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.key)}
              className={[
                'inline-flex min-h-11 items-center gap-2 rounded-pill px-5 py-2.5 text-[0.9375rem] font-semibold transition-colors duration-200',
                selected
                  ? // Brand yellow for the one in force. It is the only place on
                    // the page the accent is used as a fill, so the eye finds
                    // the current filter before it reads any of the labels.
                    'bg-accent text-brand-deep shadow-[0_2px_10px_rgba(255,175,42,0.45)]'
                  : 'bg-white text-brand ring-1 ring-line hover:bg-brand-tint hover:ring-brand/30',
              ].join(' ')}
            >
              {tab.label}
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                  selected ? 'bg-brand-deep/15 text-brand-deep' : 'bg-sea text-brand',
                ].join(' ')}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
