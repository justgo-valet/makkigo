# Design

## Source of truth
Active, 2026-10-16. Scope: merchant ticket editor and valet vehicle lists. References: original screens `21. 업체 관리자 - 티켓 추가.png` and `22. 업체 관리자 - 티켓 추가.png`, Figma nodes `188:584` and `288:464`, `docs/design/screens.md`, existing `TicketEditor` and shared `TicketRenderer`.

## Brand
Quiet, practical mobile utility. Retain Makkigo branding and existing header. Avoid additional panels or decorative labels.

## Product goals
Compose a ticket directly on its preview; keep free positioning, resizing, image uploads and saving. Match the reference's four silhouettes. Success: text editing never requires a separate field; preview and saved customer ticket share the same geometry.

## Personas and jobs
Merchant administrators create and revise the ticket shown to their customers, primarily on phones.

## Information architecture
`/tickets/new` and `/tickets/[ticketId]`: header, ticket management title, optional merchant selector, ticket canvas, contextual selection controls, four round tools or inline shape selector, bottom save action.

## Design principles
The ticket is the primary workspace. Keep text entry in place. Separate text selection from movement using a drag handle. Retain immutable legacy designs.

## Visual language
Surface #F7F9FC; primary #2170D6; text #03090F; secondary #717171; white #FFFFFF. Existing application typeface; 24px page title and 18px save label. Center a 300px-wide ticket: three portrait shapes use 5:7, the top/bottom-notched landscape shape uses 7:5. Four round outlined tools (66px, shrinking on narrow phones), a compact 80px shape strip, and a full-width 56px save button follow the source images. Use small shadows only to define the ticket edge.

## Components
Reuse AppHeader and TicketRenderer. InlineTicketText owns caret, plain-text paste and composition input. The editor exposes four new shapes; shared schema and renderer retain old presets for issued versions.

## Accessibility
Named tool buttons, visible keyboard focus, multiline textbox semantics, keyboard movement, labelled resize handles and font-size control, radio semantics for shapes, status and error announcements. Preserve native text selection and IME.

## Responsive behavior
Maintain a 300px maximum ticket width and shrink within narrow phones. Allow vertical scrolling when text selection controls or the keyboard consume space. Keep tools and save in normal document flow.

## Interaction states
New text is selected and focused on the canvas. Image upload and saving report busy state. Empty or over-limit text is validated before saving. Shape changes preserve content and do not save automatically. Upload failures retain the current composition.

## Content voice
Short Korean action labels: 글자 추가, 이미지 추가, 티켓 모양 선택, 티켓 저장. Keep implementation terms out of visible copy.

## Implementation constraints
React/Next.js, existing Tailwind tokens and shared schema. No new dependencies. Preserve legacy presets and normalized layer coordinates. Verify live text/caret, Korean composition, paste, drag/resize, save payload, and responsive geometry in a local browser, plus existing automated checks.

## Vehicle lists
Maintain the existing three-column image/plate lists for both active and completed vehicles. Follow `VehicleManagement`, `PickupResponseSheet` and application tokens: existing font, #F7F9FC surface, #2170D6 primary, #81A9DA secondary, #717171 muted text and 6px corner radii. Keep the header, notification banner, session order and confirmation flows unchanged.

Use equal-width cells, 8px column gaps and 12px row gaps. Fit car images within each cell without negative margins or overlap; align plates and status labels consistently. Requests use a light #FF7777 background and red border; preparation uses a light primary background and secondary border. Retain explicit time/status text and grayscale arrival/completed images. Keep completed vehicles quieter and separate the section with the existing blue rule. Preserve visible keyboard focus and plate-based button names. Do not add cards, action footers, counters or a different list layout.

Verify with existing tests, lint and typecheck. Browser checks should cover 320px and wider phone widths and all session states.

## Open questions
None for this scope.
