"""
The editorial admin at /django-admin/.

Two things here are more than standard registration, and both exist to make the
data-integrity rule operable rather than merely stated:

  * "Generate copy with AI" is an ACTION, not a save hook. Copy is drafted when
    an editor asks for it, never as a side effect of saving — an editor who
    corrects a typo must not have their correction overwritten by a model.

  * Publishing is guarded. `Product.clean()` refuses to publish while status is
    an AI one, and the changelist shows status prominently so a queue of
    unreviewed drafts is visible rather than something you have to go looking
    for.
"""

from __future__ import annotations

from django.contrib import admin, messages
from django.utils.html import format_html

from .models import (
    Application,
    ApplicationCategory,
    Category,
    ContentStatus,
    Format,
    Industry,
    MediaAsset,
    Product,
    ProductFormat,
    SiteMedia,
    SourceDocument,
)
from .services import ai_content, cloudinary_ingest


@admin.register(SourceDocument)
class SourceDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "revision", "slug")
    search_fields = ("title", "slug")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("thumbnail", "original_filename", "format", "dimensions", "uploaded_by", "created_at")
    list_display_links = ("thumbnail", "original_filename")
    readonly_fields = ("cloudinary_id", "format", "width", "height", "bytes", "created_at", "preview")
    search_fields = ("original_filename", "cloudinary_id")

    @admin.display(description="Size")
    def dimensions(self, obj: MediaAsset) -> str:
        return f"{obj.width}×{obj.height}" if obj.width and obj.height else "—"

    def _url(self, obj: MediaAsset, width: int) -> str:
        from django.conf import settings

        cloud = settings.CLOUDINARY_CLOUD_NAME
        if not cloud or not obj.cloudinary_id:
            return ""
        # Same transformation the frontend's cloudinaryLoader uses, so the admin
        # preview and the live site cannot disagree about what an asset looks like.
        return (
            f"https://res.cloudinary.com/{cloud}/image/upload/"
            f"f_auto,q_auto,c_limit,w_{width}/{obj.cloudinary_id}"
        )

    @admin.display(description="")
    def thumbnail(self, obj: MediaAsset):
        url = self._url(obj, 80)
        if not url:
            return "—"
        return format_html('<img src="{}" style="height:40px;border-radius:2px" alt="">', url)

    @admin.display(description="Preview")
    def preview(self, obj: MediaAsset):
        url = self._url(obj, 600)
        if not url:
            return "Cloudinary is not configured."
        return format_html('<img src="{}" style="max-width:100%;height:auto" alt="">', url)

    def delete_queryset(self, request, queryset):
        """Remove the bytes as well as the row.

        A Cloudinary account that only ever accumulates is one nobody can
        navigate after a year.
        """
        for asset in queryset:
            try:
                cloudinary_ingest.delete(asset.cloudinary_id)
            except cloudinary_ingest.IngestError as exc:
                messages.warning(request, f"{asset}: {exc}")
        super().delete_queryset(request, queryset)


