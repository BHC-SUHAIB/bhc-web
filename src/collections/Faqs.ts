import type { CollectionConfig } from 'payload'
import { revalidateContent } from '../lib/cms-revalidate'

// Centralized FAQ collection — every FAQ block on the site (homepage, /about,
// /services, /contact, all /lp/* landing pages) reads from this collection
// when set to mode='auto'. Single source of truth: edit a question once and
// it propagates everywhere on the next cache refresh (60s TTL).
//
// Admin model:
//   - `featured` filters which FAQs render in auto-mode blocks
//   - `category` lets you build category-specific FAQ blocks later if needed
//   - `sortOrder` controls display order (lower = higher up). Ties fall back
//     to most recently updated.
export const Faqs: CollectionConfig = {
  slug: 'faqs',
  access: { read: () => true },
  admin: {
    group: 'Library',
    useAsTitle: 'question',
    defaultColumns: ['question', 'category', 'featured', 'sortOrder', 'updatedAt'],
    description: 'Centralized Q&A. FAQ blocks set to "Auto (latest featured)" pull from here, so an edit propagates to every page that renders a FAQ block.',
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        revalidateContent({ tag: 'faqs' })
        return doc
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        revalidateContent({ tag: 'faqs' })
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      required: true,
      admin: { description: 'The question as shown in the public FAQ accordion.' },
    },
    {
      name: 'answer',
      type: 'textarea',
      required: true,
      maxLength: 800,
      admin: {
        description: 'Up to 800 characters. Press Enter twice between paragraphs.',
        rows: 6,
      },
    },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'pricing',
      options: [
        { label: 'Pricing & packages', value: 'pricing' },
        { label: 'Process & timeline', value: 'process' },
        { label: 'Ownership & technical', value: 'ownership' },
        { label: 'Care, support, and after launch', value: 'care' },
      ],
      admin: { description: 'Category groups FAQs visually + lets you build category-specific blocks later.' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Include this FAQ in any block set to "Auto (latest featured)".',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first. Ties fall back to most recently updated.',
      },
    },
  ],
}
