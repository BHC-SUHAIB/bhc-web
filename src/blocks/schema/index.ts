import type { Block } from 'payload'

const richTextEditor = { editor: undefined } as const

export const Hero: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heros' },
  interfaceName: 'HeroBlock',
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'Small label above the headline' } },
    { name: 'headline', type: 'text', required: true },
    { name: 'subheadline', type: 'textarea' },
    { name: 'align', type: 'select', defaultValue: 'left', options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
    ] },
    { name: 'ctas', type: 'array', maxRows: 3, fields: [
      { name: 'label', type: 'text', required: true },
      { name: 'href', type: 'text', required: true },
      { name: 'variant', type: 'select', defaultValue: 'primary', options: [
        { label: 'Primary (filled)', value: 'primary' },
        { label: 'Secondary (outlined)', value: 'secondary' },
        { label: 'Ghost (text only)', value: 'ghost' },
      ] },
    ] },
    { name: 'image', type: 'upload', relationTo: 'media' as const, admin: { description: 'Optional hero image (uploaded file).' } },
    {
      name: 'backgroundImageUrl',
      type: 'text',
      admin: {
        description: 'Optional external background image URL (e.g. an Unsplash photo). When set, renders as a full-bleed background behind the headline. Use this for landing pages where you want stock imagery without uploading. Takes precedence over the image upload above.',
      },
    },
    {
      name: 'overlayStrength',
      type: 'select',
      defaultValue: 'heavy',
      admin: {
        description: 'Darkening overlay applied to the background image so headline text stays readable.',
        condition: (_, s: { backgroundImageUrl?: string; image?: unknown }) => !!(s.backgroundImageUrl || s.image),
      },
      options: [
        { label: 'Light (subtle dim)', value: 'light' },
        { label: 'Medium (balanced)', value: 'medium' },
        { label: 'Heavy (recommended for photo heroes)', value: 'heavy' },
        { label: 'Very heavy (busy / bright photos)', value: 'extra-heavy' },
      ],
    },
    {
      name: 'showPhoneCta',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Show "Or call: <site phone>" line directly under the hero CTAs. Pulls the number from SiteSettings.contactPhone so it stays in sync with the footer.',
      },
    },
  ],
}

export const BundleOffer: Block = {
  slug: 'bundleOffer',
  labels: { singular: 'Bundle offer', plural: 'Bundle offers' },
  interfaceName: 'BundleOfferBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true, defaultValue: 'Save by bundling.' },
    { name: 'description', type: 'textarea' },
    {
      name: 'layoutVariant',
      type: 'select',
      defaultValue: 'receipt',
      admin: { description: 'How the bundles render: itemized receipt (default), the legacy configurator rows, pricing-style tier cards, or wide stacked banners.' },
      options: [
        { label: 'Itemized receipt', value: 'receipt' },
        { label: 'Configurator rows + summary band', value: 'configurator' },
        { label: 'Tier cards', value: 'cards' },
        { label: 'Stacked feature banners', value: 'banners' },
      ],
    },
    {
      name: 'backgroundImageUrl',
      type: 'text',
      admin: { description: 'Optional faint background image URL. Renders behind the bundle cards at low opacity.' },
    },
    {
      name: 'bundles',
      type: 'array',
      minRows: 1,
      maxRows: 3,
      admin: { description: 'Bundles combine a website build with ongoing care or SEO at a discount vs buying separately.' },
      fields: [
        { name: 'name', type: 'text', required: true, admin: { description: 'e.g. "Open for Business"' } },
        { name: 'tagline', type: 'text', admin: { description: 'One-line description of who this bundle is for.' } },
        { name: 'price', type: 'text', required: true, admin: { description: 'One-time bundle price, e.g. "$999"' } },
        { name: 'monthly', type: 'text', admin: { description: 'Ongoing monthly line rendered next to the price, e.g. "+ $149 a month".' } },
        { name: 'savings', type: 'text', admin: { description: 'Optional line comparing the bundle to buying separately.' } },
        { name: 'note', type: 'text', admin: { description: 'Muted comparison line, e.g. "Sold separately: $1,193 plus $208 a month."' } },
        { name: 'includes', type: 'array', fields: [
          { name: 'label', type: 'text', required: true },
        ] },
        { name: 'cta', type: 'group', fields: [
          { name: 'label', type: 'text', defaultValue: 'Start this bundle' },
          { name: 'href', type: 'text', defaultValue: '/contact' },
        ] },
        { name: 'checkoutHref', type: 'text', admin: { description: 'Stripe Payment Link. When set, the button becomes "Buy now" and links here; the CTA above is the fallback.' } },
        { name: 'highlighted', type: 'checkbox', defaultValue: false, admin: { description: 'Visually emphasize this bundle as the recommended option.' } },
      ],
    },
  ],
}

