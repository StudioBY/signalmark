import React, { useState } from "react";

/** Report subject line: grayscale profile photo (when available) + display name. */
export default function ReportSubject({ name, photoUrl }) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="mt-3 flex items-center gap-4">
      {photoUrl && !broken && (
        <img
          src={photoUrl}
          alt={name}
          onError={() => setBroken(true)}
          className="h-12 w-12 rounded-full object-cover grayscale"
        />
      )}
      <p className="text-[11px] uppercase tracking-[0.32em] text-[#1B2430]">{name}</p>
    </div>
  );
}