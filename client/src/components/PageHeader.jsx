/**
 * Consistent page header: gradient icon tile + title/subtitle + right actions.
 */
export default function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-pop"
            aria-hidden="true"
          >
            <Icon size={21} />
          </span>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