export const Services: Block = {
  slug: 'services',
  labels: { singular: 'Services', plural: 'Services' },
  interfaceName: 'ServicesBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'items', type: 'array', minRows: 1, fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'textarea' },
      { name: 'icon', type: 'select', options: [
        { label: 'Globe (web)', value: 'globe' },
        { label: 'Search (SEO)', value: 'search' },
        { label: 'Smartphone (apps)', value: 'smartphone' },
        { label: 'Server (hosting)', value: 'server' },
        { label: 'Sparkles (design)', value: 'sparkles' },
        { label: 'Zap (performance)', value: 'zap' },
        { label: 'Shield (security)', value: 'shield' },
        { label: 'Code (dev)', value: 'code' },
        { label: 'Lightbulb (strategy)', value: 'lightbulb' },
      ] },
      { name: 'bullets', type: 'array', fields: [{ name: 'label', type: 'text' }] },
      // Optional download link rendered as a "Download the one-pager" button
      // beneath the bullets. Wires to /downloads/<slug> for the branded PDFs
      // generated by src/lib/pdfs/builder.ts.
      {
        name: 'downloadHref',
        type: 'text',
        admin: {
          description: 'Optional download link (e.g. "/downloads/service-website") shown as a "Download the one-pager" button under the bullets. Click fires `pdf_download` to dataLayer.',
        },
      },
      { name: 'downloadLabel', type: 'text', admin: { description: 'Optional override for the download button label. Defaults to "Download the one-pager".' } },
    ] },
  ],
}

// Lead-magnet block — a brass-bordered card that pitches the downloadable
// checklist (or any other PDF resource). Click on the primary button fires
// `pdf_download` to dataLayer for GA4 attribution, and the underlying route
// (`/downloads/<slug>`) sends the correct Content-Disposition so the browser
// always downloads instead of inline-rendering. Use this for low-friction
// CTAs on conversion pages — captures emails by way of "downloaded the
// checklist" being a soft commit.
export const LeadMagnet: Block = {
  slug: 'leadMagnet',
  labels: { singular: 'Lead Magnet', plural: 'Lead Magnets' },
  interfaceName: 'LeadMagnetBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'downloadHref', type: 'text', required: true, admin: { description: 'e.g. "/downloads/website-checklist".' } },
    { name: 'downloadLabel', type: 'text', defaultValue: 'Download the free checklist', admin: { description: 'Primary button label.' } },
    { name: 'fineprint', type: 'text', admin: { description: 'Optional small line under the button (e.g. "PDF · 2 pages · no email required").' } },
  ],
}

