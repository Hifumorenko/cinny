import { useCallback, useEffect, useId, useState } from 'react';
import { ModalMedia, OverlayBackdropNoAnimation } from '../styles/Modal.css';

/** Marks the room timeline's own scroll container, so navigation is scoped to it. */
const GALLERY_ROOT_ATTR = 'data-room-timeline-scroll';
const GALLERY_ROOT_SELECTOR = `[${GALLERY_ROOT_ATTR}]`;
/**
 * Marks every clickable media element eligible for prev/next navigation. Its
 * value is a key minted by `useMediaGalleryNav` — never anything derived from
 * the media itself; see that hook for why that distinction is load-bearing.
 */
export const MEDIA_NAV_ATTR = 'data-media-nav';

/**
 * Set on the timeline's scroll container for as long as a navigation is
 * driving its scroll position, so the timeline's own stick-to-bottom logic
 * stands down while that happens.
 *
 * Stepping back through history has to jump the scroller to the top to make
 * the timeline paginate older events in. That pagination grows the content,
 * which trips RoomTimeline's resize observer, which scrolls back to the
 * bottom if it still believes the reader is pinned there — and it does still
 * believe that, because it only ever drops the belief on real reader input
 * (wheel, touch, key, pointer), and this jump is programmatic. The result is
 * a loop: jump to top, history loads, snap to bottom, the older media
 * unmounts out of the rendered window, the target is never found, repeat.
 */
export const GALLERY_NAV_ATTR = 'data-media-gallery-navigating';

/** How long, and how often, to wait for a newly paginated-in item to mount. */
const POLL_INTERVAL_MS = 150;
const POLL_ATTEMPTS = 10;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Two frames is a more robust wait than a bare macrotask for "the DOM has
 * caught up with a just-applied state change" — a single `setTimeout(fn, 0)`
 * can still land before React has finished unmounting the closed viewer's
 * focus trap under heavier render load (e.g. while pagination is also
 * mounting a batch of new messages), which is exactly when this raced.
 */
const nextPaint = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const findMediaNavElements = (root: ParentNode): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(`[${MEDIA_NAV_ATTR}]`));

const findByMediaKey = (key: string): HTMLElement | undefined =>
  findMediaNavElements(document).find((node) => node.getAttribute(MEDIA_NAV_ATTR) === key);

/**
 * The single source of truth for which keydown is a gallery-nav keypress —
 * shared by ImageViewer's own listener and the keydown shield below, so the
 * two can never drift apart on which keys they mean to intercept.
 */
export const getGalleryNavDirection = (evt: KeyboardEvent): 1 | -1 | undefined => {
  if (evt.ctrlKey || evt.metaKey || evt.altKey) return undefined;
  const key = evt.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') return -1;
  if (key === 'arrowright' || key === 'd') return 1;
  return undefined;
};

/**
 * ImageViewer's own keydown listener only exists while a viewer is actually
 * mounted — and during navigation there is a real gap (the old viewer has
 * unmounted, the new one has not yet mounted) where nothing is listening at
 * all. A key pressed in that gap was falling through to whatever the focus
 * trap had just handed focus back to — the composer — completely
 * unhandled, typing the letter (or moving its caret) into a live draft.
 * This is installed for the full duration of every in-flight `navigate()`
 * call (see `installKeyShield`/`releaseKeyShield`) specifically to cover
 * that gap. It only ever calls `preventDefault` — never `stopPropagation` —
 * so it cannot suppress whichever viewer's own listener is (or isn't)
 * attached at the moment: `preventDefault` alone blocks the browser's
 * default action (typing the key into whatever's focused) without stopping
 * the event from still reaching that listener, which is what the
 * same/opposite-direction cancellation logic in `navigate` depends on.
 */
const shieldKeydown = (evt: KeyboardEvent) => {
  if (getGalleryNavDirection(evt) === undefined) return;
  evt.preventDefault();
};

let keyShieldDepth = 0;

const installKeyShield = () => {
  keyShieldDepth += 1;
  if (keyShieldDepth === 1) {
    // Capture phase: must run before the keydown ever reaches the composer's
    // own input handling, not just before it bubbles back out of it.
    document.addEventListener('keydown', shieldKeydown, true);
  }
};

const releaseKeyShield = () => {
  keyShieldDepth = Math.max(0, keyShieldDepth - 1);
  if (keyShieldDepth === 0) {
    document.removeEventListener('keydown', shieldKeydown, true);
  }
};

