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

export const FoundingClient: Block = {
  slug: 'foundingClient',
  labels: { singular: 'Founding Client banner', plural: 'Founding Client banners' },
  interfaceName: 'FoundingClientBlock',
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Founding Client Pricing', admin: { description: 'Small uppercase label above the headline.' } },
    { name: 'headline', type: 'text', required: true, defaultValue: 'First 5 clients save up to $1,000.' },
    { name: 'description', type: 'textarea', defaultValue: 'A temporary discount for our founding cohort. Trades a lower price for a Google review, written testimonial, and case-study permission.' },
    {
      name: 'spotsTotal',
      type: 'number',
      defaultValue: 5,
      admin: { description: 'Total founding spots available in this cohort.' },
    },
    {
      name: 'spotsRemaining',
      type: 'number',
      defaultValue: 5,
      admin: { description: 'Remaining spots. Update this manually as clients sign up — drives the visible counter.' },
    },
    {
      name: 'offers',
      type: 'array',
      minRows: 1,
      maxRows: 4,
      admin: { description: 'Discounted offers available to founding clients.' },
      fields: [
        { name: 'name', type: 'text', required: true, admin: { description: 'e.g. "Starter Site"' } },
        { name: 'priceFounding', type: 'text', required: true, admin: { description: 'e.g. "$1,495"' } },
        { name: 'priceRetail', type: 'text', admin: { description: 'e.g. "$1,950". Optional — leave blank when the founding price has no meaningful retail anchor (e.g. ongoing Care plan whose value lives in the savings line).' } },
        { name: 'savings', type: 'text', admin: { description: 'e.g. "Save $455"' } },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Claim a founding spot' },
        { name: 'href', type: 'text', defaultValue: '/contact' },
      ],
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
        { name: 'name', type: 'text', required: true, admin: { description: 'e.g. "Site + Care" or "Site + Care + SEO Sprint"' } },
        { name: 'tagline', type: 'text', admin: { description: 'One-line description of who this bundle is for.' } },
        { name: 'price', type: 'text', required: true, admin: { description: 'Bundled price, e.g. "$1,950 + $99/mo"' } },
        { name: 'savings', type: 'text', admin: { description: 'e.g. "Save $50/mo vs buying separately"' } },
        { name: 'includes', type: 'array', fields: [
          { name: 'label', type: 'text', required: true },
        ] },
        { name: 'cta', type: 'group', fields: [
          { name: 'label', type: 'text', defaultValue: 'Start this bundle' },
          { name: 'href', type: 'text', defaultValue: '/contact' },
        ] },
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
      { name: 'price', type: 'text', required: true, admin: { description: 'Current price. e.g. "$1,495" or "From $1,500/mo"' } },
      { name: 'originalPrice', type: 'text', admin: { description: 'Optional original price for discount display. Renders strikethrough next to the current price (e.g. set to "$1,950" alongside "$1,495").' } },
      { name: 'priceNote', type: 'text', admin: { description: 'Small line under price, e.g. "one-time" or "14-day delivery"' } },
      { name: 'description', type: 'textarea' },
      { name: 'features', type: 'array', fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'included', type: 'checkbox', defaultValue: true },
      ] },
      { name: 'cta', type: 'group', fields: [
        { name: 'label', type: 'text' },
        { name: 'href', type: 'text' },
      ] },
      { name: 'highlighted', type: 'checkbox', defaultValue: false, admin: { description: 'Visually emphasize this tier' } },
      // Tags an "Enterprise"/"Custom" tier so it renders with a brass corner
      // badge and an inset tinted band around the card. Used to make the
      // standalone Custom Build block visually distinct from the regular
      // 3-tier grid above it on /services.
      { name: 'enterpriseBadge', type: 'checkbox', defaultValue: false, admin: { description: 'Renders a brass "Enterprise" corner badge + inset tinted band so this card visually stands apart from regular tier rows.' } },
    ] },
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
      { name: 'value', type: 'text', required: true, admin: { description: 'e.g. "140%" or "0.9s" or "12M+"' } },
      { name: 'label', type: 'text', required: true },
      { name: 'description', type: 'text' },
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
      defaultValue: 'https://calendly.com/blackhartconsulting/30min',
      admin: {
        description: 'Your full Calendly event URL (e.g. https://calendly.com/blackhartconsulting/30min). Update once in your account, paste here.',
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

export const allBlocks = [
  Hero,
  FoundingClient,
  BundleOffer,
  CalendlyBooking,
  Services,
  Pricing,
  FeaturedProjects,
  Testimonials,
  Stats,
  CTA,
  LeadMagnet,
  RichTextBlock,
  MediaBlock,
  Faq,
  ContactFormBlock,
]
