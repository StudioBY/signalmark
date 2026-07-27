import React from "react";
import { Link } from "react-router-dom";

const LOGO =
  "https://media.base44.com/images/public/6a666ce583df108a82658a63/8b7d95838_signalmark_logo.jpg";

/** Small letterhead mark at the top left of every page, links home. Scrolls with the page. */
export default function BrandMark() {
  return (
    <Link to="/" className="inline-block">
      <img
        src={LOGO}
        alt="SignalMark"
        className="h-[26px] w-auto opacity-90 grayscale contrast-125"
      />
    </Link>
  );
}