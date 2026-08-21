import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Cerium database schema.
 *
 * The entity model here follows `docs/phase-2-2a-schema-specification.md`
 * rather than being invented: that document already worked out which concepts
 * are real entities, which are relationships, and which must never be stored.
 * Where it marks something BLOCKED or REQUIRED-but-absent, the column does not
 * exist yet — a schema is the wrong place to express an intention.
 *
 * Three rules from that specification are load-bearing and are enforced here:
 *
 * 1. PROVENANCE IS NOT OPTIONAL. Every content record points at the Cerium
 *    document its copy came from. This is the property the whole site's
 *    integrity rests on, and it is `notNull` rather than a convention.
 *
 * 2. NO TECHNICAL FIELDS. There is no `cas_number`, `inci_name`, `grade` or
 *    `purity` column. §4.3 is explicit that technical values must arrive
 *    document-attributed rather than as bare nullable columns, because a bare
 *    column has nowhere to record which document says so, at which revision.
 *    Adding them before that attribution model exists would bake in the shape
 *    the specification rejects.
 *
 * 3. NO OFFER FIELDS. No price, stock, SKU or availability. §4.2 marks these
 *    BLOCKED — publishing B2B pricing is Cerium's commercial decision — and
 *    `lib/seo.ts` depends on their absence to keep structured data truthful.
 */

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * How much authority a piece of copy carries.
 *
 * From §14 of the specification. It exists now, before any AI writes anything,
 * because the distinction has to be recorded at write time — a status column
 * added later cannot retroactively tell you which rows a human actually
 * approved. `authoritative` means it came from a supplied Cerium document and
 * is attributed; everything seeded from the reviewed taxonomy is that.
 *
 * AI must never become the authority for chemical information: nothing in the
 * application may promote a row to `authoritative` automatically.
 */
export const contentStatus = pgEnum("content_status", [
  "authoritative",
  "human_approved",
  "ai_draft",
  "ai_suggestion",
]);

export const userRole = pgEnum("user_role", ["admin", "editor"]);

/* -------------------------------------------------------------------------- */
/* Provenance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The documents Cerium supplied.
 *
 * Was a frozen string union in `types/content.ts`. Promoted to a table per §8
 * so a document can carry a title and a revision: two price lists a quarter
 * apart are different documents, and as an enum they collapsed to one member.
 * `slug` keeps the old union values working during the migration.
 */
export const sourceDocuments = pgTable("source_documents", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  /** catalogue | pricelist | website | statement | supplier — free text today. */
  kind: text("kind"),
  /** e.g. "Q3 2026". Null where the document is not versioned. */
  revision: text("revision"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * An uploaded asset, stored in Cloudinary.
 *
 * The bytes live in Cloudinary and never touch this server's filesystem, which
 * is what makes the admin work on an ephemeral container — the previous
 * Studio wrote into `public/images/` and would have lost every upload on
 * redeploy.
 *
 * `alt` is deliberately NOT here. Alt text describes an image's purpose in a
 * particular place, and the same photograph can be informative on a product
 * page and decorative behind a headline. It belongs to the usage, so it sits
 * on the assignment.
 */
export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  cloudinaryId: text("cloudinary_id").notNull().unique(),
  originalFilename: text("original_filename"),
  format: text("format"),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  uploadedById: integer("uploaded_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Editorial image slots that belong to no catalogue record.
 *
 * Keyed by slot name ("hero", "companyIntro", "aboutPortrait") because a slot
 * is a designed position in a layout, not user-created content.
 */
export const siteMedia = pgTable("site_media", {
  slot: text("slot").primaryKey(),
  mediaId: integer("media_id").references(() => mediaAssets.id, {
    onDelete: "set null",
  }),
  /** Empty string is a real, deliberate value: the image is decorative. */
  alt: text("alt").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/* Taxonomy                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Product families and ranges — one self-referencing tree.
 *
 * §4.4: a product belongs to exactly one category, and containment is the
 * relationship. "Product family" is DERIVED by walking up `parentId` and is
 * never stored, because storing it would let the two disagree.
 */
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    summary: text("summary"),
    // `AnyPgColumn` is required for a self-reference: without it TypeScript
    // cannot infer the table's type while still defining it.
    parentId: integer("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    /** Explicit ordering — the catalogue's sequence is editorial, not alphabetical. */
    position: integer("position").notNull().default(0),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "restrict" }),
    status: contentStatus("status").notNull().default("authoritative"),
    mediaId: integer("media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    mediaAlt: text("media_alt").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("categories_parent_idx").on(table.parentId),
    index("categories_position_idx").on(table.position),
  ],
);

/**
 * Products.
 *
 * `slug` is globally unique, not unique-per-category. That is what makes the
 * public route `/products/[category]/[product]` resolvable and, more
 * importantly, what would let the URL drop its category segment later without
 * any product changing address.
 *
 * `benefit` is the only copy field. §4.5 measured 68 of 122 products as name
 * and nothing else, and recorded that a second free-text `description` column
 * would repeat the `Category.description` mistake — a field nobody can define,
 * populated inconsistently. It is not here.
 */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** Verbatim supplied benefit copy. Never paraphrased into a claim. */
    benefit: text("benefit"),
    /** Olfactive family, fragrances only — a packed string today (§4.4). */
    olfactive: text("olfactive"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "restrict" }),
    status: contentStatus("status").notNull().default("authoritative"),
    mediaId: integer("media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    mediaAlt: text("media_alt").notNull().default(""),
    /** Hidden from the public site without being deleted. */
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("products_category_idx").on(table.categoryId),
    index("products_position_idx").on(table.position),
  ],
);

/* -------------------------------------------------------------------------- */
/* End-product formats                                                         */
/* -------------------------------------------------------------------------- */

/**
 * "Shampoo", "Fabric softener" — what a material is supplied FOR.
 *
 * A real table rather than a text array because §4.4 classifies Format as a
 * many-to-many relationship that is merely free-text today. Modelled properly
 * now, renaming "Body creams" fixes it everywhere instead of in 14 rows.
 *
 * NOT an Application. The two were one field once and it was a schema bug.
 */
export const formats = pgTable("formats", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const productFormats = pgTable(
  "product_formats",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    formatId: integer("format_id")
      .notNull()
      .references(() => formats.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.productId, table.formatId] })],
);