class ProductFormatInline(admin.TabularInline):
    model = ProductFormat
    extra = 1
    autocomplete_fields = ("format",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "status_badge", "published", "has_image", "updated_at")
    list_filter = ("published", "status", "category")
    search_fields = ("name", "slug", "benefit")
    autocomplete_fields = ("category", "source", "media")
    inlines = [ProductFormatInline]
    actions = ["generate_copy", "mark_human_approved"]
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        ("Identity", {
            "fields": ("name", "slug", "category", "position"),
            "description": (
                "The slug is the URL and is fixed at creation. Renaming is free; "
                "re-slugging breaks every link and ranking that points here."
            ),
        }),
        ("Supplied copy", {
            "fields": ("benefit", "olfactive", "source"),
            "description": (
                "Verbatim from Cerium's catalogue or price lists. Do not paraphrase — "
                "a paraphrase becomes a new claim about a chemical."
            ),
        }),
        ("Authored copy", {
            "fields": ("description", "seo_title", "seo_description"),
            "description": (
                "May be AI-drafted via the action on the product list. Review it "
                "before publishing; the form will refuse otherwise."
            ),
        }),
        ("Image", {"fields": ("media", "media_alt")}),
        ("Publication", {"fields": ("status", "published", "created_at", "updated_at")}),
    )

    def get_prepopulated_fields(self, request, obj=None):
        # Only when creating. The slug is identity afterwards.
        return {} if obj else {"slug": ("name",)}

    def get_readonly_fields(self, request, obj=None):
        base = list(self.readonly_fields)
        if obj:
            base.append("slug")
        return base

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj: Product):
        colour = {
            ContentStatus.AUTHORITATIVE: "#21683f",
            ContentStatus.HUMAN_APPROVED: "#2b3bd4",
            ContentStatus.AI_DRAFT: "#a3341f",
            ContentStatus.AI_SUGGESTION: "#8a6510",
        }.get(obj.status, "#5a6a61")
        return format_html(
            '<span style="color:{};font-weight:600">{}</span>', colour, obj.get_status_display()
        )

    @admin.display(description="Image", boolean=True)
    def has_image(self, obj: Product) -> bool:
        return obj.media_id is not None

    @admin.action(description="Generate copy with AI (saves as unreviewed draft)")
    def generate_copy(self, request, queryset):
        if not ai_content.is_configured():
            self.message_user(
                request,
                "OPENAI_API_KEY is not set, so no copy was generated.",
                level=messages.ERROR,
            )
            return

        drafted = 0
        for product in queryset.select_related("category"):
            try:
                copy = ai_content.generate_product_copy(
                    name=product.name,
                    category=product.category.name if product.category else "",
                    benefit=product.benefit,
                    olfactive=product.olfactive,
                    formats=list(product.formats.values_list("name", flat=True)),
                )
            except ai_content.AIContentError as exc:
                self.message_user(request, f"{product.name}: {exc}", level=messages.ERROR)
                continue

            product.description = copy.description
            product.seo_title = copy.seo_title
            product.seo_description = copy.seo_description
            # The only status this code path may write. Never stronger.
            product.status = ContentStatus.AI_DRAFT
            product.published = False
            product.save(update_fields=[
                "description", "seo_title", "seo_description", "status", "published", "updated_at",
            ])
            drafted += 1

        if drafted:
            self.message_user(
                request,
                f"Drafted copy for {drafted} product(s). Nothing was published — review "
                f"each one, then use “Mark as human approved”.",
                level=messages.WARNING,
            )

    @admin.action(description="Mark as human approved (allows publishing)")
    def mark_human_approved(self, request, queryset):
        # A person clicking this IS the review step, which is why it is a
        # separate deliberate action and not a checkbox on the generate action.
        updated = queryset.update(status=ContentStatus.HUMAN_APPROVED)
        self.message_user(request, f"{updated} product(s) marked as reviewed by you.")


class ApplicationCategoryInline(admin.TabularInline):
    model = ApplicationCategory
    extra = 1
    autocomplete_fields = ("category",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "product_count", "slug")
    list_filter = ("parent",)
    search_fields = ("name", "slug")
    autocomplete_fields = ("parent", "source", "media")

    def get_prepopulated_fields(self, request, obj=None):
        return {} if obj else {"slug": ("name",)}

    @admin.display(description="Products")
    def product_count(self, obj: Category) -> int:
        # Derived, never stored — a stored count is a count that goes stale.
        return obj.products.count()


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "position")
    list_filter = ("industry",)
    search_fields = ("name", "slug")
    inlines = [ApplicationCategoryInline]
    autocomplete_fields = ("industry", "media")

    def get_prepopulated_fields(self, request, obj=None):
        return {} if obj else {"slug": ("name",)}


@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ("name", "position", "slug")
    search_fields = ("name", "slug")

    def get_prepopulated_fields(self, request, obj=None):
        return {} if obj else {"slug": ("name",)}


@admin.register(Format)
class FormatAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")

    def get_prepopulated_fields(self, request, obj=None):
        return {} if obj else {"slug": ("name",)}


@admin.register(SiteMedia)
class SiteMediaAdmin(admin.ModelAdmin):
    list_display = ("slot", "media", "alt", "updated_at")
    autocomplete_fields = ("media",)
