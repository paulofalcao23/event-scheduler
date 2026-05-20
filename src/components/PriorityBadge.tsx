interface PriorityBadgeProps {
  priority: 'alta' | 'media' | 'baixa';
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (priority === 'alta') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
        Alta
      </span>
    );
  }
  if (priority === 'media') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
        Média
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
      Baixa
    </span>
  );
}
