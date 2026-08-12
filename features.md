# New Features

Everything added on top of upstream Cinny since `6bccd5a` (release v4.12.6).

## Rich link previews

- **Twitter/X preview cards** — pasted tweet links expand into a rich card (author, text, image), instead of a bare link.
  - _Control:_ click the card's image to open it in the media viewer, same as any other image.
- **Pixiv preview cards** — pasted pixiv.net artwork links expand into a rich card (title, description, artwork image), instead of a bare link. Metadata is fetched via Phixiv rather than pixiv.net directly, since pixiv only exposes a clean embeddable image for logged-in/R-18-unlocked scrapers.
  - _Control:_ click the card's image to open it in the media viewer, same as any other image.
  - _Control:_ download from the media viewer saves the full original file — the artwork's own `{id}_p0.png`/`.jpg`, under that name — rather than the 1200px copy the card displays. Pixiv's image host serves originals only to requests carrying a pixiv.net `Referer` and sends no CORS headers, neither of which a browser can supply, so this goes through pixiv.re (keyed on the artwork id, byte-identical output). It is the one action that fetches from outside your homeserver; if it is unavailable the download falls back to the displayed copy and logs a warning.
- **Instagram preview cards** — post, reel, and Instagram TV links are rewritten through UUInstagram for rich caption, image, and direct-video metadata.
  - _Control:_ video posts play directly in Cinny's native media player; spoilered media stays blurred until revealed.
- **TikTok preview cards** — TikTok video and share links are rewritten through tnktok for rich caption, thumbnail, and direct-video metadata.
  - _Control:_ videos play directly in Cinny's native media player; spoilered media stays blurred until revealed.
- **Reddit preview cards** — Reddit post, share, and redd.it links are rewritten through vxReddit (with Rxddit and Reddit fallbacks) for rich title, description, image, and direct-video metadata.
  - _Control:_ videos play directly in Cinny's native media player; spoilered media stays blurred until revealed.
- **YouTube embeds** — YouTube links expand into an inline, playable embed.
  - _Control:_ click the embed to play it in place; no extra tab needed.
- **GIF embeds** — GIF links (e.g. Tenor/Giphy) expand into an inline, animated preview.
  - _Control:_ click opens the full media viewer; middle-click (or ctrl/cmd-click) opens it directly in the browser instead.
- **Spoiler support for embeds** — YouTube and GIF embeds can be marked as spoilers, same as image attachments, blurring them until clicked.
  - _Control:_ a **"Spoiler"** chip sits over the blurred embed — click it to reveal.
- Pointer cursor on hover over image attachments and embeds, signaling they're clickable (no separate control, just a visual affordance).

## Media viewer overhaul

- Viewer now sizes itself to the media's own dimensions instead of a fixed box.
- **Zoom & pan**:
  - _Control:_ scroll wheel zooms in/out, centered on the cursor position (not the image center); scales at a constant perceptual rate regardless of current zoom level.
  - _Control:_ click-and-drag pans the image once zoomed in — clamped so it can never be dragged fully out of view.
  - _Control:_ toolbar buttons — **"1:1"** resets zoom to actual size, and the maximize/expand icon fits the image to the viewer.
- **Prev/next navigation** between media items in a room without closing and reopening the viewer.
  - _Control:_ the ‹ / › arrow buttons on the left/right edge of the viewer, or the **←/→** (or **A/D**) keys.
- **"Open in New Tab"** (external-link icon in the toolbar) now opens the actual media URL in the system browser instead of an in-app blob reference. For encrypted or auth-required media, where no such external link can ever work, the button is hidden instead of offering a broken one.
- Watching a video no longer resets/restarts playback every time someone else sends a new message in the room — no control change, just no longer interrupts you.

## Presence

- **Presence indicators** in the chat/DM list and the member list, showing online / idle / offline status per user.
  - _Control:_ hover the colored dot for a tooltip with the exact status (Online / Idle-Busy / Offline) and any custom status message.
