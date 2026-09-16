import { BuilderTemplate } from '../templates';

const INK = '#111111';
const MID = '#6b6b6b';
const BORDER = '#e5e3df';
const OFF = '#f4f2ee';

export const archiste: BuilderTemplate = {
  id: 'archiste',
  name: 'Archiste',
  description: 'Editorial one-page portfolio for an architecture or interior design studio — services, process, and material philosophy.',
  category: 'Portfolio',
  type: 'both',
  step_type: 'sales_page',
  is_premium: true,
  // A real screenshot of this template's own rendered hero (public/web-templates/archiste/).
  thumbnail: '/web-templates/archiste/thumbnail.jpg',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white text-[#111111]' },
      nodes: ['navbar', 'hero', 'studio', 'services', 'process', 'materiality', 'footer'],
    },

    navbar: {
      type: { resolvedName: 'Navbar' },
      props: {
        logo: '',
        brandName: 'archiste',
        links: [
          { label: 'Studio', href: '#studio' },
          { label: 'Services', href: '#services' },
          { label: 'Process', href: '#process' },
          { label: 'Materiality', href: '#materiality' },
        ],
        backgroundColor: INK,
        textColor: '#ffffff',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: 'Get In Touch',
        buttonBg: '#ffffff',
        buttonTextColor: INK,
        fullWidth: false,
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
        linkHoverColor: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
        layoutType: 'side',
        navigationSource: 'none',
        mobileOverlayColor: INK,
        hamburgerColor: '#ffffff',
      },
      parent: 'ROOT',
    },

    hero: {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: INK, paddingTop: 0, paddingBottom: 0, paddingTop_mobile: 0, paddingBottom_mobile: 0, id: 'hero' },
      nodes: ['hero-media'],
      parent: 'ROOT',
    },
    'hero-media': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // layoutType 'fluid' is required, not cosmetic — Container.craft.props defaults to
      // layoutType:'fixed'/maxWidth:'1200px' (a centered content column), which this node
      // would otherwise silently inherit, squeezing this full-bleed hero image down to
      // ~1200px with visible side margins instead of spanning the real viewport width. Every
      // absolutely-positioned child below (inset-0/left-*/right-*) resolves against THIS
      // node's box, so the same fix has to be repeated on each of them individually — a
      // parent going fluid does not make an already-fixed child fluid too.
      //
      // KNOWN EDITOR-ONLY LIMITATION (investigated, accepted — same class of trade-off as
      // Viewport.tsx's Desktop/Tablet/Mobile fake-narrow-preview limitation): in the live
      // BUILDER CANVAS specifically (enabled=true), this hero's background image and giant
      // "archiste" wordmark will NOT position correctly — RenderNode.tsx wraps every single
      // canvas node in its own `<div class="relative group">`, which becomes a NEW CSS
      // positioning context between every parent/child pair. Each absolutely-positioned child
      // below (hero-bg-img/hero-word/etc.) ends up positioned relative to its own thin
      // RenderNode wrapper instead of this node's box, collapsing the overlay. RenderNode skips
      // that wrapper entirely when `!isEnabled`, so the REAL PUBLISHED PAGE (what visitors see)
      // renders this exactly right — live-verified via both a real ~390px viewport and full
      // desktop width. Not fixable at the template-authoring level; a real fix would mean
      // reworking RenderNode's per-node wrapping strategy, which is a shared, cross-template
      // architectural change, not something to attempt for one template's hero section.
      props: { className: 'relative w-full h-[92vh] min-h-[620px] overflow-hidden', layoutType: 'fluid' },
      nodes: ['hero-bg-img', 'hero-scrim', 'hero-word', 'hero-tagline', 'hero-social', 'hero-card'],
      parent: 'hero',
    },
    'hero-bg-img': {
      type: { resolvedName: 'UserImage' },
      props: { src: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1800&auto=format&fit=crop', alt: 'Architectural interior with concrete curves', objectFit: 'cover', width: '100%', height: '100%', borderRadius: 0, boxShadow: 'none', className: 'absolute inset-0' },
      parent: 'hero-media',
    },
    'hero-scrim': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // backgroundColor as a structured prop, not a `bg-black/15` Tailwind opacity-modifier
      // class — that class never made it into the compiled CSS here (computed
      // background-color came back fully transparent, live-verified), while every other
      // template in this codebase already uses rgba()/structured backgroundColor for
      // translucent fills rather than Tailwind's `/NN` opacity syntax. layoutType 'fluid' for
      // the same reason as hero-media — this needs to span hero-media's full width, not a
      // centered 1200px column within it.
      props: { className: 'absolute inset-0', backgroundColor: 'rgba(0,0,0,0.18)', layoutType: 'fluid', padding: 0 },
      nodes: [],
      parent: 'hero-media',
    },
    'hero-word': {
      type: { resolvedName: 'Heading' },
      // fontSize/fontSize_mobile/fontSize_tablet as real props rather than a `text-[13vw]`
      // className — Heading.tsx only omits its own default size class (text-5xl/6xl for h1)
      // when the `fontSize` PROP is set; a className-only override left that default class
      // present alongside this one, competing for the same CSS property with no guaranteed
      // winner. Structured fontSize also means this responds correctly to the editor's
      // Desktop/Tablet/Mobile preview toggle (useResponsiveValue reads viewMode directly),
      // unlike a vw-based class which can't respond to that toggle at all.
      // fontSize_mobile/_tablet sized to the real 8-character wordmark width at this specific
      // font weight, not guessed — the first pass (88/140) still clipped against hero-media's
      // overflow-hidden at a real 390px viewport (live-verified: only "arcl" was visible).
      props: { text: 'archiste', level: 'h1', fontWeight: 'black', color: '#ffffff', fontSize: 190, fontSize_tablet: 100, fontSize_mobile: 58, className: 'absolute left-4 md:left-10 top-[30%] md:top-1/2 -translate-y-1/2 leading-none tracking-tight select-none pointer-events-none' },
      parent: 'hero-media',
    },
    'hero-tagline': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'We design spaces where form, structure, and material exist in balance.', fontSize: 20, fontWeight: 'normal', color: '#ffffff', className: 'absolute left-4 md:left-10 bottom-40 md:bottom-32 max-w-xs md:max-w-sm leading-snug' },
      parent: 'hero-media',
    },
    'hero-social': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // NOT layoutType:'fluid' — unlike hero-media/hero-scrim this node is meant to be
      // content-sized, not full-bleed. 'fluid' sets Container's own inline `maxWidth:'100%'`
      // (see Container.tsx), which silently beats any max-w-* className the same way the
      // default 'fixed' maxWidth:'1200px' would if it were smaller — live-verified this broke
      // hero-card below when applied there for no real reason; default layoutType (implicit
      // 'fixed', maxWidth 1200px) was already fine here since 1200px never constrains
      // content this small anyway.
      props: { className: 'absolute left-4 md:left-10 bottom-8 flex gap-3', display: 'flex', alignItems: 'center' },
      nodes: ['hero-social-1', 'hero-social-2', 'hero-social-3'],
      parent: 'hero-media',
    },
    'hero-social-1': {
      type: { resolvedName: 'Icon' },
      // 'Twitter' does not exist in the installed lucide-react version (live-verified: falls
      // back to the HelpCircle "?" glyph) — lucide dropped brand icons; 'X' is the closest
      // still-shipped equivalent for the Twitter/X slot.
      props: { name: 'X', size: 16, color: '#ffffff', strokeWidth: 1.75, alignment: 'center', className: 'w-10 h-10 rounded-full bg-white/10 border border-white/25' },
      parent: 'hero-social',
    },
    'hero-social-2': {
      type: { resolvedName: 'Icon' },
      props: { name: 'Mail', size: 16, color: '#ffffff', strokeWidth: 1.75, alignment: 'center', className: 'w-10 h-10 rounded-full bg-white/10 border border-white/25' },
      parent: 'hero-social',
    },
    'hero-social-3': {
      type: { resolvedName: 'Icon' },
      // 'Instagram' also does not exist in lucide-react (same brand-icon removal as 'Twitter'
      // above) — 'Camera' substituted as the closest generic equivalent.
      props: { name: 'Camera', size: 16, color: '#ffffff', strokeWidth: 1.75, alignment: 'center', className: 'w-10 h-10 rounded-full bg-white/10 border border-white/25' },
      parent: 'hero-social',
    },
    'hero-card': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // A `max-w-[300px]` className here can never win: Container.tsx always sets its OWN
      // inline `maxWidth` style (1200px default for layoutType 'fixed', 100% for 'fluid'),
      // and inline style beats any className regardless of which number is actually smaller —
      // so the real fix is Container's dedicated `maxWidth` PROP below (a real, supported
      // per-node override, not a workaround), not a Tailwind class. Also needed: without an
      // explicit cap, this flex row's own width is driven by hero-card-title's content —
      // Paragraph's wrapper div gets an unconditional `w-full` (of the flex row) with no wrap
      // constraint of its own, which live-verified stretched this card out to the sentence's
      // full unwrapped width (~480px) instead of staying compact. A real `maxWidth` forces the
      // browser to wrap the text within it rather than growing the box to fit.
      // backgroundColor as a real prop, not the `bg-white` className: Container.craft.props
      // defaults backgroundColor to 'transparent', which Craft merges in for ANY prop this
      // node doesn't explicitly set — Container.tsx's getResponsiveStyles() then turns that
      // default into a real `.node-hero-card { background-color: transparent }` rule in an
      // injected <style> tag, which wins over the `bg-white` Tailwind class by DOM source
      // order despite equal selector specificity (live-verified: computed background-color
      // came back fully transparent with `bg-white` in className alone). This is the same
      // "structured prop beats className" bug class validate-container-flex-props.js already
      // guards for display/flex props — just for backgroundColor, which that script doesn't
      // check yet.
      props: { className: 'absolute right-4 md:right-10 bottom-6 md:bottom-10 rounded-xl p-4 flex items-center gap-4 shadow-2xl', display: 'flex', alignItems: 'center', maxWidth: '300px', backgroundColor: '#ffffff' },
      nodes: ['hero-card-img', 'hero-card-text'],
      parent: 'hero-media',
    },
    'hero-card-img': {
      type: { resolvedName: 'UserImage' },
      props: { src: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop', alt: 'Studio team member', objectFit: 'cover', width: '64px', height: '64px', borderRadius: 8, boxShadow: 'none', className: 'shrink-0' },
      parent: 'hero-card',
    },
    'hero-card-text': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['hero-card-title', 'hero-card-cta'],
      parent: 'hero-card',
    },
    'hero-card-title': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'We design buildings people actually want to be in', fontSize: 14, fontWeight: 'bold', color: INK, className: 'leading-snug mb-2' },
      parent: 'hero-card-text',
    },
    'hero-card-cta': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex items-center gap-2', display: 'flex', alignItems: 'center' },
      nodes: ['hero-card-cta-label', 'hero-card-cta-icon'],
      parent: 'hero-card-text',
    },
    'hero-card-cta-label': {
      type: { resolvedName: 'Paragraph' },
      props: { text: "Let's Talk", fontSize: 13, fontWeight: 'bold', color: INK },
      parent: 'hero-card-cta',
    },
    'hero-card-cta-icon': {
      type: { resolvedName: 'Icon' },
      props: { name: 'ArrowUpRight', size: 12, color: INK, strokeWidth: 2, alignment: 'center', className: 'w-6 h-6 rounded-full border border-[#111111]' },
      parent: 'hero-card-cta',
    },

    studio: {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 56, paddingBottom_mobile: 56, id: 'studio' },
      nodes: ['studio-inner'],
      parent: 'ROOT',
    },
    'studio-inner': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'max-w-6xl mx-auto' },
      nodes: ['studio-header', 'studio-body'],
      parent: 'studio',
    },
    'studio-header': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '1/3-2/3', gap: 40, className: 'items-start mb-14' },
      nodes: ['studio-pill', 'studio-h'],
      parent: 'studio-inner',
    },
    'studio-pill': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // backgroundColor as a real prop, not the `bg-[#f4f2ee]` className — see the detailed
      // comment on hero-card's `backgroundColor` prop for why a Container's own bg-* className
      // alone silently loses to its craft.props default.
      props: { className: 'inline-flex items-center gap-2 rounded-full px-4 py-1.5 w-fit', display: 'inline-flex', alignItems: 'center', backgroundColor: OFF },
      nodes: ['studio-pill-text'],
      parent: 'studio-header',
    },
    'studio-pill-text': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '•  OUR STUDIO  •', fontSize: 11, fontWeight: 'bold', color: MID, className: 'uppercase tracking-widest' },
      parent: 'studio-pill',
    },
    'studio-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Architectural studio specializing in interiors', level: 'h2', fontWeight: 'black', color: INK, className: 'text-4xl md:text-5xl leading-[1.1]' },
      parent: 'studio-header',
    },
    'studio-body': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '1/3-2/3', gap: 56, className: 'items-start' },
      nodes: ['studio-img', 'studio-text'],
      parent: 'studio-inner',
    },
    'studio-img': {
      type: { resolvedName: 'UserImage' },
      props: { src: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop', alt: 'Architectural detail', objectFit: 'cover', width: '100%', height: '260px', borderRadius: 0, boxShadow: 'none' },
      parent: 'studio-body',
    },
    'studio-text': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['studio-p', 'studio-contact'],
      parent: 'studio-body',
    },
    'studio-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'We design spaces where restraint creates comfort, and precision defines atmosphere. Our work focuses on how spaces are experienced — through movement, light, texture, and silence.', fontSize: 17, color: MID, className: 'max-w-xl mb-8' },
      parent: 'studio-text',
    },
    'studio-contact': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-wrap items-center gap-8', display: 'flex', alignItems: 'center' },
      nodes: ['studio-contact-email', 'studio-contact-phone'],
      parent: 'studio-text',
    },
    'studio-contact-email': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex items-center gap-3', display: 'flex', alignItems: 'center' },
      nodes: ['studio-contact-email-icon', 'studio-contact-email-text'],
      parent: 'studio-contact',
    },
    'studio-contact-email-icon': {
      type: { resolvedName: 'Icon' },
      props: { name: 'Mail', size: 16, color: INK, strokeWidth: 1.75, alignment: 'center', className: 'w-10 h-10 rounded-full bg-[#f4f2ee]' },
      parent: 'studio-contact-email',
    },
    'studio-contact-email-text': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'hello@archiste.com', fontSize: 15, fontWeight: 'medium', color: INK },
      parent: 'studio-contact-email',
    },
    'studio-contact-phone': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex items-center gap-3', display: 'flex', alignItems: 'center' },
      nodes: ['studio-contact-phone-icon', 'studio-contact-phone-text'],
      parent: 'studio-contact',
    },
    'studio-contact-phone-icon': {
      type: { resolvedName: 'Icon' },
      props: { name: 'Phone', size: 16, color: INK, strokeWidth: 1.75, alignment: 'center', className: 'w-10 h-10 rounded-full bg-[#f4f2ee]' },
      parent: 'studio-contact-phone',
    },
    'studio-contact-phone-text': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '+1 800 552 0001', fontSize: 15, fontWeight: 'medium', color: INK },
      parent: 'studio-contact-phone',
    },

    services: {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 60, paddingBottom: 100, paddingTop_mobile: 40, paddingBottom_mobile: 56, id: 'services' },
      nodes: ['services-inner'],
      parent: 'ROOT',
    },
    'services-inner': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'max-w-6xl mx-auto' },
      nodes: ['services-header', 'services-top', 'services-list'],
      parent: 'services',
    },
    'services-header': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex items-center justify-between pb-6 border-b mb-14', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderStyle: 'solid' },
      nodes: ['services-pill', 'services-label'],
      parent: 'services-inner',
    },
    'services-pill': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // backgroundColor as a real prop, not the `bg-[#f4f2ee]` className — see the detailed
      // comment on hero-card's `backgroundColor` prop for why a Container's own bg-* className
      // alone silently loses to its craft.props default.
      props: { className: 'inline-flex items-center gap-2 rounded-full px-4 py-1.5 w-fit', display: 'inline-flex', alignItems: 'center', backgroundColor: OFF },
      nodes: ['services-pill-text'],
      parent: 'services-header',
    },
    'services-pill-text': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '•  SERVICES  •', fontSize: 11, fontWeight: 'bold', color: MID, className: 'uppercase tracking-widest' },
      parent: 'services-pill',
    },
    'services-label': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'ARCHITECTURE WITH PASSION', fontSize: 11, fontWeight: 'bold', color: MID, className: 'uppercase tracking-widest' },
      parent: 'services-header',
    },
    'services-top': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 40, className: 'items-end mb-16' },
      nodes: ['services-h', 'services-sub'],
      parent: 'services-inner',
    },
    'services-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Architectural Approach', level: 'h2', fontWeight: 'black', color: INK, className: 'text-4xl md:text-5xl' },
      parent: 'services-top',
    },
    'services-sub': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Every interior is conceived with clarity, material integrity, and deliberate proportion.', fontSize: 17, color: MID, textAlign: 'right', className: 'md:text-right' },
      parent: 'services-top',
    },
    'services-list': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['svc-row-1', 'svc-row-2', 'svc-row-3'],
      parent: 'services-inner',
    },
    'svc-row-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'py-10 border-b', borderColor: BORDER, borderWidth: 1, borderStyle: 'solid' },
      nodes: ['svc-row-1-cols'],
      parent: 'services-list',
    },
    'svc-row-1-cols': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '1/3-2/3', gap: 32 },
      nodes: ['svc-1-left', 'svc-1-desc'],
      parent: 'svc-row-1',
    },
    'svc-1-left': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['svc-1-num', 'svc-1-title', 'svc-1-sub'],
      parent: 'svc-row-1-cols',
    },
    'svc-1-num': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '[ 01 ]', fontSize: 13, color: MID, className: 'mb-3' },
      parent: 'svc-1-left',
    },
    'svc-1-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Interior Architecture', level: 'h3', fontWeight: 'black', color: INK, className: 'text-2xl md:text-3xl mb-2' },
      parent: 'svc-1-left',
    },
    'svc-1-sub': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Focused on structure and atmosphere.', fontSize: 14, color: MID },
      parent: 'svc-1-left',
    },
    'svc-1-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'We design cohesive interior environments where space, light, and material form a single architectural system.', fontSize: 15, color: MID, className: 'md:pt-1' },
      parent: 'svc-row-1-cols',
    },
    'svc-row-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'py-10 border-b', borderColor: BORDER, borderWidth: 1, borderStyle: 'solid' },
      nodes: ['svc-row-2-cols'],
      parent: 'services-list',
    },
    'svc-row-2-cols': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '1/3-2/3', gap: 32 },
      nodes: ['svc-2-left', 'svc-2-desc'],
      parent: 'svc-row-2',
    },
    'svc-2-left': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['svc-2-num', 'svc-2-title', 'svc-2-sub'],
      parent: 'svc-row-2-cols',
    },
    'svc-2-num': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '[ 02 ]', fontSize: 13, color: MID, className: 'mb-3' },
      parent: 'svc-2-left',
    },
    'svc-2-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Spatial Planning', level: 'h3', fontWeight: 'black', color: INK, className: 'text-2xl md:text-3xl mb-2' },
      parent: 'svc-2-left',
    },
    'svc-2-sub': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Clear and functional spatial layouts.', fontSize: 14, color: MID },
      parent: 'svc-2-left',
    },
    'svc-2-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Layouts are shaped by circulation, proportion, and everyday use to ensure clarity and comfort.', fontSize: 15, color: MID, className: 'md:pt-1' },
      parent: 'svc-row-2-cols',
    },
    'svc-row-3': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'py-10' },
      nodes: ['svc-row-3-cols'],
      parent: 'services-list',
    },
    'svc-row-3-cols': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '1/3-2/3', gap: 32 },
      nodes: ['svc-3-left', 'svc-3-desc'],
      parent: 'svc-row-3',
    },
    'svc-3-left': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['svc-3-num', 'svc-3-title', 'svc-3-sub'],
      parent: 'svc-row-3-cols',
    },
    'svc-3-num': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '[ 03 ]', fontSize: 13, color: MID, className: 'mb-3' },
      parent: 'svc-3-left',
    },
    'svc-3-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Concept Design', level: 'h3', fontWeight: 'black', color: INK, className: 'text-2xl md:text-3xl mb-2' },
      parent: 'svc-3-left',
    },
    'svc-3-sub': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Defining ideas for each project.', fontSize: 14, color: MID },
      parent: 'svc-3-left',
    },
    'svc-3-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Early concepts establish direction and guide all further architectural decisions.', fontSize: 15, color: MID, className: 'md:pt-1' },
      parent: 'svc-row-3-cols',
    },

    process: {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 56, paddingBottom_mobile: 56, id: 'process' },
      nodes: ['process-inner'],
      parent: 'ROOT',
    },
    'process-inner': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'max-w-6xl mx-auto' },
      nodes: ['process-cols'],
      parent: 'process',
    },
    'process-cols': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '1/3-2/3', gap: 48, className: 'items-start' },
      nodes: ['process-left', 'process-grid'],
      parent: 'process-inner',
    },
    'process-left': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['process-h', 'process-p'],
      parent: 'process-cols',
    },
    'process-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Our process', level: 'h2', fontWeight: 'black', color: INK, className: 'text-4xl md:text-5xl mb-6' },
      parent: 'process-left',
    },
    'process-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Every space begins with intention. We reduce complexity, refine decisions, and shape interiors that feel inevitable.', fontSize: 17, color: MID },
      parent: 'process-left',
    },
    'process-grid': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 24 },
      nodes: ['proc-1', 'proc-2', 'proc-3', 'proc-4'],
      parent: 'process-cols',
    },
    'proc-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // backgroundColor as a real prop — see the comment on hero-card's `backgroundColor` prop.
      props: { className: 'rounded p-8', backgroundColor: OFF },
      nodes: ['proc-1-icon', 'proc-1-title', 'proc-1-desc'],
      parent: 'process-grid',
    },
    'proc-1-icon': {
      type: { resolvedName: 'UserImage' },
      props: { src: '/web-templates/archiste/process-discovery.svg', alt: 'Discovery diagram', objectFit: 'contain', width: '72px', height: '72px', borderRadius: 0, boxShadow: 'none', className: 'mb-6' },
      parent: 'proc-1',
    },
    'proc-1-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Discovery', level: 'h4', fontWeight: 'black', color: INK, className: 'text-xl mb-4' },
      parent: 'proc-1',
    },
    'proc-1-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Understanding context and constraints sets the foundation.', fontSize: 14, color: MID },
      parent: 'proc-1',
    },
    'proc-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // backgroundColor as a real prop — see the comment on hero-card's `backgroundColor` prop.
      props: { className: 'rounded p-8', backgroundColor: OFF },
      nodes: ['proc-2-icon', 'proc-2-title', 'proc-2-desc'],
      parent: 'process-grid',
    },
    'proc-2-icon': {
      type: { resolvedName: 'UserImage' },
      props: { src: '/web-templates/archiste/process-concept.svg', alt: 'Concept diagram', objectFit: 'contain', width: '72px', height: '72px', borderRadius: 0, boxShadow: 'none', className: 'mb-6' },
      parent: 'proc-2',
    },
    'proc-2-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Concept', level: 'h4', fontWeight: 'black', color: INK, className: 'text-xl mb-4' },
      parent: 'proc-2',
    },
    'proc-2-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Proportion, flow, and atmosphere guide every decision.', fontSize: 14, color: MID },
      parent: 'proc-2',
    },
    'proc-3': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // backgroundColor as a real prop — see the comment on hero-card's `backgroundColor` prop.
      props: { className: 'rounded p-8', backgroundColor: OFF },
      nodes: ['proc-3-icon', 'proc-3-title', 'proc-3-desc'],
      parent: 'process-grid',
    },
    'proc-3-icon': {
      type: { resolvedName: 'UserImage' },
      props: { src: '/web-templates/archiste/process-refinement.svg', alt: 'Refinement diagram', objectFit: 'contain', width: '72px', height: '72px', borderRadius: 0, boxShadow: 'none', className: 'mb-6' },
      parent: 'proc-3',
    },
    'proc-3-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Refinement', level: 'h4', fontWeight: 'black', color: INK, className: 'text-xl mb-4' },
      parent: 'proc-3',
    },
    'proc-3-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Details, materials, and spatial interactions are carefully resolved.', fontSize: 14, color: MID },
      parent: 'proc-3',
    },
    'proc-4': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // backgroundColor as a real prop — see the comment on hero-card's `backgroundColor` prop.
      props: { className: 'rounded p-8', backgroundColor: OFF },
      nodes: ['proc-4-icon', 'proc-4-title', 'proc-4-desc'],
      parent: 'process-grid',
    },
    'proc-4-icon': {
      type: { resolvedName: 'UserImage' },
      props: { src: '/web-templates/archiste/process-execution.svg', alt: 'Execution diagram', objectFit: 'contain', width: '72px', height: '72px', borderRadius: 0, boxShadow: 'none', className: 'mb-6' },
      parent: 'proc-4',
    },
    'proc-4-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Execution', level: 'h4', fontWeight: 'black', color: INK, className: 'text-xl mb-4' },
      parent: 'proc-4',
    },
    'proc-4-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'The final space reflects thoughtfulness in every element.', fontSize: 14, color: MID },
      parent: 'proc-4',
    },

    materiality: {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 56, paddingBottom_mobile: 56, id: 'materiality' },
      nodes: ['materiality-inner'],
      parent: 'ROOT',
    },
    'materiality-inner': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'max-w-6xl mx-auto' },
      nodes: ['mat-header', 'mat-top', 'mat-block-1', 'mat-block-2'],
      parent: 'materiality',
    },
    'mat-header': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex items-center justify-between pb-6 border-b mb-14', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: BORDER, borderWidth: 1, borderStyle: 'solid' },
      nodes: ['mat-pill', 'mat-label'],
      parent: 'materiality-inner',
    },
    'mat-pill': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      // backgroundColor as a real prop, not the `bg-[#f4f2ee]` className — see the detailed
      // comment on hero-card's `backgroundColor` prop for why a Container's own bg-* className
      // alone silently loses to its craft.props default.
      props: { className: 'inline-flex items-center gap-2 rounded-full px-4 py-1.5 w-fit', display: 'inline-flex', alignItems: 'center', backgroundColor: OFF },
      nodes: ['mat-pill-text'],
      parent: 'mat-header',
    },
    'mat-pill-text': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '•  CRAFT & MATERIALITY  •', fontSize: 11, fontWeight: 'bold', color: MID, className: 'uppercase tracking-widest' },
      parent: 'mat-pill',
    },
    'mat-label': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'INDEPENDENT SELECTION', fontSize: 11, fontWeight: 'bold', color: MID, className: 'uppercase tracking-widest' },
      parent: 'mat-header',
    },
    'mat-top': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 40, className: 'items-end mb-16' },
      nodes: ['mat-h', 'mat-sub'],
      parent: 'materiality-inner',
    },
    'mat-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Why we are different', level: 'h2', fontWeight: 'black', color: INK, className: 'text-4xl md:text-5xl' },
      parent: 'mat-top',
    },
    'mat-sub': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Every material, every junction, every detail is carefully chosen to create interiors that feel deliberate, calm, and enduring.', fontSize: 17, color: MID, textAlign: 'right', className: 'md:text-right' },
      parent: 'mat-top',
    },
    'mat-block-1': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '1/3-2/3', gap: 48, className: 'items-center pb-16 mb-16 border-b', borderColor: BORDER, borderWidth: 1, borderStyle: 'solid' },
      nodes: ['mat-1-img', 'mat-1-text'],
      parent: 'materiality-inner',
    },
    'mat-1-img': {
      type: { resolvedName: 'UserImage' },
      props: { src: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?q=80&w=900&auto=format&fit=crop', alt: 'Wood furniture material detail', objectFit: 'cover', width: '100%', height: '320px', borderRadius: 0, boxShadow: 'none' },
      parent: 'mat-block-1',
    },
    'mat-1-text': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['mat-1-num', 'mat-1-title', 'mat-1-desc'],
      parent: 'mat-block-1',
    },
    'mat-1-num': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '[ 01 ]', fontSize: 13, color: MID, className: 'mb-3' },
      parent: 'mat-1-text',
    },
    'mat-1-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Selective Materiality', level: 'h3', fontWeight: 'black', color: INK, className: 'text-2xl md:text-3xl mb-4' },
      parent: 'mat-1-text',
    },
    'mat-1-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'We work with a limited palette of materials chosen for durability, texture, and how they age over time.', fontSize: 16, color: MID },
      parent: 'mat-1-text',
    },
    'mat-block-2': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '1/3-2/3', gap: 48, className: 'items-center' },
      nodes: ['mat-2-img', 'mat-2-text'],
      parent: 'materiality-inner',
    },
    'mat-2-img': {
      type: { resolvedName: 'UserImage' },
      props: { src: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=900&auto=format&fit=crop', alt: 'Curved interior architecture', objectFit: 'cover', width: '100%', height: '320px', borderRadius: 0, boxShadow: 'none' },
      parent: 'mat-block-2',
    },
    'mat-2-text': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: '' },
      nodes: ['mat-2-num', 'mat-2-title', 'mat-2-desc'],
      parent: 'mat-block-2',
    },
    'mat-2-num': {
      type: { resolvedName: 'Paragraph' },
      props: { text: '[ 02 ]', fontSize: 13, color: MID, className: 'mb-3' },
      parent: 'mat-2-text',
    },
    'mat-2-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Interior-Focused', level: 'h3', fontWeight: 'black', color: INK, className: 'text-2xl md:text-3xl mb-4' },
      parent: 'mat-2-text',
    },
    'mat-2-desc': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Our work is exclusively focused on interior environments — from private residences to hospitality spaces.', fontSize: 16, color: MID },
      parent: 'mat-2-text',
    },

    footer: {
      type: { resolvedName: 'Footer' },
      props: {
        logo: '',
        brandName: 'archiste',
        description: 'An architectural studio designing interiors where form, structure, and material exist in balance.',
        columns: [
          { title: 'Studio', links: [{ label: 'Our Studio', href: '#studio' }, { label: 'Services', href: '#services' }, { label: 'Process', href: '#process' }, { label: 'Materiality', href: '#materiality' }] },
          { title: 'Contact', links: [{ label: 'hello@archiste.com', href: 'mailto:hello@archiste.com' }, { label: '+1 800 552 0001', href: 'tel:+18005520001' }] },
        ],
        backgroundColor: INK,
        textColor: '#ffffff',
        accentColor: '#ffffff',
        padding: 60,
        fullWidth: false,
        columnsCount: 2,
        showSocial: true,
        socialLinks: [
          { platform: 'twitter', url: '#' },
          { platform: 'instagram', url: '#' },
        ],
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        titleFontSize: 12,
        linkFontSize: 14,
        titleFontWeight: '900',
        showNewsletter: false,
        newsletterTitle: '',
        newsletterDescription: '',
      },
      parent: 'ROOT',
    },
  }),
};
