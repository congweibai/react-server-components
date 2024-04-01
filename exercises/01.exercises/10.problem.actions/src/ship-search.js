'use client'

import { Fragment, Suspense, createElement as h } from 'react'
import { ErrorBoundary } from './error-boundary.js'
import { parseLocationState, mergeLocationState, useRouter } from './router.js'
import { useSpinDelay } from './spin-delay.js'

export function ShipSearch({ search, results, fallback }) {
	const { navigate, location, nextLocation } = useRouter()
	const isShipSearchPending = useSpinDelay(
		parseLocationState(nextLocation).search !==
			parseLocationState(location).search,
		{ delay: 300, minDuration: 350 },
	)

	return h(
		Fragment,
		null,
		h(
			'form',
			{ onSubmit: e => e.preventDefault() },
			h('input', {
				placeholder: 'Filter ships...',
				type: 'search',
				defaultValue: search,
				name: 'search',
				autoFocus: true,
				onChange: event => {
					const newLocation = mergeLocationState(location, {
						search: event.currentTarget.value,
					})
					navigate(newLocation, { replace: true })
				},
			}),
		),
		h(
			ErrorBoundary,
			{
				fallback: h(
					'div',
					{ style: { padding: 6, color: '#CD0DD5' } },
					'There was an error retrieving results',
				),
			},
			h(
				'ul',
				{ style: { opacity: isShipSearchPending ? 0.6 : 1 } },
				h(Suspense, { fallback }, results),
			),
		),
	)
}

export function SelectShipLink({ shipId, highlight, children }) {
	const { location, navigate } = useRouter()
	return h('a', {
		children,
		href: `/${shipId}`,
		style: { fontWeight: highlight ? 'bold' : 'normal' },
		onClick: event => {
			if (event.ctrlKey || event.metaKey || event.shiftKey) return
			event.preventDefault()
			const newLocation = mergeLocationState(location, { shipId })
			navigate(newLocation)
		},
	})
}