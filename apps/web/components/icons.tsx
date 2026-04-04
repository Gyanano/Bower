"use client";

import type { SVGProps } from "react";

const iconProps: SVGProps<SVGSVGElement> = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.8,
  viewBox: "0 0 24 24",
};

type IconName =
  | "search"
  | "plus"
  | "settings"
  | "sidebar"
  | "sparkles"
  | "layout"
  | "folder"
  | "chevron-down"
  | "chevron-right"
  | "copy"
  | "copy-check"
  | "clock"
  | "trash"
  | "loader"
  | "grid"
  | "cpu"
  | "user"
  | "brush"
  | "archive"
  | "refresh"
  | "x";

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  switch (name) {
    case "search":
      return <svg {...iconProps} {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case "plus":
      return <svg {...iconProps} {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "settings":
      return <svg {...iconProps} {...props}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.7Z" /></svg>;
    case "sidebar":
      return <svg {...iconProps} {...props}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9 4.5v15" /></svg>;
    case "sparkles":
      return <svg {...iconProps} {...props}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><path d="m5 17 .8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8L5 17Z" /><path d="m19 14 .9 2.4L22.3 17l-2.4.9L19 20.3l-.9-2.4-2.4-.9 2.4-.6L19 14Z" /></svg>;
    case "layout":
      return <svg {...iconProps} {...props}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9 4.5v15M9 10h11.5" /></svg>;
    case "folder":
      return <svg {...iconProps} {...props}><path d="M3.5 7.5h5l2 2h10v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><path d="M3.5 7.5v-.8a2 2 0 0 1 2-2h3.3l2 2H18a2 2 0 0 1 2 2v.8" /></svg>;
    case "chevron-down":
      return <svg {...iconProps} {...props}><path d="m6 9 6 6 6-6" /></svg>;
    case "chevron-right":
      return <svg {...iconProps} {...props}><path d="m9 6 6 6-6 6" /></svg>;
    case "copy":
      return <svg {...iconProps} {...props}><rect x="9" y="9" width="10" height="10" rx="2" /><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></svg>;
    case "copy-check":
      return <svg {...iconProps} {...props}><rect x="9" y="9" width="10" height="10" rx="2" /><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /><path d="m12 14 2 2 4-4" /></svg>;
    case "clock":
      return <svg {...iconProps} {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3 2" /></svg>;
    case "trash":
      return <svg {...iconProps} {...props}><path d="M4.5 7.5h15" /><path d="M9.5 7.5v-2h5v2" /><path d="m7.5 7.5 1 11h7l1-11" /></svg>;
    case "loader":
      return <svg {...iconProps} {...props}><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" /></svg>;
    case "grid":
      return <svg {...iconProps} {...props}><rect x="4" y="4" width="6" height="6" rx="1.2" /><rect x="14" y="4" width="6" height="6" rx="1.2" /><rect x="4" y="14" width="6" height="6" rx="1.2" /><rect x="14" y="14" width="6" height="6" rx="1.2" /></svg>;
    case "cpu":
      return <svg {...iconProps} {...props}><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 1.5v3M14 1.5v3M10 19.5v3M14 19.5v3M19.5 10h3M19.5 14h3M1.5 10h3M1.5 14h3" /></svg>;
    case "user":
      return <svg {...iconProps} {...props}><circle cx="12" cy="8" r="3.2" /><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" /></svg>;
    case "brush":
      return <svg {...iconProps} {...props}><path d="M7 16c-2 0-3 1.5-3 3 0 1 .5 1.5 1.5 1.5 2.5 0 4.5-2 4.5-4.5V4l7 7-7 5Z" /></svg>;
    case "archive":
      return <svg {...iconProps} {...props}><rect x="4" y="4" width="16" height="4" rx="1" /><path d="M5.5 8.5v8a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-8" /><path d="M10 12h4" /></svg>;
    case "refresh":
      return <svg {...iconProps} {...props}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v6h-6" /></svg>;
    case "x":
      return <svg {...iconProps} {...props}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    default:
      return null;
  }
}
