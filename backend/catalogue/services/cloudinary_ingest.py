"""
Cloudinary ingest — from an uploaded file or from a URL.

Product images are transferred into Cerium's own Cloudinary account and served
from there. A production catalogue must never depend on a third party's URL
staying alive and unchanged: a supplier redesigns their site, the image 404s,
and the catalogue quietly fills with broken pictures.

That is why URL ingest COPIES rather than links. The remote URL is kept on the
asset only as an audit note recording where it came from.

The binary lives in Cloudinary; Postgres holds the identifier and dimensions.
Neither half is sufficient alone — Cloudinary without the row has no catalogue
relationships, the row without Cloudinary has no pixels.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from django.conf import settings

log = logging.getLogger(__name__)

# Cloudinary's own limit for an unsigned-ish upload is higher, but a catalogue
# photograph has no business being larger than this and the cap is what stops a
# mistyped URL pulling a 2GB video onto the account.
MAX_BYTES = 15 * 1024 * 1024

ALLOWED_FORMATS = {"jpg", "jpeg", "png", "webp", "avif", "gif"}


class IngestError(RuntimeError):
    """Raised when an image cannot be ingested. Message is shown to the editor."""


@dataclass(frozen=True)
class IngestedAsset:
    cloudinary_id: str
    format: str
    width: int
    height: int
    bytes: int
    original_filename: str = ""
    source_url: str = ""


def is_configured() -> bool:
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def _configure():
    if not is_configured():
        raise IngestError(
            "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env, then restart "
            "the backend."
        )
    import cloudinary

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    return cloudinary


def _result_to_asset(result: dict, *, source_url: str = "", filename: str = "") -> IngestedAsset:
    fmt = str(result.get("format") or "").lower()
    if fmt not in ALLOWED_FORMATS:
        # Clean up rather than leaving an orphan on the account.
        _destroy_quietly(result.get("public_id"))
        raise IngestError(
            f"{fmt or 'that file'} is not an image format this catalogue accepts "
            f"({', '.join(sorted(ALLOWED_FORMATS))})."
        )
    return IngestedAsset(
        cloudinary_id=str(result["public_id"]),
        format=fmt,
        width=int(result.get("width") or 0),
        height=int(result.get("height") or 0),
        bytes=int(result.get("bytes") or 0),
        original_filename=filename,
        source_url=source_url,
    )


def _destroy_quietly(public_id: str | None) -> None:
    if not public_id:
        return
    try:
        import cloudinary.uploader

        cloudinary.uploader.destroy(public_id, invalidate=True)
    except Exception:  # pragma: no cover - best effort cleanup
        log.warning("could not remove rejected upload %s", public_id)


def ingest_file(file_obj, *, filename: str = "") -> IngestedAsset:
    """Upload a file object (a Django UploadedFile, or anything with .read())."""
    cloudinary = _configure()
    import cloudinary.uploader

    size = getattr(file_obj, "size", None)
    if size and size > MAX_BYTES:
        raise IngestError(f"That image is larger than {MAX_BYTES // (1024 * 1024)}MB.")

    try:
        result = cloudinary.uploader.upload(
            file_obj,
            folder=settings.CLOUDINARY_FOLDER,
            resource_type="image",
            # Cloudinary derives a public_id from the filename otherwise, which
            # collides the moment two people upload "image.jpg".
            unique_filename=True,
            overwrite=False,
        )
    except Exception as exc:
        raise IngestError(f"Cloudinary rejected the upload: {exc}") from exc

    return _result_to_asset(result, filename=filename or getattr(file_obj, "name", ""))


def ingest_url(url: str) -> IngestedAsset:
    """Copy a remote image into Cerium's Cloudinary account.

    Cloudinary fetches the URL itself rather than this process downloading and
    re-uploading it — fewer bytes across the wire and no temporary file.

    NOTE ON SSRF: Cloudinary performs the fetch from its own infrastructure, so
    a URL pointing at this network (169.254.169.254, 10.x, localhost) resolves
    in Cloudinary's context, not ours, and cannot reach our metadata service or
    internal hosts. The scheme check below is still worth having — it rejects
    `file://` and similar before a request is made at all.
    """
    cloudinary = _configure()
    import cloudinary.uploader

    url = (url or "").strip()
    if not url:
        raise IngestError("No image URL was given.")
    if not url.lower().startswith(("http://", "https://")):
        raise IngestError("An image URL must start with http:// or https://.")

    try:
        result = cloudinary.uploader.upload(
            url,
            folder=settings.CLOUDINARY_FOLDER,
            resource_type="image",
            unique_filename=True,
            overwrite=False,
        )
    except Exception as exc:
        raise IngestError(
            f"That image could not be fetched. Check the URL opens in a browser "
            f"and is not behind a login. ({exc})"
        ) from exc

    if int(result.get("bytes") or 0) > MAX_BYTES:
        _destroy_quietly(result.get("public_id"))
        raise IngestError(f"That image is larger than {MAX_BYTES // (1024 * 1024)}MB.")

    filename = url.rsplit("/", 1)[-1].split("?")[0]
    return _result_to_asset(result, source_url=url, filename=filename)


def delete(cloudinary_id: str) -> None:
    """Remove an asset from Cloudinary.

    Called only when the editor deletes the MediaAsset row. Cloudinary is the
    system of record for the bytes, so leaving the row without the image is
    worse than leaving the image without the row.
    """
    _configure()
    import cloudinary.uploader

    try:
        cloudinary.uploader.destroy(cloudinary_id, invalidate=True)
    except Exception as exc:
        raise IngestError(f"Cloudinary could not delete that image: {exc}") from exc
