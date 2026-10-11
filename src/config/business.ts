/**
 * Business Configuration for Sabena Sealers ("House of Packing")
 * Single source of truth for branding, categories, models, industries, and lead metadata.
 * Used by both Admin and Staff apps.
 */

import { LeadPriority, LeadSource, LeadStatus } from '../types';

export const BRAND = {
  name: 'Sabena Sealers',
  tagline: 'House of Packing',
  website: 'https://www.sabenapackaging.com',
  city: 'Chennai',
} as const;

/**
 * 18 Core Product Categories (Used as primary multi-select chips in intake forms)
 */
export const PRODUCT_CATEGORIES = [
  'Hand Sealers',
  'Foot Sealers',
  'Portable Sealers',
  'Band Sealers',
  'Foil and Induction Sealers',
  'L-Sealers',
  'Shrink Machines',
  'Strapping Machines',
  'Carton Sealers',
  'Vacuum Packing',
  'Cup Sealers',
  'Tray Sealers',
  'Batch Coders and Inkjet',
  'Filling Machines',
  'Labeling Machines',
  'Stretch Wrapping',
  'Packing Materials',
  'Other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * Searchable Sub-models / Machinery variants (Second level selection)
 */
export const PRODUCT_MODELS = [
  'Hand Sealer Impulse',
  'Hand Sealer Hot Bar',
  'Single Chamber Vacuum',
  'Double Chamber Vacuum',
  'Manual Cup Sealer',
  'Semi-Automatic Cup Sealer',
  'Shrink Tunnel',
  'Shrink Chamber',
  'Semi-Automatic Strapping Machine',
  'Pneumatic Strapping Machine',
  'Liquid Filling',
  'Paste Filling',
  'Granule Filler',
  'Powder Filler',
  'Flat Surface Labeling',
  'Round Surface Labeling',
  'Hand Held Ink Jet Printer',
] as const;

export type ProductModel = (typeof PRODUCT_MODELS)[number];

/**
 * Customer Target Industries
 */
export const INDUSTRIES = [
  'Food',
  'Pharmacy',
  'Cosmetics',
  'Beverages',
  'Other',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

/**
 * Lead Acquisition Sources
 */
export const LEAD_SOURCES: LeadSource[] = [
  'IndiaMART',
  'Walk-in',
  'Referral',
  'WhatsApp',
  'Website',
  'Phone Call',
  'Social Media',
];

/**
 * Lead Statuses (preserving exact existing values)
 */
export const STATUSES: LeadStatus[] = [
  'New Lead',
  'In Progress',
  'Won',
  'Lost',
];

/**
 * Lead Priorities (preserving exact existing values)
 */
export const PRIORITIES: LeadPriority[] = [
  'Low',
  'Medium',
  'High',
  'Urgent',
];

/**
 * CLIENT CONTACT CONSTANTS (TODO: Confirm final numbers and address with client)
 * Currently awaiting confirmation from Sabena Sealers management.
 */
export const CONTACT_CONFIG = {
  // TODO: Client to confirm primary sales hotline number
  PHONE: '+91 98400 00000',
  // TODO: Client to confirm customer support WhatsApp business number
  WHATSAPP: '+91 98400 00000',
  // TODO: Client to confirm primary inquiry email
  EMAIL: 'info@sabenapackaging.com',
  // TODO: Client to confirm registered factory/office address in Chennai
  ADDRESS: 'Chennai, Tamil Nadu, India',
} as const;

/**
 * WORKING HOURS (TODO: Confirm operating shift hours with client)
 */
export const WORKING_HOURS = {
  // TODO: Client to confirm weekday working hours
  WEEKDAYS: '9:30 AM - 6:30 PM (Mon - Sat)',
  // TODO: Client to confirm Sunday emergency demo / dispatch availability
  SUNDAY: 'Closed',
} as const;
