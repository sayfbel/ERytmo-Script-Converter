"use client";

import React from "react";

export interface DubFlowLogoProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Primary color for the logo. If omitted, defaults to 'currentColor'.
   * You can pass hex like "#1a1a1a", "#ffffff", or use Tailwind classes on `className` (e.g. `text-white`).
   */
  color?: string;
  /**
   * Specific color for the 7 soundwave bars (overrides `color`).
   */
  iconColor?: string;
  /**
   * Specific color for the "DubFlow" wordmark text (overrides `color`).
   */
  textColor?: string;
  /**
   * Whether to include the "DubFlow" text wordmark (default: true).
   */
  showText?: boolean;
  /**
   * Display the accent asterisk after "DubFlow" (default: false).
   */
  showAsterisk?: boolean;
  /**
   * Custom color for the asterisk (default: '#f59e0b').
   */
  asteriskColor?: string;
  /**
   * When true (default), trims empty margins around the logo so it fits easily in navbars and headers.
   * When false, uses the exact canvas viewBox (0 0 680 240) as provided in the original template.
   */
  tight?: boolean;
}

/**
 * The 7-bar soundwave ellipse array
 */
export function DubFlowBars({ color = "currentColor" }: { color?: string }) {
  return (
    <g fill={color}>
      {/* Bar 1 (Outer Left) */}
      <ellipse cx="140" cy="120" rx="4" ry="17" />

      {/* Bar 2 */}
      <ellipse cx="156" cy="120" rx="6.5" ry="38" />

      {/* Bar 3 */}
      <ellipse cx="174" cy="120" rx="10" ry="58" />

      {/* Bar 4 (Center - Tallest) */}
      <ellipse cx="196" cy="120" rx="15" ry="67" />

      {/* Bar 5 */}
      <ellipse cx="218" cy="120" rx="10" ry="58" />

      {/* Bar 6 */}
      <ellipse cx="236" cy="120" rx="6.5" ry="38" />

      {/* Bar 7 (Outer Right) */}
      <ellipse cx="252" cy="120" rx="4" ry="17" />
    </g>
  );
}

/**
 * Soundwave Icon only (tight bounding box ~1:1 aspect ratio)
 */
export function DubFlowIcon({
  color = "currentColor",
  className = "",
  style,
  ...props
}: React.SVGProps<SVGSVGElement> & { color?: string }) {
  return (
    <svg
      viewBox="132 50 128 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", ...style }}
      {...props}
    >
      <DubFlowBars color={color} />
    </svg>
  );
}

/**
 * DubFlow Full Logo (Soundwave bars + "DubFlow" wordmark)
 */
export function DubFlowLogo({
  color = "currentColor",
  iconColor,
  textColor,
  showText = true,
  showAsterisk = false,
  asteriskColor = "#f59e0b",
  tight = true,
  className = "",
  viewBox,
  style,
  ...props
}: DubFlowLogoProps) {
  const activeIconColor = iconColor || color;
  const activeTextColor = textColor || color;

  if (!showText) {
    return (
      <DubFlowIcon
        color={activeIconColor}
        className={className}
        style={style}
        {...props}
      />
    );
  }

  // When tight=true, bounds are tight around the graphics (132 to ~515).
  // When tight=false, bounds are the original canvas (0 0 680 240).
  const computedViewBox = viewBox || (tight ? "132 50 385 140" : "0 0 680 240");

  return (
    <svg
      viewBox={computedViewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", ...style }}
      {...props}
    >
      {/* Soundwave Ellipse Array */}
      <DubFlowBars color={activeIconColor} />

      {/* Wordmark: DubFlow */}
      <text
        x="285"
        y="138"
        fill={activeTextColor}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="52"
        fontWeight="500"
        letterSpacing="-0.02em"
      >
        DubFlow
        {showAsterisk && (
          <tspan fill={asteriskColor} dx="4" fontSize="42" fontStyle="italic">
            *
          </tspan>
        )}
      </text>
    </svg>
  );
}

export default DubFlowLogo;
