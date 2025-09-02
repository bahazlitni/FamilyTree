'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import type { SearchIndex } from '@/types'
import GraphLink from '@/components/GraphLink'
import styles from './styles.module.css'
import { useAppGraph } from '@/contexts/AppGraphContext'

type Props = {
    limit: number
    placeholder?: string
}

export default function SearchBox({
    limit = 30,
    placeholder = 'Search name...',
}: Props) {
    const { appGraph } = useAppGraph()
    const [results, setResults] = useState<SearchIndex[]>([])
    const [active, setActive] = useState<number>(-1)

    const wrapRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)

    const open = useMemo(() => results.length > 0, [results])

    const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!appGraph?.searchIndices) return setResults([])
        const q = e.target.value.trim().toLowerCase()
        if(!q) setResults([])
        else {
            setResults(
                appGraph.searchIndices
                .filter(s => s.label.toLowerCase().startsWith(q) || s.searchBy.toLowerCase().startsWith(q))
                .slice(0, limit)
            )
        }
        setActive(results.length ? 0 : -1)
    }, [appGraph])

    const onSearchClick = () => {
        const idx = active >= 0 ? active : 0
        setActive(idx)
    }

    return (
        <div ref={wrapRef} className={styles.wrap}>
        <div className={styles.inputWrap}>
            <input
                ref={inputRef}
                className={styles.input}
                placeholder={placeholder}
                onChange={onInputChange}
                onBlur={() => setResults([])}
                aria-autocomplete="both"
                aria-expanded={open}
                aria-controls="searchbox-listbox"
                role="combobox"
            />
            <button
                type="button"
                className={styles.searchBtn}
                aria-label="Search"
                onMouseDown={(e) => e.preventDefault()} // keep input focused
                onClick={onSearchClick}
                title="Search"
            >
            <FiSearch />
            </button>
        </div>

        {open && (
            <div
            id="searchbox-listbox"
            className={styles.drop}
            role="listbox"
            >
            {results.map((r, i) => {
                const searchBy = r.searchBy ?? ''
                const isActive = i === active
                return (
                <div
                    key={`${r.resolveId ?? r.id ?? searchBy}::${i}`}
                    role="option"
                    aria-selected={isActive}
                    className={`${styles.option} ${isActive ? styles.isActive : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={() => { setResults([]); setActive(-1) }}
                >
                    <GraphLink
                        id={r.resolveId}
                        className={styles.optionLink}
                        title={searchBy || r.label}
                    >
                        {searchBy && <div className={styles.itemNote}>{searchBy}</div>}
                    </GraphLink>
                </div>
                )
            })}
            </div>
        )}
        </div>
    )
}
