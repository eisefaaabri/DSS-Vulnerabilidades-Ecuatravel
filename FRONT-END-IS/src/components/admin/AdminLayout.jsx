import React from 'react';
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLoginPanel from '../AuthLoginPanel';

// El operador (guía) solo ve lo que necesita en el punto de encuentro.
export const ADMIN_NAV = [
  { to: '/admin', label: 'Catálogo', end: true, roles: ['ADMIN'] },
  { to: '/admin/reservas', label: 'Reservas / Check-in', roles: ['ADMIN', 'OPERADOR'] },
  { to: '/admin/clientes', label: 'Clientes', roles: ['ADMIN', 'OPERADOR'] },
  { to: '/admin/personal', label: 'Personal', roles: ['ADMIN'] },
];

const navClass = ({ isActive }) =>
  `inline-flex items-center min-h-11 px-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors duration-150 ${
    isActive ? 'bg-ec-paper text-ec-ink' : 'text-ec-paper/75 hover:text-ec-paper hover:bg-white/10'
  }`;

/** Redirige al operador fuera de las secciones exclusivas del administrador. */
export const RequireRole = ({ roles, children }) => {
  const { session } = useAuth();
  const allowed = roles.some((r) => session?.roles?.includes(r));
  return allowed ? children : <Navigate to="/admin/reservas" replace />;
};

const AdminShell = ({ children }) => (
  <div className="min-h-screen bg-ec-paper text-ec-ink font-sans">{children}</div>
);

const AdminLayout = () => {
  const { isAuthenticated, isStaff, session, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <AdminShell>
        <main className="section-grid py-12 md:py-20">
          <div className="max-w-lg mx-auto">
            <p className="eyebrow text-ec-volcano">Ecuatravel · Personal</p>
            <h1 className="text-4xl md:text-5xl leading-tight text-ec-ink mt-2 mb-2">Panel B2B</h1>
            <p className="text-ec-slate mb-6">
              Acceso para administradores y guías. Los turistas reservan desde la{' '}
              <Link to="/" className="font-bold text-ec-volcano underline underline-offset-2">
                tienda
              </Link>
              .
            </p>
            <AuthLoginPanel />
          </div>
        </main>
      </AdminShell>
    );
  }

  if (!isStaff) {
    return (
      <AdminShell>
        <main className="section-grid py-20 text-center">
          <h1 className="text-4xl leading-tight text-ec-ink mb-3">Esta zona es solo para el personal</h1>
          <p className="text-ec-slate mb-6">
            La cuenta <strong>{session?.email}</strong> es de cliente.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary px-6 py-3">
              Ir a la tienda
            </Link>
            <button type="button" onClick={logout} className="btn-secondary px-6 py-3">
              Cerrar sesión
            </button>
          </div>
        </main>
      </AdminShell>
    );
  }

  const rol = session.roles.includes('ADMIN') ? 'ADMIN' : 'OPERADOR';
  const items = ADMIN_NAV.filter((i) => i.roles.includes(rol));

  return (
    <AdminShell>
      <a href="#admin-main" className="skip-link">
        Saltar al contenido
      </a>
      <header className="bg-ec-ink text-ec-paper">
        <div className="section-grid flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link to="/admin/reservas" className="flex flex-col leading-tight min-h-11 justify-center">
              <span className="font-display text-xl">Ecuatravel</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-ec-sand">Panel B2B</span>
            </Link>
            <div className="flex items-center gap-2 lg:hidden">
              <button type="button" onClick={logout} className="text-sm font-bold text-ec-paper/80 hover:text-white min-h-11 px-2">
                Salir
              </button>
            </div>
          </div>
          <nav aria-label="Secciones del panel" className="-mx-1 overflow-x-auto">
            <ul className="flex gap-1 px-1">
              {items.map((i) => (
                <li key={i.to}>
                  <NavLink to={i.to} end={i.end} className={navClass}>
                    {i.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hidden lg:flex items-center gap-3 text-sm">
            <span className="text-ec-paper/70 max-w-[14rem] truncate" title={session.email}>
              {session.email}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide">{rol}</span>
            <Link to="/" className="font-bold text-ec-paper/80 hover:text-white min-h-11 inline-flex items-center">
              Ver tienda
            </Link>
            <button type="button" onClick={logout} className="font-bold text-ec-paper/80 hover:text-white min-h-11">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main id="admin-main" tabIndex={-1} className="section-grid py-8 md:py-10">
        <Outlet />
      </main>
    </AdminShell>
  );
};

export default AdminLayout;