export const Pricing: Block = {
  slug: 'pricing',
  labels: { singular: 'Pricing', plural: 'Pricing' },
  interfaceName: 'PricingBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'layoutVariant',
      type: 'select',
      defaultValue: 'grid',
      admin: {
        description: 'Default grid for 2-5 tiers. "Centered single" renders one tier as a wider, page-centered card — use this on landing pages with a single offer.',
      },
      options: [
        { label: 'Grid (default)', value: 'grid' },
        { label: 'Centered single (LP single-offer)', value: 'centered-single' },
      ],
    },
    { name: 'tiers', type: 'array', minRows: 1, maxRows: 8, fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'price', type: 'text', required: true, admin: { description: 'Current price. e.g. "$699" or "$149/mo"' } },
      // Retained for backward compatibility with older content exports. No
      // longer rendered anywhere; the content script clears every value.
      { name: 'originalPrice', type: 'text', admin: { hidden: true } },
      { name: 'priceNote', type: 'text', admin: { description: 'Small line under price, e.g. "one-time" or "14-day delivery"' } },
      { name: 'subscribePrice', type: 'text', admin: { description: 'Optional subscription alternative, e.g. "$119/mo". Renders "or $119/mo" under the price plus a Subscribe button.' } },
      { name: 'subscribeNote', type: 'text', admin: { description: 'Small line under the subscribe price, e.g. "12 months, then it is yours".' } },
      { name: 'description', type: 'textarea' },
      { name: 'features', type: 'array', fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'included', type: 'checkbox', defaultValue: true },
      ] },
      { name: 'cta', type: 'group', fields: [
        { name: 'label', type: 'text' },
        { name: 'href', type: 'text' },
      ] },
      { name: 'checkoutHref', type: 'text', admin: { description: 'Stripe Payment Link for the buy path. When set, the primary button becomes "Buy now" and links here. Leave blank to fall back to the CTA above.' } },
      { name: 'subscribeHref', type: 'text', admin: { description: 'Stripe Payment Link for the subscribe path. Falls back to the CTA href when blank.' } },
      { name: 'badge', type: 'text', admin: { description: 'Small pill top-right of the card, e.g. "Most popular", "New".' } },
      { name: 'footnote', type: 'text', admin: { description: 'Muted line below the feature list, e.g. "Overage $0.35 per minute".' } },
      { name: 'highlighted', type: 'checkbox', defaultValue: false, admin: { description: 'Visually emphasize this tier' } },
      // Tags an "Enterprise"/"Custom" tier so it renders with a brass corner
      // badge and an inset tinted band around the card. Used to make the
      // standalone Custom Build block visually distinct from the regular
      // 3-tier grid above it on /services.
      { name: 'enterpriseBadge', type: 'checkbox', defaultValue: false, admin: { description: 'Renders a brass "Enterprise" corner badge + inset tinted band so this card visually stands apart from regular tier rows.' } },
    ] },
    {
      name: 'anchorId',
      type: 'text',
      admin: {
        description: 'Optional HTML id for in-page anchor links. Set "offer" so a hero CTA pointing at "#offer" scrolls here. Leave blank for no anchor.',
      },
    },
  ],
}

export const FeaturedProjects: Block = {
  slug: 'featuredProjects',
  labels: { singular: 'Featured projects', plural: 'Featured projects' },
  interfaceName: 'FeaturedProjectsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'mode', type: 'select', defaultValue: 'latest', options: [
      { label: 'Auto (latest featured)', value: 'latest' },
      { label: 'Manual selection', value: 'manual' },
    ] },
    { name: 'limit', type: 'number', defaultValue: 3, min: 1, max: 12, admin: { condition: (_, s: { mode?: string }) => s.mode === 'latest' } },
    { name: 'projects', type: 'relationship', relationTo: 'projects' as const, hasMany: true, admin: { condition: (_, s: { mode?: string }) => s.mode === 'manual' } },
    { name: 'viewAllLabel', type: 'text', defaultValue: 'View all projects' },
    { name: 'viewAllHref', type: 'text', defaultValue: '/portfolio' },
    {
      name: 'linked',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Wrap each project in a link to its case study. Uncheck on landing pages where you want to show proof without giving visitors a way to navigate away.' },
    },
    {
      name: 'compact',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Compact layout — show only the screenshot + project name, centered. Use on landing pages to display proof without competing with the conversion path.' },
    },
  ],
}

export const Testimonials: Block = {
  slug: 'testimonials',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  interfaceName: 'TestimonialsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text' },
    { name: 'mode', type: 'select', defaultValue: 'latest', options: [
      { label: 'Auto (latest featured)', value: 'latest' },
      { label: 'Manual selection', value: 'manual' },
    ] },
    { name: 'limit', type: 'number', defaultValue: 3, min: 1, max: 12, admin: { condition: (_, s: { mode?: string }) => s.mode === 'latest', description: 'How many featured testimonials to show.' } },
    { name: 'testimonials', type: 'relationship', relationTo: 'testimonials' as const, hasMany: true, admin: { condition: (_, s: { mode?: string }) => s.mode === 'manual', description: 'Pick specific testimonials in the order they should appear.' } },
  ],
}

