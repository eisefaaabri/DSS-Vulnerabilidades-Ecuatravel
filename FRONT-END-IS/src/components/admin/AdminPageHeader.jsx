import React from 'react';

/** Encabezado común de cada sección del panel. */
const AdminPageHeader = ({ title, description, actions }) => (
  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
    <div>
      <h1 className="text-3xl md:text-4xl leading-tight text-ec-ink">{title}</h1>
      {description && <p className="text-ec-slate text-sm mt-1 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-col sm:flex-row gap-3">{actions}</div>}
  </div>
);

export default AdminPageHeader;
