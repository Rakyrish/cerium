"""
AI-assisted editorial copy.

---------------------------------------------------------------------------
THE MODEL IS AN ASSISTANT, NEVER A SOURCE OF PRODUCT INFORMATION
---------------------------------------------------------------------------
This is the single most dangerous file in the backend, because a language
model will cheerfully produce a CAS number, an INCI name, a purity
specification or an ISO certification for any chemical you name, and every one
of them will look correct. For a supplier of raw materials into personal care,
publishing a fabricated specification is a liability question — and
fabricated structured data is a search manual-action risk on top.

Three mechanisms, in order of how much they are relied upon:

1. **The output shape cannot carry a specification.** The model is asked for a
   description, a title and a meta description. There is no field for a CAS
   number, so there is nowhere for one to go. This is the protection that
   actually works, because it does not depend on the model cooperating.

2. **Every returned string is scanned** for the patterns that indicate an
   invented fact — CAS-shaped digits, percentage purities, ISO references. A
   hit rejects the generation outright rather than trying to strip it, because
   a sentence built around a fabricated number does not survive removing it.

3. **The prompt says so.** Listed last on purpose: instructions are the
   weakest of the three and must never be the only one.

Output always enters the database as `ai_draft`. Nothing here may set a
stronger status, and `Product.clean()` refuses to publish while it is set.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from django.conf import settings

log = logging.getLogger(__name__)


class AIContentError(RuntimeError):
    """Raised when generation cannot be completed or cannot be trusted."""


@dataclass(frozen=True)
class GeneratedCopy:
    """What the model is allowed to return. Nothing else has a field."""

    description: str
    seo_title: str
    seo_description: str


# --------------------------------------------------------------------------
# Fabrication detection
# --------------------------------------------------------------------------
# Deliberately blunt. A false positive costs an editor one retry; a false
# negative puts an invented specification on a chemicals catalogue.

_FABRICATION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    # CAS registry numbers: 2-7 digits, 2 digits, 1 check digit.
    ("a CAS registry number", re.compile(r"\b\d{2,7}-\d{2}-\d\b")),
    # Purity / concentration claims.
    ("a purity or concentration figure", re.compile(r"\b\d{1,3}(?:\.\d+)?\s?%")),
    # Standards and certifications.
    ("a standard or certification", re.compile(r"\b(?:ISO|ASTM|USP|BP|EP|GMP|HALAL|KOSHER|ECOCERT|COSMOS)\b[\s\-]?\d*", re.I)),
    # Physical specifications.
    ("a physical specification", re.compile(r"\b(?:pH|melting point|boiling point|flash point|viscosity|density|specific gravity)\b\s*(?:of|:|=)?\s*[\d<>~]", re.I)),
    # INCI declarations.
    ("an INCI name", re.compile(r"\bINCI\b", re.I)),
    # Shelf life and storage claims stated as fact.
    ("a shelf-life claim", re.compile(r"\b(?:shelf[\s-]?life|expiry)\b", re.I)),
]

_SYSTEM_PROMPT = """\
You write catalogue copy for Cerium Chemicals, a Nairobi supplier of specialty
raw materials to personal care and home care formulators.

ABSOLUTE RULES — these override every other instruction:

1. Use ONLY the facts given to you in the user message. You have no other
   knowledge of this product, even if you recognise its name.
2. NEVER state a CAS number, INCI name, purity, percentage, pH, melting or
   flash point, viscosity, density, shelf life, country of origin,
   certification (ISO, ECOCERT, COSMOS, HALAL, GMP...), price, stock level or
   award. If you do not have it in the input, it does not exist.
3. Do not restate a supplied claim in stronger terms. "Moisturising" must not
   become "deeply moisturising" or "clinically proven to moisturise".
4. If the supplied facts are too thin to write from, say so in the description
   field and leave it short. A short honest line beats a padded paragraph.

VOICE: factual, industrial, understated. No hype, no superlatives, no
marketing exclamations. Formulators are the audience; they buy on specifics.

SEO: write for a person, which is also what ranks. Use the product and
category name naturally in the first sentence. Do not keyword-stuff, do not
repeat the name more than twice, do not write "buy" or "best" or "leading".

