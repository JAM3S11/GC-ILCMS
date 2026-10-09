import React from 'react';

/** The national colours as a hairline above the workspace. */
export const GovBanner: React.FC = () => (
  <div className="flex h-1 shrink-0" aria-hidden="true">
    <span className="flex-1 bg-black" />
    <span className="flex-1 bg-red-700" />
    <span className="flex-1 bg-green-700" />
  </div>
);