- A user's custom status message is shown directly on their profile card (open a user's profile to see it — no extra click needed).
- Fixed presence showing as blank/missing for users who were already offline before the client started tracking them — it's now fetched directly instead of only waiting on a live update that may never arrive. No control change, just fixes indicators that used to silently not appear.

## Composer

- **GIF picker** (powered by [KLIPY](https://klipy.com)) — a Discord-style GIF search with no categories; you type, it searches. Picking a GIF sends its direct `.gif` URL, which renders inline via the existing GIF embed (no re-upload) and respects an active reply/thread. In encrypted rooms it embeds only when **"Url Preview in Encrypted Room"** is enabled; otherwise it appears as a plain link.
  - _Setup:_ requires a personal, free Klipy API key entered in **Settings → General → GIF Search** (from [partner.klipy.com/api-keys](https://partner.klipy.com/api-keys)). The key is stored only on your device (localStorage) and is never bundled with the app — no shared key ships. Until a key is set, the GIF entry points appear greyed out with a tooltip.
  - _Control:_ opens as a third tab (**Sticker · Emoji · GIF**) inside the emoji/sticker picker, and via a dedicated **GIF** button in the chat box to the right of the emoji icon.
  - _Control:_ the picker closes only after you send a GIF or click outside it.
- **Favorite GIFs** — star any GIF to save it; opening the picker shows your favorites by default (there is deliberately no trending/discovery feed — an empty search box shows only your own saves).
  - _Control:_ the star button on each GIF tile toggles it (gold = saved). Favorites sync across all your devices via Matrix account data (chunked so it scales past a few hundred; note account data is not end-to-end encrypted, so the homeserver can read your saved GIF URLs).
- **Randomize filenames on upload**, toggleable per-session rather than buried in Settings.
  - _Control:_ the eye icon in the chat box, next to the "Aa" formatting toggle — filled eye means filenames will be randomized before sending; toggle it off to keep original filenames.
- **Replying with a sticker or an image/file attachment** now correctly references the message being replied to.
  - _Control:_ unchanged — click **Reply** on a message, then pick a sticker or send an attachment instead of typing; it now correctly quotes the original message like a text reply would.

## Timeline decluttering

- **Collapsed repeated events**: a run of consecutive same-kind events (e.g. several deleted messages, or someone changing their avatar a few times in a row) renders as a single line ending in a `(xN)` count instead of N separate lines. Automatic — no control to toggle it.

## DM list categories

- **Custom categories for Direct Messages** — group DMs into user-defined categories instead of a single flat "Chats" list. With no categories created, the list stays exactly as before; creating one splits the list into your categories plus a built-in "Uncategorized" bucket for everything else.
  - _Control:_ the **⋮** menu at the top of the DM list, or on a category header, has **"New Category"**.
  - _Control:_ a category header's **⋮** menu offers **Rename** and **Delete** (deleting moves its chats back to Uncategorized rather than removing them from your DMs).
  - _Control:_ a DM's right-click/context menu has **"Move to Category"**, opening a picker of all your categories (plus Uncategorized) to assign it to.
  - _Control:_ click a category header to collapse/expand it, same as the existing "Chats" header behavior.
  - Categories and assignments are stored per-account in local storage (device-local, not synced across your devices).

## Emoji/sticker packs

- **Manual reordering of global (favorited) sticker/emoji packs** — drag-and-drop, or per-row up/down buttons, to set your own display order instead of being stuck with creation order.
  - _Control:_ grab the six-dot handle on a pack row and drag it, or use the ▲/▼ buttons next to it.
  - The order is written straight to account data as you move a pack (no separate "Apply" step), and syncs across your devices.
- Fixed space (and room) sticker/emoji packs appearing in a different order on every login — pack order is now sorted by creation time instead of relying on sync's unspecified state-event ordering.

## Fixes

- File-drop overlay no longer stays stuck active after dragging a file out of the drop zone.
- GIF picker button in the chat box now renders as a small bordered "GIF" badge (filling solid when active) instead of plain text, matching the visual weight of the other toolbar icons.
