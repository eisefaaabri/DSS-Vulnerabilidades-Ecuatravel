import React, { useCallback, useEffect, useState } from 'react';
import { AtraccionesService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Star = ({ filled, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    aria-label={label}
    className={onClick ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-ec-volcano rounded' : 'cursor-default'}
  >
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`w-5 h-5 ${onClick ? 'transition-transform hover:scale-110' : ''}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  </button>
);

const StarBar = ({ value, onSelect }) => (
  <div className="flex items-center gap-1 text-amber-500" role={onSelect ? 'radiogroup' : undefined}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        filled={n <= value}
        onClick={onSelect ? () => onSelect(n) : undefined}
        label={onSelect ? `Calificar con ${n} estrellas` : undefined}
      />
    ))}
  </div>
);

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Sección de reseñas: promedio, listado y formulario (solo logueados).
 */
const ReviewsSection = ({ atraccionId }) => {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    AtraccionesService.getReviews(atraccionId)
      .then((data) => setReviews(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setError('No pudimos cargar las reseñas.'))
      .finally(() => setLoading(false));
  }, [atraccionId]);

  useEffect(() => {
    setReviews([]);
    load();
  }, [load]);

  const average =
    reviews.length > 0 ? reviews.reduce((acc, r) => acc + Number(r.score || 0), 0) / reviews.length : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!score || score < 1 || score > 5) {
      setFormError('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 2) {
      setFormError('Escribe un comentario para acompañar tu calificación.');
      return;
    }
    setSubmitting(true);
    try {
      await AtraccionesService.createReview(atraccionId, { score, comment: comment.trim() });
      setScore(0);
      setComment('');
      setFormSuccess('¡Gracias! Tu reseña fue publicada.');
      load();
    } catch (err) {
      setFormError(err?.userMessage || 'No se pudo publicar la reseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="reviews-heading" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="reviews-heading" className="text-3xl text-ec-ink">
          Reseñas
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-ec-slate">
            <span className="text-lg font-extrabold text-ec-ink tabular-nums">
              {average.toFixed(1)}
            </span>
            <StarBar value={Math.round(average)} />
            <span>
              ({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="animate-pulse space-y-3" role="status" aria-live="polite">
          <div className="h-20 bg-ec-mist rounded-xl" />
          <div className="h-20 bg-ec-mist rounded-xl" />
        </div>
      )}

      {!loading && error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && reviews.length === 0 && (
        <p className="text-sm text-ec-slate rounded-xl border border-dashed border-ec-mist p-5">
          Aún no hay reseñas para esta experiencia. Sé el primero en compartir tu opinión.
        </p>
      )}

      {!loading && !error && reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-ec-mist/90 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-ec-pacific/15 text-ec-pacific font-extrabold text-sm">
                    {(r.cliente || 'A')[0].toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ec-ink">{r.cliente || 'Usuario anónimo'}</p>
                    <p className="text-xs text-ec-slate">{formatDate(r.created_at)}</p>
                  </div>
                </div>
                <StarBar value={Number(r.score) || 0} />
              </div>
              <p className="mt-3 text-sm text-ec-slate leading-relaxed whitespace-pre-line">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 rounded-2xl border border-ec-mist bg-ec-mist/20 p-4 md:p-5">
        {!isAuthenticated ? (
          <p className="text-sm text-ec-slate">
            ¿Ya viviste esta experiencia?{' '}
            <strong className="text-ec-ink">Inicia sesión para dejar tu reseña</strong> y ayudar a otros viajeros.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm font-bold text-ec-ink">Comparte tu experiencia</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ec-slate">Tu calificación:</span>
              <StarBar value={score} onSelect={setScore} />
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              placeholder="Cuéntanos cómo fue tu experiencia…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-xl border border-ec-mist px-3 py-2 text-sm resize-y"
              aria-label="Comentario de la reseña"
            />
            {formError && (
              <p className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2" role="alert">
                {formError}
              </p>
            )}
            {formSuccess && (
              <p className="rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2" role="status">
                {formSuccess}
              </p>
            )}
            <button type="submit" disabled={submitting} className="btn-primary px-6 py-2.5 text-sm">
              {submitting ? 'Publicando…' : 'Publicar reseña'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default ReviewsSection;