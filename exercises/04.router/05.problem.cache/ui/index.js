import {
	Suspense,
	createElement as h,
	startTransition,
	use,
	useDeferredValue,
	useEffect,
	useRef,
	useState,
	useTransition,
} from 'react'
import { createRoot } from 'react-dom/client'
import * as RSC from 'react-server-dom-esm/client'
// 💰 you're going to need this
import { contentCache, useContentCache, generateKey } from './content-cache.js'
import { ErrorBoundary } from './error-boundary.js'
import { shipFallbackSrc } from './img-utils.js'
import { RouterContext, getGlobalLocation, useLinkHandler } from './router.js'

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

let initialContentKey = window.history.state?.key

if (!initialContentKey) {
	initialContentKey = generateKey()
	window.history.replaceState({ key: initialContentKey }, '', initialLocation)
}

// 🐨 create an initialContentKey here assigned to window.history.state?.key
// 🐨 if there's no initialContentKey
//   - set it to a new generated one with generateKey
//   - call window.history.replaceState with the initialContentKey
contentCache.set(initialContentKey, initialContentPromise)
// 🐨 use the initialContentKey to add the initialContentPromise in the contentCache

function Root() {
	const latestNav = useRef(null)
	// 🐨 get the contentCache from useContentCache
	const contentCache = useContentCache()
	const [nextLocation, setNextLocation] = useState(getGlobalLocation)
	// 🐨 change this to contentKey
	const [contentKey, setContentKey] = useState(initialContentKey)
	const [isPending, startTransition] = useTransition()

	const location = useDeferredValue(nextLocation)
	// 🐨 get the contentPromise from the contentCache by the contentKey
	const contentPromise = contentCache.get(contentKey)

	useEffect(() => {
		function handlePopState() {
			const nextLocation = getGlobalLocation()
			setNextLocation(nextLocation)
			// 🐨 get the historyKey from window.history.state?.key (or fallback to a new one with generateKey)

			const historyKey = window.history.state?.key || generateKey()
			// 🐨 if the contentCache does not have an entry for the historyKey, then trigger this update:
			if (!contentCache.has(historyKey)) {
				const fetchPromise = fetchContent(nextLocation)
				const nextContentPromise = createFromFetch(fetchPromise)
				contentCache.set(historyKey, nextContentPromise)
			}
			// 🐨 use the historyKey to add the nextContentPromise in the contentCache

			// 🐨 change this to setContentKey(historyKey)
			startTransition(() => setContentKey(historyKey))
		}
		window.addEventListener('popstate', handlePopState)
		return () => window.removeEventListener('popstate', handlePopState)
	}, [])

	function navigate(nextLocation, { replace = false } = {}) {
		setNextLocation(nextLocation)
		const thisNav = Symbol(`Nav for ${nextLocation}`)
		latestNav.current = thisNav

		// 🐨 create a nextContentKey with generateKey()
		const newContentKey = generateKey()
		const nextContentPromise = createFromFetch(
			fetchContent(nextLocation).then((response) => {
				if (thisNav !== latestNav.current) return
				if (replace) {
					// 🐨 add a key property here
					window.history.replaceState({ key: newContentKey }, '', nextLocation)
				} else {
					// 🐨 add a key property here
					window.history.pushState({ key: newContentKey }, '', nextLocation)
				}
				return response
			}),
		)

		// 🐨 use the nextContentKey to add the nextContentPromise in the contentCache

		contentCache.set(newContentKey, nextContentPromise)
		// 🐨 update this to setContentKey(newContentKey)
		startTransition(() => setContentKey(newContentKey))
	}

	useLinkHandler(navigate)

	return h(
		RouterContext,
		{
			value: {
				navigate,
				location,
				nextLocation,
				isPending,
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