export const Stats: Block = {
  slug: 'stats',
  labels: { singular: 'Stats', plural: 'Stats' },
  interfaceName: 'StatsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text' },
    {
      name: 'backgroundImageUrl',
      type: 'text',
      admin: { description: 'Optional very-faint background image URL (e.g. an Unsplash photo). Renders behind the stats at low opacity for visual texture without hurting readability.' },
    },
    { name: 'items', type: 'array', minRows: 1, maxRows: 6, fields: [
      { name: 'value', type: 'text', required: true, admin: { description: 'e.g. "140%" or "0.9s" or "12M+". A leading number counts up when scrolled into view.' } },
      { name: 'label', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'icon', type: 'select', defaultValue: 'auto', options: [
        { label: 'Automatic (homepage promises get clock / gauge / wrench)', value: 'auto' },
        { label: 'None', value: 'none' },
        { label: 'Clock', value: 'clock' },
        { label: 'Gauge', value: 'gauge' },
        { label: 'Wrench', value: 'wrench' },
        { label: 'Shield', value: 'shield' },
        { label: 'Eye', value: 'eye' },
        { label: 'Trend line', value: 'trend' },
        { label: 'Search', value: 'search' },
        { label: 'Phone', value: 'phone' },
      ], admin: { description: 'Brass line icon above the value. It draws itself in on scroll.' } },
    ] },
  ],
}

export const CTA: Block = {
  slug: 'cta',
  labels: { singular: 'Call to action', plural: 'Calls to action' },
  interfaceName: 'CTABlock',
  fields: [
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'primaryCta', type: 'group', fields: [
      { name: 'label', type: 'text', required: true },
      { name: 'href', type: 'text', required: true },
    ] },
    { name: 'secondaryCta', type: 'group', fields: [
      { name: 'label', type: 'text' },
      { name: 'href', type: 'text' },
    ] },
    { name: 'variant', type: 'select', defaultValue: 'default', options: [
      { label: 'Default', value: 'default' },
      { label: 'Emphasized (brass accent)', value: 'emphasized' },
    ] },
    {
      name: 'backgroundImageUrl',
      type: 'text',
      admin: { description: 'Optional faint background image URL. Renders behind the CTA at low opacity for visual interest.' },
    },
  ],
}

export const RichTextBlock: Block = {
  slug: 'richText',
  labels: { singular: 'Rich text', plural: 'Rich text' },
  interfaceName: 'RichTextBlock',
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'Optional small uppercase label above the content (e.g. "Our mission", "Who you’ll work with").' } },
    { name: 'content', type: 'richText' },
    { name: 'maxWidth', type: 'select', defaultValue: 'prose', options: [
      { label: 'Narrow (prose — 68ch)', value: 'prose' },
      { label: 'Medium (2xl — 42rem)', value: 'medium' },
      { label: 'Wide (full)', value: 'wide' },
    ] },
    { name: 'image', type: 'upload', relationTo: 'media' as const, admin: { description: 'Optional portrait/illustration. Renders as a circular avatar above the text.' } },
    {
      name: 'imageUrl',
      type: 'text',
      admin: { description: 'Optional external image URL (e.g. CDN-hosted headshot). FALLBACK only — used when no upload is attached above. The upload field always wins if both are set.' },
    },
    { name: 'imageFocus', type: 'select', defaultValue: 'face', admin: { condition: (_, s: { image?: unknown; imageUrl?: string }) => !!(s.image || s.imageUrl), description: 'Where to anchor the crop inside the circle.' }, options: [
      { label: 'Face (top of subject)', value: 'face' },
      { label: 'Center', value: 'center' },
    ] },
    { name: 'variant', type: 'select', defaultValue: 'default', options: [
      { label: 'Default (plain prose)', value: 'default' },
      { label: 'Lede (oversized intro statement)', value: 'lede' },
      { label: 'Card (bordered surface card)', value: 'card' },
    ] },
    { name: 'anchorId', type: 'text', admin: { description: 'Optional HTML id for in-page anchor links (e.g. "demo" so "#demo" scrolls here).' } },
  ],
}

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  labels: { singular: 'Media', plural: 'Media' },
  interfaceName: 'MediaBlockBlock',
  fields: [
    { name: 'media', type: 'upload', relationTo: 'media' as const, required: true },
    { name: 'caption', type: 'text' },
    { name: 'fullBleed', type: 'checkbox', defaultValue: false },
  ],
}

export const ContactFormBlock: Block = {
  slug: 'contactForm',
  labels: { singular: 'Contact form', plural: 'Contact forms' },
  interfaceName: 'ContactFormBlockBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true, defaultValue: 'Tell us about your project.' },
    { name: 'description', type: 'textarea' },
    { name: 'successMessage', type: 'textarea', defaultValue: 'Thanks \u2014 we\u2019ll reply within one business day.' },
    { name: 'showCompanyField', type: 'checkbox', defaultValue: true },
    { name: 'showProjectTypeField', type: 'checkbox', defaultValue: true },
    { name: 'showBudgetField', type: 'checkbox', defaultValue: true },
    { name: 'noCallNeeded', type: 'checkbox', defaultValue: false, admin: { description: 'Show the "No call needed" reassurance line above the form.' } },
    { name: 'submitLabel', type: 'text', defaultValue: 'Send inquiry' },
  ],
}

