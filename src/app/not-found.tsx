import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading, Eyebrow } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { categories } from "@/data/taxonomy";

/**
 * 404.
 *
 * Next.js serves this with a 404 status automatically, so it is correctly
 * signalled to crawlers rather than being a soft-404.
 *
 * A dead end is a wasted visit: this offers real routes onward instead of only
 * apologising.
 */
export default function NotFound() {
  return (
    <Section space="xl">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>Error 404</Eyebrow>
          <Heading level={1} size="h1" className="mt-6">
            We couldn&rsquo;t find that page.
          </Heading>
          <p className="mt-6 text-lead text-text-muted">
            The page may have moved, or the link may be out of date. Here is the
            way back.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button href="/" withArrow>
              Back to homepage
            </Button>
            <Button href="/products" variant="outline">
              Browse products
            </Button>
          </div>

          <nav aria-label="Product families" className="mt-14 border-t border-border pt-8">
            <h2 className="text-eyebrow font-semibold uppercase text-text-muted">
              Product families
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/products/${category.slug}`}
                    className="text-body font-medium text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </Section>
  );
}
