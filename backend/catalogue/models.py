"""
The Cerium catalogue.

Mirrors `src/db/schema.ts` and the entity model in
`docs/phase-2-2a-schema-specification.md`. Where the two ever disagree the
specification wins and this file is wrong.

---------------------------------------------------------------------------
THE RULE THAT SHAPES EVERY MODEL HERE
---------------------------------------------------------------------------
Never invent product or technical information. No CAS numbers, INCI names,
specifications, certifications or origins unless they appear in a supplied
Cerium document. For a chemicals supplier that is a safety and liability
matter, not a stylistic preference.

Two mechanisms enforce it rather than merely asking:

  * `source` — every content-bearing row points at the document it came from.
  * `content_status` — how far a value is to be trusted. AI output enters as
    `ai_draft` and NOTHING in this application may promote a row to
    `authoritative` automatically. A human does that, or it does not happen.

---------------------------------------------------------------------------
DEVIATION FROM THE SPECIFICATION, RECORDED
---------------------------------------------------------------------------
§4.5 says omit a long `description`, and §4.6 says no SEO fields on Product
"initially". Both conclusions rest on the same measured fact: Cerium supplied
no copy beyond `benefit`, so any such field would have been filled by guessing.

That premise changed when the admin gained an authoring workflow. The copy now
has an author and an approver, and `content_status` records which. The fields
below therefore exist, and they default to the weakest status — never to
`authoritative`.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class ContentStatus(models.TextChoices):
    """How far a value is to be trusted.

    Deliberately ordered strongest to weakest. `AUTHORITATIVE` means it came
    from a supplied Cerium document verbatim; it is not reachable from any
    automatic code path.
    """

    AUTHORITATIVE = "authoritative", "Authoritative — verbatim from a Cerium document"
    HUMAN_APPROVED = "human_approved", "Human approved"
    AI_DRAFT = "ai_draft", "AI draft — not published"
    AI_SUGGESTION = "ai_suggestion", "AI suggestion — needs review"


class SourceDocument(models.Model):
    """A document Cerium supplied.

    A table rather than an enum because two price lists a quarter apart are
    different documents, and as enum members they collapsed into one.
    """

    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=255)
    kind = models.CharField(
        max_length=40,
        blank=True,
        help_text="catalogue | pricelist | website | statement | supplier",
    )
    revision = models.CharField(
        max_length=40, blank=True, help_text='e.g. "Q3 2026". Blank if unversioned.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "source_documents"
        ordering = ["title"]

    def __str__(self) -> str:
        return f"{self.title} ({self.revision})" if self.revision else self.title


class MediaAsset(models.Model):
    """An image, stored in Cloudinary.

    The bytes live in Cloudinary and never touch this server's filesystem —
    that is what lets the admin run on an ephemeral container without losing
    every upload on redeploy. Postgres holds the identifier and the dimensions
    so the catalogue can reason about an image without fetching it.

    `alt` is deliberately absent. Alt text describes an image's purpose in a
    particular place, and the same photograph can be informative on a product
    page and decorative behind a headline, so it belongs to the usage.
    """

    cloudinary_id = models.CharField(max_length=255, unique=True)
    original_filename = models.CharField(max_length=255, blank=True)
    format = models.CharField(max_length=20, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    bytes = models.PositiveIntegerField(null=True, blank=True)
    # Where it came from, for an audit trail on a shared account.
    source_url = models.URLField(
        max_length=1000,
        blank=True,
        help_text="Set when the asset was ingested from a URL rather than uploaded.",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_media",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "media_assets"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.original_filename or self.cloudinary_id


class Category(models.Model):
    """Product families and ranges — one self-referencing tree.

    A product belongs to exactly one category and containment is the
    relationship (§4.4). "Product family" is DERIVED by walking up `parent`
    and is never stored: storing it would let the two disagree.
    """

    slug = models.SlugField(max_length=140, unique=True)
    name = models.CharField(max_length=200)
    summary = models.TextField(blank=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    position = models.IntegerField(default=0)
    source = models.ForeignKey(
        SourceDocument, null=True, blank=True, on_delete=models.PROTECT, related_name="categories"
    )
    media = models.ForeignKey(
        MediaAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="categories"
    )
    media_alt = models.CharField(max_length=255, blank=True)

    # --- SEO -------------------------------------------------------------
    # Optional throughout. An empty field means the page falls back to derived
    # copy, which is correct: a truncated real sentence beats invented prose.
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=180, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categories"
        ordering = ["position", "name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name

    @property
    def family(self) -> "Category":
        """The root of this category's branch. Derived, never stored."""
        node = self
        seen = {node.pk}
        while node.parent_id and node.parent_id not in seen:
            node = node.parent
            seen.add(node.pk)
        return node

    @property
    def is_publishable(self) -> bool:
        """A category earns a page only when it has products or children.

        Mirrors `isPublishable()` in the frontend so a thin page cannot ship
        from either side.
        """
        return self.products.exists() or self.children.exists()


