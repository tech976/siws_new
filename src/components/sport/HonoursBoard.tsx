'use client'

import { useMemo, useState } from 'react'

export interface Honour {
  id: string
  title: string
  description?: string | null
  group?: string | null
}

/**
 * The trophy cabinet: honours under a rule each, with a tab per group (Team,
 * Individual) when the items are labelled with one. Every card is in the page
 * from the start; a tab only hides the others, so a visitor without
 * JavaScript sees the whole cabinet.
 */
export const HonoursBoard = ({ items }: { items: Honour[] }) => {
  const groups = useMemo(
    () => Array.from(new Set(items.map((item) => item.group).filter(Boolean))) as string[],
    [items],
  )
  const [active, setActive] = useState<string | null>(null)

  return (
    <div>
      {groups.length > 1 ? (
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Show honours">
          {[null, ...groups].map((group) => (
            <button
              key={group ?? 'all'}
              type="button"
              className="sp-tab"
              aria-pressed={active === group}
              onClick={() => setActive(group)}
            >
              {group ?? 'All'}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const team = /team/i.test(item.group ?? '')
          const hidden = active !== null && item.group !== active
          return (
            <li
              key={item.id}
              hidden={hidden}
              className="sp-rule"
              data-reveal
              style={{ ['--sp-delay' as string]: `${(index % 3) * 90}ms` }}
            >
              {item.group ? (
                <span className={`sp-chip ${team ? 'sp-chip--gold' : ''}`}>{item.group}</span>
              ) : null}
              <h3 className="mt-3 text-lg leading-snug font-bold text-brand">{item.title}</h3>
              {item.description ? (
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">{item.description}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default HonoursBoard