export const Faq: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  interfaceName: 'FaqBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text' },
    {
      name: 'mode',
      type: 'select',
      defaultValue: 'auto',
      options: [
        { label: 'Auto (latest featured from FAQs collection)', value: 'auto' },
        { label: 'Manual (use the items below)', value: 'manual' },
      ],
      admin: {
        description: 'Auto pulls FAQs from the FAQs collection (filtered by `featured: true`, sorted by sortOrder). Manual lets you override per page using the items below.',
      },
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        condition: (_, s: { mode?: string }) => (s.mode ?? 'auto') === 'auto',
        description: 'Optional. Auto mode shows FAQs from this category only; leave blank to show all featured FAQs.',
      },
      options: [
        { label: 'All categories', value: '' },
        { label: 'Pricing & packages', value: 'pricing' },
        { label: 'Process & timeline', value: 'process' },
        { label: 'Ownership & technical', value: 'ownership' },
        { label: 'Care, support, and after launch', value: 'care' },
      ],
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 12,
      min: 1,
      max: 50,
      admin: {
        condition: (_, s: { mode?: string }) => (s.mode ?? 'auto') === 'auto',
        description: 'Cap how many FAQs to surface in auto mode.',
      },
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
      admin: {
        condition: (_, s: { mode?: string }) => (s.mode ?? 'auto') === 'manual',
        description: 'Used only when mode is "Manual" — overrides the FAQs collection for this block.',
      },
    },
  ],
}

export const CalendlyBooking: Block = {
  slug: 'calendlyBooking',
  labels: { singular: 'Calendly booking', plural: 'Calendly bookings' },
  interfaceName: 'CalendlyBookingBlock',
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Book a call' },
    { name: 'headline', type: 'text', required: true, defaultValue: 'Pick a time that works for you.' },
    { name: 'description', type: 'textarea', defaultValue: 'A 30-minute intro call. We talk about what you need, what it costs, and whether we are a fit. No hard sell — book directly below or send us a note.' },
    {
      name: 'calendlyUrl',
      type: 'text',
      required: true,
      defaultValue: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call',
      admin: {
        description: 'Your full Calendly event URL (e.g. https://calendly.com/suhaib-blackhartconsulting/discovery-call). Update once in your account, paste here.',
      },
    },
    {
      name: 'displayMode',
      type: 'select',
      defaultValue: 'inline',
      admin: { description: 'Inline embeds the booking widget directly. Button opens Calendly in a popup overlay on click.' },
      options: [
        { label: 'Inline widget (full booking on the page)', value: 'inline' },
        { label: 'Popup button (opens Calendly overlay on click)', value: 'popup' },
      ],
    },
    {
      name: 'popupButtonLabel',
      type: 'text',
      defaultValue: 'Book a 30-min call',
      admin: { condition: (_, s: { displayMode?: string }) => s.displayMode === 'popup' },
    },
    {
      name: 'inlineHeight',
      type: 'number',
      defaultValue: 720,
      admin: {
        description: 'Inline widget height in pixels. 720 fits the default Calendly UI; raise if your event has many fields.',
        condition: (_, s: { displayMode?: string }) => s.displayMode === 'inline',
      },
    },
    {
      name: 'showEmailFallback',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Show a secondary "Email us instead" button next to the Calendly CTA, for visitors who would rather email than book a call. Useful on pages without a contact form.' },
    },
    {
      name: 'emailLabel',
      type: 'text',
      defaultValue: 'Email us instead',
      admin: { condition: (_, s: { showEmailFallback?: boolean }) => !!s.showEmailFallback },
    },
    {
      name: 'backgroundImageUrl',
      type: 'text',
      admin: { description: 'Optional faint background image URL.' },
    },
  ],
}

// ── Express landing-page blocks ────────────────────────────────────────────
// These power the editable "Express Website" landing page. Each section that
// used to be hardcoded in code is now a real, composable block so the whole LP
// is editable in the admin like any other page. The render components reuse the
// exact CSS classes the original mockup shipped with (see app/components.css),
// so making them CMS-driven does not change the look.

