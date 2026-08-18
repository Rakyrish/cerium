import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/layout/Logo";
import { footerNavigation, legalNavigation } from "@/data/navigation";
import { siteConfig } from "@/config/site";

/**
 * Global footer.
 *
 * Every detail shown is verified from supplied Cerium material. Links whose
 * destination does not exist yet are marked `upcoming` in the navigation data
 * and rendered as plain text with a "Coming soon" note — a footer full of dead
 * links is worse for both visitors and crawlers than an honest short one.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const socials = siteConfig.social.filter((item) => Boolean(item.href));

  return (
    <footer className="on-dark bg-green-950 text-text-inverse">
      <Container>
        <div className="grid gap-12 py-16 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-20">
          {/* Brand + contact */}
          <div>
            <Logo variant="inverse" />

            <p className="mt-6 max-w-[38ch] text-small text-white/70">
              {siteConfig.description}
            </p>

            <address className="mt-8 not-italic">
              <h2 className="text-eyebrow font-semibold uppercase text-primary-light">
                Contact
              </h2>
              <ul className="mt-4 space-y-2.5 text-small text-white/80">
                <li>
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="transition-colors hover:text-white"
                  >
                    {siteConfig.contact.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={siteConfig.contact.emailHref}
                    className="transition-colors hover:text-white"
                  >
                    {siteConfig.contact.email}
                  </a>
                </li>
                <li className="pt-2 text-white/70">
                  {siteConfig.address.street}
                  <br />
                  {siteConfig.address.locality}, {siteConfig.address.region}
                  <br />
                  {siteConfig.address.country}
                </li>
              </ul>
            </address>

            <div className="mt-8">
              <h2 className="text-eyebrow font-semibold uppercase text-primary-light">
                Opening hours
              </h2>
              <dl className="mt-4 space-y-1.5 text-small text-white/70">
                {siteConfig.hours.map((entry) => (
                  <div key={entry.days} className="flex flex-wrap gap-x-3">
                    <dt className="min-w-[9.5rem]">{entry.days}</dt>
                    <dd className="text-white/85">{entry.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {footerNavigation.map((column) => (
              <div key={column.title}>
                <h2 className="text-eyebrow font-semibold uppercase text-primary-light">
                  {column.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      {link.upcoming ? (
                        <span className="inline-flex flex-wrap items-baseline gap-x-2 text-small text-white/40">
                          {link.label}
                          <span className="text-caption uppercase tracking-wide">
                            Coming soon
                          </span>
                        </span>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-small text-white/75 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Legal bar */}
        <div className="flex flex-col gap-5 border-t border-border-inverse py-7 text-caption text-white/55 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {socials.length > 0 && (
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {socials.map((social) => (
                  <li key={social.name}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-white"
                    >
                      {social.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalNavigation.map((link) => (
                <li key={link.href}>
                  {link.upcoming ? (
                    <span className="text-white/35">{link.label}</span>
                  ) : (
                    <Link href={link.href} className="transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  );
}
