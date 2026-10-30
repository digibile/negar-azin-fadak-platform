/**
 * The product's public identity, in one place.
 *
 * The name is the company's own wording. Nothing here is a configurable value at runtime: the brand is not
 * a tenant setting, and a screen that reads the name from configuration is a screen that can render
 * somebody else's name.
 */
export const brand = {
  /** Full product name, used in the public header, the document title and the footer. */
  productName: 'پلتفرم بیزینس نگار آذین فدک',
  /** The management surface, used where the shell names itself. */
  managementName: 'مرکز مدیریت نگار آذین فدک',
  /** The company behind the platform. */
  companyName: 'شرکت نگار آذین فدک',
  /** One line describing what the platform is. */
  tagline: 'سامانه یکپارچه مدیریت کسب‌وکار بر پایه هویت مرکزی',
  /** Latin transliteration, for the document title and the OpenAPI-facing screens. */
  latinName: 'Negar Azin Fadak',
} as const;
