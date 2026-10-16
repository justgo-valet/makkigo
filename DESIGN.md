# Design

## Source of truth
Active, 2026-10-16. Scope: merchant ticket editor. References: original screens `21. 업체 관리자 - 티켓 추가.png` and `22. 업체 관리자 - 티켓 추가.png`, Figma nodes `188:584` and `288:464`, `docs/design/screens.md`, existing `TicketEditor` and shared `TicketRenderer`.

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

## Open questions
None for this scope.
