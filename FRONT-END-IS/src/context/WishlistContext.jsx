import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AtraccionesService } from '../services/api';
import { useAuth } from './AuthContext';

/**
 * Favoritos (wishlist) del usuario autenticado.
 * Centraliza el estado para que las tarjetas y el detalle compartan un solo fetch por sesión.
 */
const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [ids, setIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setIds(new Set());
      setError(null);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    AtraccionesService.getWishlist()
      .then((data) => {
        if (cancelled) return;
        const list = data?.data ?? [];
        setIds(new Set(list.map((item) => item.atraccion_id)));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.userMessage || 'No pudimos cargar tus favoritos.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const isWishlisted = useCallback((atraccionId) => ids.has(atraccionId), [ids]);

  const toggle = useCallback(
    async (atraccionId) => {
      const wasAdded = ids.has(atraccionId);
      // Optimista: aplica el cambio al instante y revierte si falla.
      setIds((prev) => {
        const next = new Set(prev);
        if (wasAdded) next.delete(atraccionId);
        else next.add(atraccionId);
        return next;
      });
      try {
        if (wasAdded) {
          await AtraccionesService.removeWishlist(atraccionId);
        } else {
          await AtraccionesService.addWishlist(atraccionId);
        }
        return { ok: true, added: !wasAdded };
      } catch (err) {
        // 409 = ya estaba / 404 = ya no estaba: el servidor quedó como el estado optimista.
        const alreadySynced = err?.response?.status === 409 || err?.response?.status === 404;
        if (!alreadySynced) {
          setIds((prev) => {
            const next = new Set(prev);
            if (wasAdded) next.add(atraccionId);
            else next.delete(atraccionId);
            return next;
          });
        }
        return { ok: alreadySynced, added: !wasAdded, message: alreadySynced ? null : (err?.userMessage || 'No se pudo actualizar el favorito.') };
      }
    },
    [ids],
  );

  const value = useMemo(
    () => ({ ids, loading, error, isWishlisted, toggle }),
    [ids, loading, error, isWishlisted, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist debe usarse dentro de WishlistProvider');
  return ctx;
}