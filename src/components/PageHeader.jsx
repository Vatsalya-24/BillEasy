export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between px-6 md:px-8 py-6 border-b border-rule bg-paper">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-inkSoft mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
