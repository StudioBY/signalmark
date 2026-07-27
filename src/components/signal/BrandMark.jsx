import React from "react";
import { Link } from "react-router-dom";

const LOGO =
  "https://media.base44.com/images/public/6a666ce583df108a82658a63/8b7d95838_signalmark_logo.jpg";

/**
 * Site-level letterhead mark in the page's outer margin, top left. Scrolls with the page.
 * mix-blend-multiply drops the file's white box onto the off-white background.
 */
export default function BrandMark() {
  return (
    <Link to="/" className="absolute left-8 top-8 z-10 inline-block md:left-10 md:top-10">
      <img
        src={LOGO}
        alt="SignalMark"
        className="h-[38px] w-auto opacity-90 mix-blend-multiply grayscale contrast-125"
      />
    </Link>
  );
}