/**
 * Hides the currently-open viewer's own backdrop and modal *in place*,
 * without unmounting either, and reports how to put them back.
 *
 * This exists because of the one structural fact behind every flicker here:
 * each media element owns its own `<Overlay>`, so stepping to the next image
 * means unmounting one whole overlay and mounting a different one. Doing
 * that in the obvious order — close, then open — leaves a window where *no*
 * viewer exists in the DOM at all, and everything visible goes wrong at once
 * in that window: the backdrop's 50% tint over the room disappears and comes
 * back (the room un-dims and re-dims), the focus trap tears down and hands
 * focus back to the composer, and `#portalContainer` empties out — which is
 * what the whole app uses to answer "is a modal open right now?" (`RoomView`
 * checks `portalContainer.children.length > 0` before its
 * type-anywhere-to-focus handler calls `ReactEditor.focus(editor)`, and
 * `Search` does the same), so a keypress in that window focuses and types
 * into the composer behind the viewer, repainting the room as it goes.
 *
 * No overlay placed *into* that gap can fix it, because the gap itself is
 * the bug. So navigation never opens the gap: it mounts the incoming viewer
 * first and only then unmounts the outgoing one. Both briefly exist, which
 * is why the outgoing one has to be made invisible in the same synchronous
 * block that mounts the incoming one — two live overlays would otherwise
 * stack two translucent backdrops into one visibly darker frame, and show
 * the old image behind the new one. Hidden this way, the room stays dimmed
 * by exactly one backdrop from the first frame to the last, the portal
 * container is never empty, and no focus trap is ever absent.
 */
type OutgoingViewer = {
  /** True once the outgoing overlay has actually left the DOM. */
  unmounted: () => boolean;
  /** Undoes the hiding, for the case where it never unmounted after all. */
  restore: () => void;
};

const hideOutgoingViewer = (): OutgoingViewer => {
  const backdrop = document.querySelector<HTMLElement>(`.${OverlayBackdropNoAnimation}`);
  const modal = document.querySelector<HTMLElement>(`.${ModalMedia}`);
  const backdropDisplay = backdrop?.style.display;
  const modalDisplay = modal?.style.display;
  if (backdrop) backdrop.style.display = 'none';
  if (modal) modal.style.display = 'none';

  return {
    unmounted: () => !modal || !document.contains(modal),
    restore: () => {
      if (backdrop) backdrop.style.display = backdropDisplay ?? '';
      if (modal) modal.style.display = modalDisplay ?? '';
    },
  };
};

/**
 * Waits for the target's own image data to be ready before this hook lets
 * navigation close the current viewer — otherwise the old image disappears
 * the instant the close fires, and the new one only has something to paint
 * a few frames later once its viewer has mounted, which reads as the photo
 * itself blinking out. Almost always resolves immediately in practice: the
 * target is a thumbnail already visible in the timeline, so the browser has
 * typically already fetched this exact url; this just makes that a
 * guarantee instead of a coincidence (e.g. for a `loading="lazy"` thumbnail
 * that has not actually fetched yet).
 */
const preloadImage = (src: string): Promise<void> =>
  new Promise((resolve) => {
    const img = new Image();
    // Attached before `src` is set, so a synchronous/cached resolution is
    // never missed.
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
    if (img.complete) resolve();
  });

/**
 * At most one navigation runs at a time, shared across every viewer instance
 * since only one viewer is ever open at a time. A same-direction call made
 * while one is already running (e.g. a fast double click) is simply dropped.
 * An opposite-direction call instead cancels the running one — without that,
 * spamming one direction past the end of what is loaded leaves the in-flight
 * call stuck polling for up to ~1.5s (see below) with nothing to find, and a
 * single press the other way would otherwise sit blocked behind it instead
 * of immediately stepping back.
 */
let current: { direction: 1 | -1; cancelled: boolean } | undefined;

/**
 * Lets an open media viewer step to the next/previous viewable media in the
 * room timeline, by locating the DOM element for it and clicking it — this
 * reuses whichever component owns that element's own open-viewer logic
 * (including its own async src resolution, spoiler state, etc.) instead of
 * duplicating any of that here.
 *
 * `activeIndex` says which of this component's own frames the open viewer
 * came from — `0` where there is only one, the frame's index within a
 * multi-frame mosaic — or `undefined` while no viewer is open. Stamp
 * `navKeyFor(index)` onto each frame's `[data-media-nav]` element so it can
 * be found again. Only available when that element lives inside the room
 * timeline's own scroll container; elsewhere `onPrev`/`onNext` come back
 * `undefined` so the viewer hides its navigation controls rather than
 * showing buttons that would silently do nothing.
 *
 * Those keys are minted here, off a per-instance `useId`, rather than taken
 * from callers. A lookup resolves a key to the *first* element carrying it,
 * so any value derived from the media itself — a url, an mxc, a status id —
 * is a cycle waiting to happen: the same picture, gif or post sent twice
 * hands both copies one key, every lookup lands on the earlier copy, and
 * stepping forward walks back onto itself instead of moving on. Minting the
 * key per mounted frame makes that collision impossible to reintroduce from
 * a call site.
 */
