import { CardHeader } from './Card.jsx';

export default function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className="h-[280px] w-full">{children}</div>
    </div>
  );
}
