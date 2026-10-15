import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;

  if (localPart.length <= 4) {
    return `${localPart[0]}***${localPart.slice(-1)}@${domain}`;
  }

  const first = localPart.slice(0, 2);
  const last = localPart.slice(-2);
  return `${first}*****${last}@${domain}`;
}