export const useMediaGalleryNav = (activeIndex: number | undefined, close: () => void) => {
  const [inGallery, setInGallery] = useState(false);

  const idBase = useId();
  const navKeyFor = useCallback((index = 0): string => `${idBase}:${index}`, [idBase]);
  const mediaKey = activeIndex === undefined ? undefined : navKeyFor(activeIndex);

  useEffect(() => {
    if (!mediaKey) {
      setInGallery(false);
      return;
    }
    setInGallery(!!findByMediaKey(mediaKey)?.closest(GALLERY_ROOT_SELECTOR));
  }, [mediaKey]);

  const navigate = useCallback(
    async (direction: 1 | -1) => {
      if (!mediaKey) return;

      if (current) {
        if (current.direction === direction) return;
        current.cancelled = true;
      }

      const state = { direction, cancelled: false };
      current = state;
      installKeyShield();
      let navRoot: HTMLElement | undefined;

      try {
        const el = findByMediaKey(mediaKey);
        const root = el?.closest<HTMLElement>(GALLERY_ROOT_SELECTOR);
        if (!el || !root) return;
        navRoot = root;
        root.setAttribute(GALLERY_NAV_ATTR, '');

        const findTarget = (): HTMLElement | undefined => {
          const all = findMediaNavElements(root);
          const index = all.indexOf(el);
          if (index === -1) return undefined;
          return all[index + direction];
        };

        let target = findTarget();

        if (!target) {
          // Nudges the timeline's own scroll-triggered pagination toward the
          // edge, then waits briefly for a newly rendered item to show up.
          //
          // Moves the viewed frame to the edge of the viewport, and never the
          // scroller to its own extreme. The timeline virtualizes, so jumping
          // the whole way scrolls the viewed message clean out of the rendered
          // range — unmounting it, and the open viewer along with it. That is
          // what turned "there is nothing after this one" into "the viewer
          // shuts itself"; keeping the frame on screen keeps it mounted, so
          // running off the end is simply a no-op.
          const restoreScrollTop = root.scrollTop;
          const rootRect = root.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          root.scrollTop +=
            direction === -1 ? elRect.bottom - rootRect.bottom : elRect.top - rootRect.top;

          for (
            let attempt = 0;
            attempt < POLL_ATTEMPTS && !target && !state.cancelled;
            attempt += 1
          ) {
            // eslint-disable-next-line no-await-in-loop
            await sleep(POLL_INTERVAL_MS);
            target = findTarget();
          }

          // Nothing came in, so this really is the end of the gallery: put the
          // timeline back where the reader had it rather than leaving it
          // parked at the nudge.
          if (!target) root.scrollTop = restoreScrollTop;
        }

        if (state.cancelled || !target) return;

        const targetImageSrc = target.querySelector('img')?.src;
        if (targetImageSrc) {
          await preloadImage(targetImageSrc);
          if (state.cancelled) return;
        }

        // Nothing may `await` between hiding the outgoing viewer and mounting
        // the incoming one: they have to land in the same frame, or the very
        // gap this is here to avoid opens up again (one frame of an undimmed
        // room). `target.click()` dispatches a discrete event, which React
        // flushes synchronously, so the incoming overlay is in the DOM by the
        // time it returns.
        const modalsBefore = new Set(Array.from(document.querySelectorAll(`.${ModalMedia}`)));
        const outgoing = hideOutgoingViewer();
        target.click();

        // Both viewers are mounted right now. Give the incoming one a frame
        // to settle before tearing the outgoing one down.
        await nextPaint();

        // Clicking a target is a *request* to open it, which its own handler
        // is free to decline — a spoilered gif or tweet image refuses until
        // it has been revealed. Closing the outgoing viewer regardless would
        // leave no viewer at all, which is what reads as the viewer abruptly
        // closing itself for no reason. If nothing new mounted, put the
        // outgoing one back and stay where we are.
        const openedIncoming = Array.from(document.querySelectorAll(`.${ModalMedia}`)).some(
          (modal) => !modalsBefore.has(modal)
        );
        if (!openedIncoming) {
          outgoing.restore();
          return;
        }

        // Unconditional, even if a newer navigation cancelled this one: the
        // outgoing viewer is hidden but still mounted and still flagged open
        // in its own component's state, so skipping this would strand it
        // invisible and permanently "open" behind everything else.
        close();

        // `close` is the owning component's own state setter, so it cannot
        // close a viewer that something else already re-rendered out from
        // under it. If the outgoing overlay is somehow still in the DOM,
        // put it back on screen rather than leaving it stranded as an
        // invisible but live overlay swallowing clicks.
        await nextPaint();
        if (!outgoing.unmounted()) outgoing.restore();
      } finally {
        releaseKeyShield();
        // Only the navigation that still owns the run clears the mark — a
        // call that was cancelled part way through must not pull it out from
        // under the newer one that superseded it and re-set it.
        if (current === state) {
          navRoot?.removeAttribute(GALLERY_NAV_ATTR);
          current = undefined;
        }
      }
    },
    [mediaKey, close]
  );

  return {
    navKeyFor,
    onPrev: inGallery ? () => navigate(-1) : undefined,
    onNext: inGallery ? () => navigate(1) : undefined,
  };
};