export const HeroPhoto: Block = {
  slug: 'heroPhoto',
  labels: { singular: 'Hero — full-bleed photo', plural: 'Heros — full-bleed photo' },
  interfaceName: 'HeroPhotoBlock',
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'Small kicker above the headline, e.g. "Houston Heights · 14-Day Delivery".' } },
    { name: 'headline', type: 'text', required: true, admin: { description: 'Main H1 (plain text).' } },
    { name: 'subheadline', type: 'textarea', admin: { description: 'Supporting lede paragraph under the headline.' } },
    { name: 'backgroundImageUrl', type: 'text', admin: { description: 'Full-bleed background photo URL (e.g. an Unsplash link). A fixed darkening overlay keeps text readable.' } },
    {
      name: 'ctas', type: 'array', maxRows: 2,
      admin: { description: 'Up to two buttons. Point hrefs at on-page anchors like "#audit" or "#offer".' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true, admin: { description: 'e.g. "#audit", "#offer", "/contact".' } },
        { name: 'style', type: 'select', defaultValue: 'brass', options: [
          { label: 'Brass (primary)', value: 'brass' },
          { label: 'Outline on photo', value: 'onphoto' },
        ] },
      ],
    },
    {
      name: 'trustItems', type: 'array', maxRows: 4,
      admin: { description: 'Small trust row under the buttons (icon + short label).' },
      fields: [
        { name: 'icon', type: 'select', defaultValue: 'check', options: [
          { label: 'Shield', value: 'shield' },
          { label: 'Check', value: 'check' },
          { label: 'Lightning (zap)', value: 'zap' },
        ] },
        { name: 'label', type: 'text', required: true },
      ],
    },
  ],
}

export const GuaranteeStrip: Block = {
  slug: 'guaranteeStrip',
  labels: { singular: 'Guarantee strip', plural: 'Guarantee strips' },
  interfaceName: 'GuaranteeStripBlock',
  fields: [
    {
      name: 'items', type: 'array', minRows: 1, maxRows: 6,
      admin: { description: 'Big value + small caption, shown as one horizontal strip.' },
      fields: [
        { name: 'value', type: 'text', required: true, admin: { description: 'e.g. "14 days", "$999", "<200KB", "1 dev".' } },
        { name: 'label', type: 'text', required: true, admin: { description: 'Caption under the value.' } },
      ],
    },
  ],
}

export const SiteAuditToolBlock: Block = {
  slug: 'siteAuditTool',
  labels: { singular: 'Site audit tool', plural: 'Site audit tools' },
  interfaceName: 'SiteAuditToolBlock',
  admin: { group: 'Content' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Free · no email required' },
    { name: 'headline', type: 'text', required: true, defaultValue: "See exactly what's holding your current site back." },
    { name: 'description', type: 'textarea', admin: { description: 'Short copy under the headline. The interactive PageSpeed widget renders below it. This section always gets the id "audit" for "#audit" links.' } },
  ],
}

export const ProcessSteps: Block = {
  slug: 'processSteps',
  labels: { singular: 'Process steps', plural: 'Process steps' },
  interfaceName: 'ProcessStepsBlock',
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'How it works' },
    { name: 'headline', type: 'text' },
    {
      name: 'steps', type: 'array', minRows: 1, maxRows: 8,
      fields: [
        { name: 'number', type: 'text', admin: { description: 'e.g. "01". Leave blank to auto-number by position.' } },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
}

export const AnimatedStats: Block = {
  slug: 'animatedStats',
  labels: { singular: 'Animated stats', plural: 'Animated stats' },
  interfaceName: 'AnimatedStatsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text' },
    {
      name: 'items', type: 'array', minRows: 1, maxRows: 6,
      admin: { description: 'Each number counts up when scrolled into view.' },
      fields: [
        { name: 'value', type: 'number', required: true, admin: { description: 'Number to count up to, e.g. 14, 0.9, 140, 0.' } },
        { name: 'decimals', type: 'number', defaultValue: 0, admin: { description: 'Decimal places to show (e.g. 1 → "0.9").' } },
        { name: 'prefix', type: 'text', admin: { description: 'Text before the number, e.g. "$".' } },
        { name: 'suffix', type: 'text', admin: { description: 'Text after the number, e.g. " days", "s", "%".' } },
        { name: 'label', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'note', type: 'text', admin: { description: 'Optional small tag rendered after the description, e.g. "sample".' } },
      ],
    },
  ],
}

