import {
	Suspense,
	createElement as h,
	startTransition,
	use,
	useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import * as RSC from 'react-server-dom-esm/client'
import { ErrorBoundary } from './error-boundary.js'
import { shipFallbackSrc } from './img-utils.js'
import {
	RouterContext,
	getGlobalLocation,
	useLinkHandler,
	// 💰 you'll need this
	// useLinkHandler,
} from './router.js'

function fetchContent(location) {
	return fetch(`/rsc${location}`)
}

function createFromFetch(fetchPromise) {
	return RSC.createFromFetch(fetchPromise, {
		moduleBaseURL: `${window.location.origin}/ui`,
	})
}

const initialLocation = getGlobalLocation()
const initialContentPromise = createFromFetch(fetchContent(initialLocation))

function Root() {
	// 🐨 put this in state so we can update this as the user navigates
	const [location, setLocation] = useState(initialLocation)
	// 🐨 put this in state so we can update this as the user navigates
	const [contentPromise, setContentPromise] = useState(initialContentPromise)

	// 🐨 this function should accept the nextLocation and an optional options argument
	// that has a replace option which defaults to false (this will be used to
	// determine whether we should call replaceState or pushState)
	function navigate(nextLocation, { replace = false } = {}) {
		setLocation(nextLocation)

		const nextContentFetchPromise = fetchContent(nextLocation)
		nextContentFetchPromise.then((response) => {
			if (replace) {
				window.history.replaceState({}, '', nextLocation)
			} else {
				window.history.pushState({}, '', nextLocation)
			}
			return response
		})
		const nextContentPromise = createFromFetch(nextContentFetchPromise)
		startTransition(() => setContentPromise(nextContentPromise))
		// 🐨 set the location to the nextLocation
		// 🐨 create a nextContentFetchPromise which is set to fetchContent(nextLocation)
		// 🐨 add a .then handler to the fetch promise which accepts the response
		//   - if replace is true, call window.history.replaceState({}, '', nextLocation)
		//   - otherwise, call window.history.pushState({}, '', nextLocation)
		//   - return the response
		// 🐨 create a nextContentPromise variable set to createFromFetch(nextContentFetchPromise)
		// 🐨 set the content promise inside a startTransition
	}

	// 🐨 call useLinkHandler with navigate so all links will navigate when clicked
	useLinkHandler(navigate)

	return h(
		RouterContext,
		{
			value: {
				navigate,
				location,
			},
		},
		use(contentPromise),
	)
}

startTransition(() => {
	createRoot(document.getElementById('root')).render(
		h(
			'div',
			{ className: 'app-wrapper' },
			h(
				ErrorBoundary,
				{
					fallback: h(
						'div',
						{ className: 'app-error' },
						h('p', null, 'Something went wrong!'),
					),
				},
				h(
					Suspense,
					{
						fallback: h('img', {
							style: { maxWidth: 400 },
							src: shipFallbackSrc,
						}),
					},
					h(Root),
				),
			),
		),
	)
})
