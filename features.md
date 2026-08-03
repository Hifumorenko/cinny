# New Features

Everything added on top of upstream Cinny since `6bccd5a` (release v4.12.6).

## Rich link previews

- **Twitter/X preview cards** — pasted tweet links expand into a rich card (author, text, image), instead of a bare link.
  - *Control:* click the card's image to open it in the media viewer, same as any other image.
- **Pixiv preview cards** — pasted pixiv.net artwork links expand into a rich card (title, description, artwork image), instead of a bare link. Metadata is fetched via Phixiv rather than pixiv.net directly, since pixiv only exposes a clean embeddable image for logged-in/R-18-unlocked scrapers.
  - *Control:* click the card's image to open it in the media viewer, same as any other image.
- **YouTube embeds** — YouTube links expand into an inline, playable embed.
  - *Control:* click the embed to play it in place; no extra tab needed.
- **GIF embeds** — GIF links (e.g. Tenor/Giphy) expand into an inline, animated preview.
  - *Control:* click opens the full media viewer; middle-click (or ctrl/cmd-click) opens it directly in the browser instead.
- **Spoiler support for embeds** — YouTube and GIF embeds can be marked as spoilers, same as image attachments, blurring them until clicked.
  - *Control:* a **"Spoiler"** chip sits over the blurred embed — click it to reveal.
- Pointer cursor on hover over image attachments and embeds, signaling they're clickable (no separate control, just a visual affordance).

## Media viewer overhaul

- Viewer now sizes itself to the media's own dimensions instead of a fixed box.
- **Zoom & pan**:
  - *Control:* scroll wheel zooms in/out, centered on the cursor position (not the image center); scales at a constant perceptual rate regardless of current zoom level.
  - *Control:* click-and-drag pans the image once zoomed in — clamped so it can never be dragged fully out of view.
  - *Control:* toolbar buttons — **"1:1"** resets zoom to actual size, and the maximize/expand icon fits the image to the viewer.
- **Prev/next navigation** between media items in a room without closing and reopening the viewer.
  - *Control:* the ‹ / › arrow buttons on the left/right edge of the viewer, or the **←/→** (or **A/D**) keys.
- **"Open in New Tab"** (external-link icon in the toolbar) now opens the actual media URL in the system browser instead of an in-app blob reference. For encrypted or auth-required media, where no such external link can ever work, the button is hidden instead of offering a broken one.
- Watching a video no longer resets/restarts playback every time someone else sends a new message in the room — no control change, just no longer interrupts you.

## Presence

- **Presence indicators** in the chat/DM list and the member list, showing online / idle / offline status per user.
  - *Control:* hover the colored dot for a tooltip with the exact status (Online / Idle-Busy / Offline) and any custom status message.
- A user's custom status message is shown directly on their profile card (open a user's profile to see it — no extra click needed).
- Fixed presence showing as blank/missing for users who were already offline before the client started tracking them — it's now fetched directly instead of only waiting on a live update that may never arrive. No control change, just fixes indicators that used to silently not appear.

## Composer

- **Randomize filenames on upload**, toggleable per-session rather than buried in Settings.
  - *Control:* the eye icon in the chat box, next to the "Aa" formatting toggle — filled eye means filenames will be randomized before sending; toggle it off to keep original filenames.
- **Replying with a sticker or an image/file attachment** now correctly references the message being replied to.
  - *Control:* unchanged — click **Reply** on a message, then pick a sticker or send an attachment instead of typing; it now correctly quotes the original message like a text reply would.

## Timeline decluttering

- **Collapsed repeated events**: a run of consecutive same-kind events (e.g. several deleted messages, or someone changing their avatar a few times in a row) renders as a single line ending in a `(xN)` count instead of N separate lines. Automatic — no control to toggle it.

## Fixes

- File-drop overlay no longer stays stuck active after dragging a file out of the drop zone.