export const MobileCtaBlock: Block = {
  slug: 'mobileCta',
  labels: { singular: 'Sticky mobile CTA bar', plural: 'Sticky mobile CTA bars' },
  interfaceName: 'MobileCtaBlock',
  fields: [
    { name: 'primaryLabel', type: 'text', required: true, defaultValue: 'Run free audit' },
    { name: 'primaryHref', type: 'text', required: true, defaultValue: '#audit' },
    { name: 'phone', type: 'text', admin: { description: 'Optional tap-to-call number for the mobile bar. Defaults to the landing-page phone if left blank.' } },
  ],
}

export const BundleConfigurator: Block = {
  slug: 'bundleConfigurator',
  labels: { singular: 'Bundle configurator + lead form', plural: 'Bundle configurators' },
  interfaceName: 'BundleConfiguratorBlock',
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Build your package' },
    { name: 'headline', type: 'text', required: true, defaultValue: 'Bundle the build with what comes after.' },
    { name: 'description', type: 'textarea', admin: { description: 'Lede under the headline.' } },
    {
      name: 'options', type: 'array', minRows: 1, maxRows: 8,
      admin: { description: 'Selectable add-ons. The first is usually the required base (e.g. the Starter site).' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'cost', type: 'text', required: true, admin: { description: 'Display cost, e.g. "$999", "+$900", "$99/mo".' } },
        { name: 'once', type: 'number', admin: { description: 'One-time dollars added to the total (omit for monthly-only options).' } },
        { name: 'monthly', type: 'number', admin: { description: 'Monthly dollars added (e.g. 99).' } },
        { name: 'save', type: 'number', admin: { description: 'Dollars this option contributes to the "you save" line.' } },
        { name: 'required', type: 'checkbox', defaultValue: false, admin: { description: 'Always included, cannot be toggled off.' } },
        { name: 'defaultOn', type: 'checkbox', defaultValue: false, admin: { description: 'Pre-selected when the page loads.' } },
      ],
    },
    { name: 'formId', type: 'text', defaultValue: 'lp-start', admin: { description: 'HTML id used as the in-page anchor + scroll target for the lead form (e.g. "lp-start"). Hero/pricing CTAs pointing at "#lp-start" land here.' } },
    { name: 'formHeading', type: 'text', defaultValue: 'Tell us what you need.' },
    { name: 'formDescription', type: 'textarea' },
    { name: 'submitLabel', type: 'text', defaultValue: 'Send my request' },
    { name: 'successMessage', type: 'textarea', defaultValue: "Thanks — we've got your request. We'll reply within one business day." },
  ],
}

// ── Pricing-reset blocks (2026-08) ─────────────────────────────────────────
// Three-outcome cards, the callable phone demo, the written guarantees, and
// the free-demo-site request form. `steps` reuses ProcessSteps; `bundles`
// reuses the extended BundleOffer (see docs/pricing-reset/DECISIONS.md).

export const OutcomeCards: Block = {
  slug: 'outcomeCards',
  labels: { singular: 'Outcome cards', plural: 'Outcome cards' },
  interfaceName: 'OutcomeCardsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    {
      name: 'cards', type: 'array', minRows: 1, maxRows: 6,
      admin: { description: 'Three cards in a row (stack on mobile). Each pitches one outcome with a price line and an optional demo link.' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'blurb', type: 'textarea' },
        { name: 'imageUrl', type: 'text', admin: { description: 'Photo header for the card (full https URL, e.g. an Unsplash link). Leave blank to keep the built-in art for the standard three cards (open sign / brass phone / paperwork).' } },
        { name: 'icon', type: 'select', defaultValue: 'auto', options: [
          { label: 'Automatic (matched to the card title)', value: 'auto' },
          { label: 'None', value: 'none' },
          { label: 'Search', value: 'search' },
          { label: 'Phone', value: 'phone' },
          { label: 'Loop arrows', value: 'loop' },
          { label: 'Gauge', value: 'gauge' },
          { label: 'Shield', value: 'shield' },
          { label: 'Trend line', value: 'trend' },
        ], admin: { description: 'Brass icon chip on the photo. Animates on hover.' } },
        { name: 'priceLine', type: 'text', admin: { description: 'e.g. "Sites from $399. Local SEO + AI Search from $295 a month."' } },
        { name: 'href', type: 'text', admin: { description: 'Where the card CTA points, e.g. "/services#websites".' } },
        { name: 'ctaLabel', type: 'text', admin: { description: 'e.g. "See website pricing".' } },
        { name: 'demoHref', type: 'text', admin: { description: 'Optional proof link, e.g. a live client site or "tel:+18664349777".' } },
        { name: 'demoLabel', type: 'text', admin: { description: 'e.g. "See a live client site".' } },
      ],
    },
  ],
}

