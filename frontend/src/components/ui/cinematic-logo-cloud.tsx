"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Marquee } from "@/components/ui/cinematic-logo-cloud-utils/marquee";

export type LogoCloudClient = {
  name: string;
  slug?: string;
  text?: boolean;
  className?: string;
  nameClassName?: string;
  invertDark?: boolean;
};

export interface CinematicLogoCloudProps {
  clients: LogoCloudClient[];
  variant?: "grid" | "marquee" | "marquee-named";
  className?: string;
  eyebrow?: string;
  description?: string;
}

export function CinematicLogoCloud({
  clients,
  variant = "grid",
  className,
  eyebrow = "Trusted by teams building the future of AI.",
  description = "From prototype to production, autonomously.",
}: CinematicLogoCloudProps) {
  const renderClient = (client: LogoCloudClient, size: "lg" | "sm" = "lg") => {
    if (client.text) {
      return (
        <span
          className={cn(
            size === "lg"
              ? "text-xl font-bold text-zinc-900 dark:text-white"
              : "text-sm font-semibold text-zinc-700 dark:text-zinc-300",
            client.className,
          )}
        >
          {client.name}
        </span>
      );
    }
    return (
      <img
        src={`https://cdn.simpleicons.org/${client.slug}`}
        alt={client.name}
        className={cn(
          size === "lg" ? "h-6 w-auto" : "h-5 w-auto",
          client.invertDark && "dark:invert",
        )}
        loading="lazy"
      />
    );
  };

  if (variant === "marquee") {
    return (
      <div
        className={cn(
          "w-full bg-zinc-50/50 py-12 md:py-16 dark:bg-zinc-950",
          className,
        )}
      >
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {eyebrow}
        </p>
        <Marquee speed={35}>
          {clients.map((brand) => (
            <div
              key={brand.name}
              className="flex shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-5 py-3 shadow-sm dark:border-white/8 dark:bg-zinc-900"
            >
              {renderClient(brand, "sm")}
            </div>
          ))}
        </Marquee>
      </div>
    );
  }

  if (variant === "marquee-named") {
    return (
      <div
        className={cn(
          "w-full bg-zinc-50/50 py-12 md:py-16 dark:bg-zinc-950",
          className,
        )}
      >
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {eyebrow}
        </p>
        <Marquee speed={40}>
          {clients.map((brand) => (
            <div
              key={brand.name}
              className="flex shrink-0 items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 shadow-sm dark:border-white/8 dark:bg-zinc-900"
            >
              {brand.slug && (
                <img
                  src={`https://cdn.simpleicons.org/${brand.slug}`}
                  alt={brand.name}
                  className={cn(
                    "h-4 w-4 shrink-0",
                    brand.invertDark && "dark:invert",
                  )}
                  loading="lazy"
                />
              )}
              <span
                className={cn(
                  "text-sm text-zinc-800 dark:text-zinc-200",
                  brand.nameClassName,
                )}
              >
                {brand.name}
              </span>
            </div>
          ))}
        </Marquee>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full bg-zinc-50/50 py-12 md:py-16 dark:bg-zinc-950",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {eyebrow}
        </p>
        {description && (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        )}

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } },
            hidden: {},
          }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-6 transition-all"
        >
          {clients.map((brand) => (
            <motion.div
              key={brand.name}
              variants={{
                hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="flex min-w-25 items-center justify-center px-2 sm:min-w-30"
            >
              {renderClient(brand)}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default CinematicLogoCloud;