/* -------------------------------------------------------------------------- */
/* Applications and industries                                                 */
/* -------------------------------------------------------------------------- */

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /** Parent grouping, e.g. "personal-care". Mirrors the industry slug. */
  groupSlug: text("group_slug"),
  position: integer("position").notNull().default(0),
  sourceId: integer("source_id")
    .notNull()
    .references(() => sourceDocuments.id, { onDelete: "restrict" }),
  status: contentStatus("status").notNull().default("authoritative"),
  mediaId: integer("media_id").references(() => mediaAssets.id, {
    onDelete: "set null",
  }),
  mediaAlt: text("media_alt").notNull().default(""),
});

/**
 * Which ranges supply an application.
 *
 * This is the relationship Cerium's material actually declares. Note there is
 * deliberately NO product↔application join: §4.4 marks it REQUIRED but
 * non-existent, and the product page is built on the fact that it does not
 * exist. Add the table when Cerium supplies the data, not before.
 */
export const applicationCategories = pgTable(
  "application_categories",
  {
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.categoryId] })],
);

export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  sourceId: integer("source_id")
    .notNull()
    .references(() => sourceDocuments.id, { onDelete: "restrict" }),
  status: contentStatus("status").notNull().default("authoritative"),
  mediaId: integer("media_id").references(() => mediaAssets.id, {
    onDelete: "set null",
  }),
  mediaAlt: text("media_alt").notNull().default(""),
});

export const industryApplications = pgTable(
  "industry_applications",
  {
    industryId: integer("industry_id")
      .notNull()
      .references(() => industries.id, { onDelete: "cascade" }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.industryId, table.applicationId] })],
);

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Admin accounts.
 *
 * There is no public sign-up anywhere in the application and no route that
 * creates a user — accounts are created by `npm run db:seed-admin`. A B2B
 * catalogue has no reason to accept registrations, and every registration form
 * that exists is a registration form that can be abused.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    /** bcrypt. The plaintext is never stored, logged or returned. */
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  // Case-insensitive uniqueness: Admin@x and admin@x are the same person, and
  // allowing both is how you get an account nobody can sign in to reliably.
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

/* -------------------------------------------------------------------------- */
/* Relations                                                                   */
/* -------------------------------------------------------------------------- */

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryTree",
  }),
  children: many(categories, { relationName: "categoryTree" }),
  products: many(products),
  media: one(mediaAssets, {
    fields: [categories.mediaId],
    references: [mediaAssets.id],
  }),
  source: one(sourceDocuments, {
    fields: [categories.sourceId],
    references: [sourceDocuments.id],
  }),
  applications: many(applicationCategories),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  media: one(mediaAssets, {
    fields: [products.mediaId],
    references: [mediaAssets.id],
  }),
  source: one(sourceDocuments, {
    fields: [products.sourceId],
    references: [sourceDocuments.id],
  }),
  formats: many(productFormats),
}));

export const productFormatsRelations = relations(productFormats, ({ one }) => ({
  product: one(products, {
    fields: [productFormats.productId],
    references: [products.id],
  }),
  format: one(formats, {
    fields: [productFormats.formatId],
    references: [formats.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ many }) => ({
  categories: many(applicationCategories),
  industries: many(industryApplications),
}));

export const applicationCategoriesRelations = relations(
  applicationCategories,
  ({ one }) => ({
    application: one(applications, {
      fields: [applicationCategories.applicationId],
      references: [applications.id],
    }),
    category: one(categories, {
      fields: [applicationCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const industriesRelations = relations(industries, ({ many }) => ({
  applications: many(industryApplications),
}));

export const industryApplicationsRelations = relations(
  industryApplications,
  ({ one }) => ({
    industry: one(industries, {
      fields: [industryApplications.industryId],
      references: [industries.id],
    }),
    application: one(applications, {
      fields: [industryApplications.applicationId],
      references: [applications.id],
    }),
  }),
);