export const PhoneDemo: Block = {
  slug: 'phoneDemo',
  labels: { singular: 'Phone demo', plural: 'Phone demos' },
  interfaceName: 'PhoneDemoBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'phoneNumber', type: 'text', required: true, admin: { description: 'Display format, e.g. "(866) 434-9777". The tel: link is derived.' } },
    { name: 'phoneLabel', type: 'text', admin: { description: 'Small label above or beside the number, e.g. "Call now".' } },
    {
      name: 'bullets', type: 'array', maxRows: 5,
      admin: { description: 'Short "try asking it" prompts.' },
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    { name: 'cta', type: 'group', fields: [
      { name: 'label', type: 'text' },
      { name: 'href', type: 'text' },
    ] },
  ],
}

export const Guarantees: Block = {
  slug: 'guarantees',
  labels: { singular: 'Guarantees', plural: 'Guarantees' },
  interfaceName: 'GuaranteesBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    {
      name: 'items', type: 'array', minRows: 1, maxRows: 6,
      admin: { description: 'Three columns of title + body. Distinct from GuaranteeStrip (big value + caption).' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea' },
      ],
    },
  ],
}

export const DemoRequestForm: Block = {
  slug: 'demoRequestForm',
  labels: { singular: 'Demo request form', plural: 'Demo request forms' },
  interfaceName: 'DemoRequestFormBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true, defaultValue: 'Get your free demo site.' },
    { name: 'description', type: 'textarea' },
    { name: 'submitLabel', type: 'text', defaultValue: 'Send me my demo' },
    { name: 'fineprint', type: 'text', defaultValue: 'No call. No obligation. Reply within one business day.' },
    { name: 'successMessage', type: 'textarea', defaultValue: 'Request received. Your demo link lands in your inbox within 48 hours.' },
  ],
}

// The Claude Design brand animations (2026-08) as a placeable block: add one
// anywhere in a page layout, pick the variant, done. Pages that have none get
// the code-side default placement (RenderBlocks injects on ai-front-desk,
// services, free-demo-site, automation), so adding a block here OVERRIDES the
// default position for that page.
export const BrandAnimation: Block = {
  slug: 'brandAnimation',
  labels: { singular: 'Brand animation', plural: 'Brand animations' },
  interfaceName: 'BrandAnimationBlock',
  fields: [
    { name: 'variant', type: 'select', required: true, defaultValue: 'callFlow', options: [
      { label: 'AI Front Desk call flow (switchboard + live transcript)', value: 'callFlow' },
      { label: '7-day build timeline', value: 'buildTimeline' },
      { label: 'Website assembles itself', value: 'websiteAssembly' },
      { label: 'Process loop (runs while you work)', value: 'processLoop' },
    ], admin: { description: 'All variants sit on the dark ink band, ship zero JavaScript, and honor reduced-motion automatically.' } },
    { name: 'playOnArrival', type: 'checkbox', defaultValue: true, admin: { description: 'Hold the animation at its first frame until the visitor scrolls to it, so the story plays from the beginning. Turn off for ambient variants with no beginning (the process loop).' } },
  ],
}

export const allBlocks = [
  Hero,
  BrandAnimation,
  HeroPhoto,
  BundleOffer,
  BundleConfigurator,
  CalendlyBooking,
  Services,
  OutcomeCards,
  Pricing,
  PhoneDemo,
  Guarantees,
  DemoRequestForm,
  FeaturedProjects,
  Testimonials,
  Stats,
  AnimatedStats,
  GuaranteeStrip,
  ProcessSteps,
  SiteAuditToolBlock,
  MobileCtaBlock,
  CTA,
  LeadMagnet,
  RichTextBlock,
  MediaBlock,
  Faq,
  ContactFormBlock,
]