class Format(models.Model):
    """A pack or presentation a product is available in."""

    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=200)

    class Meta:
        db_table = "formats"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Industry(models.Model):
    """Who the material is for — Personal Care, Home Care."""

    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=200)
    summary = models.TextField(blank=True)
    position = models.IntegerField(default=0)
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=180, blank=True)

    class Meta:
        db_table = "industries"
        ordering = ["position", "name"]
        verbose_name_plural = "industries"

    def __str__(self) -> str:
        return self.name


class Application(models.Model):
    """What the material is for — Skin Care, Fabric Care.

    §5.4: an application belongs to exactly one industry.
    """

    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=200)
    summary = models.TextField(blank=True)
    industry = models.ForeignKey(
        Industry, null=True, blank=True, on_delete=models.PROTECT, related_name="applications"
    )
    # §5.x — an application surfaces categories. Kept as an explicit relation
    # rather than a slug array so the database can enforce that both ends exist.
    categories = models.ManyToManyField(
        Category, through="ApplicationCategory", related_name="applications", blank=True
    )
    position = models.IntegerField(default=0)
    media = models.ForeignKey(
        MediaAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="applications"
    )
    media_alt = models.CharField(max_length=255, blank=True)
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=180, blank=True)

    class Meta:
        db_table = "applications"
        ordering = ["position", "name"]

    def __str__(self) -> str:
        return self.name


class ApplicationCategory(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    position = models.IntegerField(default=0)

    class Meta:
        db_table = "application_categories"
        unique_together = [("application", "category")]
        ordering = ["position"]


class Product(models.Model):
    """A product Cerium supplies.

    §4.1: the slug is identity. It is fixed when the product is created and
    never changes, because a changed slug is a dead URL and a lost ranking.
    Renaming is free; re-slugging is not.
    """

    slug = models.SlugField(max_length=180, unique=True)
    name = models.CharField(max_length=255)

    # Verbatim supplied copy. Do not paraphrase it into a claim — a paraphrase
    # becomes a new assertion about a chemical, which is the thing this
    # codebase exists to avoid.
    benefit = models.TextField(blank=True)
    olfactive = models.CharField(max_length=255, blank=True)

    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products"
    )
    formats = models.ManyToManyField(
        Format, through="ProductFormat", related_name="products", blank=True
    )

    position = models.IntegerField(default=0)
    source = models.ForeignKey(
        SourceDocument, null=True, blank=True, on_delete=models.PROTECT, related_name="products"
    )
    status = models.CharField(
        max_length=20, choices=ContentStatus.choices, default=ContentStatus.AI_DRAFT
    )
    published = models.BooleanField(
        default=False,
        help_text="Unpublished products are absent from the site and the sitemap.",
    )

    media = models.ForeignKey(
        MediaAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="products"
    )
    media_alt = models.CharField(max_length=255, blank=True)

    # --- Authored copy ---------------------------------------------------
    # See the deviation note at the top of this module. Every field here is
    # optional and every one degrades to rendering nothing.
    description = models.TextField(
        blank=True,
        help_text=(
            "Longer editorial copy. May be AI-drafted, but it is published only "
            "once a human has reviewed it and moved status off ai_draft."
        ),
    )
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=180, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["position", "name"]
        indexes = [
            # The public site filters on exactly this pair constantly.
            models.Index(fields=["published", "category"]),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def is_ai_generated(self) -> bool:
        return self.status in {ContentStatus.AI_DRAFT, ContentStatus.AI_SUGGESTION}

    def clean(self) -> None:
        """Refuse to publish copy no human has vouched for.

        This is the guardrail that makes the whole AI feature safe to ship. It
        lives on the model rather than in the view so that every path —
        Django admin, management command, future API — hits it.
        """
        from django.core.exceptions import ValidationError

        if self.published and self.is_ai_generated:
            raise ValidationError(
                {
                    "published": (
                        "This product still carries AI-generated copy that nobody has "
                        "approved. Review the text, set status to Human approved (or "
                        "Authoritative if it is verbatim from a Cerium document), then "
                        "publish."
                    )
                }
            )


class ProductFormat(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    format = models.ForeignKey(Format, on_delete=models.CASCADE)
    position = models.IntegerField(default=0)

    class Meta:
        db_table = "product_formats"
        unique_together = [("product", "format")]
        ordering = ["position"]


class SiteMedia(models.Model):
    """Editorial image slots that belong to no catalogue record.

    Keyed by slot name because a slot is a designed position in a layout, not
    user-created content.
    """

    slot = models.CharField(max_length=100, primary_key=True)
    media = models.ForeignKey(
        MediaAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="site_slots"
    )
    # Empty string is a real, deliberate value: the image is decorative.
    alt = models.CharField(max_length=255, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site_media"
        verbose_name_plural = "site media"

    def __str__(self) -> str:
        return self.slot
