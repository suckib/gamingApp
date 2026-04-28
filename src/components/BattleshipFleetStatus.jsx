export default function BattleshipFleetStatus({ ships, label }) {
  return (
    <div className="rounded-lg border border-panel-700 bg-panel-900 p-3">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-copy-300">
        {label}
      </h3>
      <ul className="space-y-1 text-xs">
        {ships.map(s => (
          <li
            key={s.type}
            className={[
              'flex items-center justify-between gap-2',
              s.sunk ? 'text-rose-400 line-through' : 'text-copy-100',
            ].join(' ')}
          >
            <span className="capitalize">{s.type}</span>
            <span className="flex gap-0.5">
              {Array.from({ length: s.size }).map((_, i) => (
                <span
                  key={i}
                  className={[
                    'h-2 w-2 rounded-sm',
                    s.sunk ? 'bg-rose-500' : 'bg-brand-400/70',
                  ].join(' ')}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