Return strict JSON with exactly these keys and no others:
  description      2-4 plain sentences. No markdown, no lists, no headings.
  seo_title        <= 60 characters. Include the product name.
  seo_description  <= 155 characters. A real summary, not a truncated title.
"""


def is_configured() -> bool:
    return bool(settings.OPENAI_API_KEY)


def _scan_for_fabrication(copy: GeneratedCopy) -> None:
    """Reject the whole generation if any field carries an invented fact."""
    for field_name, text in (
        ("description", copy.description),
        ("seo_title", copy.seo_title),
        ("seo_description", copy.seo_description),
    ):
        for label, pattern in _FABRICATION_PATTERNS:
            match = pattern.search(text)
            if match:
                log.warning(
                    "rejected AI copy: %s in %s (%r)", label, field_name, match.group(0)
                )
                raise AIContentError(
                    f"The generated {field_name} contained what looks like {label} "
                    f"({match.group(0)!r}). Cerium copy may not carry technical data "
                    f"that is not in a supplied document, so this draft was discarded. "
                    f"Add the fact to the product's source material if it is real, or "
                    f"generate again."
                )


def _build_user_prompt(
    *,
    name: str,
    category: str,
    benefit: str = "",
    olfactive: str = "",
    formats: list[str] | None = None,
    application: str = "",
) -> str:
    """Assemble the ONLY facts the model is permitted to use.

    Built field by field rather than by dumping a serialised object, so a
    column added later cannot silently start feeding the model.
    """
    lines = [f"Product name: {name}", f"Category / range: {category}"]
    if benefit:
        lines.append(f"Benefit, verbatim from Cerium's catalogue: {benefit}")
    if olfactive:
        lines.append(f"Olfactive description: {olfactive}")
    if formats:
        lines.append(f"Available formats: {', '.join(formats)}")
    if application:
        lines.append(f"Typical application area: {application}")

    if not benefit and not olfactive:
        lines.append(
            "NOTE: no descriptive copy has been supplied for this product beyond "
            "its name and category. Keep the description to one or two sentences "
            "that say only what the name and category support."
        )
    return "\n".join(lines)


def generate_product_copy(
    *,
    name: str,
    category: str,
    benefit: str = "",
    olfactive: str = "",
    formats: list[str] | None = None,
    application: str = "",
) -> GeneratedCopy:
    """Draft copy for one product.

    Returns copy that still has to be reviewed by a human. The caller must
    store it with `status=ai_draft`; there is no argument here to make it
    anything stronger, on purpose.

    Raises AIContentError — never returns partial or unchecked output.
    """
    if not is_configured():
        raise AIContentError(
            "OPENAI_API_KEY is not set, so copy cannot be generated. Everything "
            "else in the admin works without it — add the key to .env and restart "
            "the backend."
        )

    try:
        from openai import OpenAI
    except ImportError as exc:  # pragma: no cover
        raise AIContentError("The openai package is not installed in this image.") from exc

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            # Low but not zero: zero makes every product read identically,
            # which is its own quality signal problem.
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": _build_user_prompt(
                        name=name,
                        category=category,
                        benefit=benefit,
                        olfactive=olfactive,
                        formats=formats,
                        application=application,
                    ),
                },
            ],
        )
    except Exception as exc:
        # Deliberately broad: openai raises a family of errors and the editor
        # needs one clear message, not a traceback in a form field.
        raise AIContentError(f"The content service could not be reached: {exc}") from exc

    raw = (response.choices[0].message.content or "").strip()
    if not raw:
        raise AIContentError("The content service returned nothing.")

    import json

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIContentError("The content service returned malformed JSON.") from exc

    copy = GeneratedCopy(
        description=str(data.get("description") or "").strip(),
        seo_title=str(data.get("seo_title") or "").strip()[:70],
        seo_description=str(data.get("seo_description") or "").strip()[:180],
    )

    if not copy.description:
        raise AIContentError("The content service returned an empty description.")

    # The scan runs last, over everything, including the truncated fields.
    _scan_for_fabrication(copy)

    return copy
