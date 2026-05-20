interface DecisionBadgeProps {
  decision: 'participar' | 'nao_participar' | 'analisar';
}

export default function DecisionBadge({ decision }: DecisionBadgeProps) {
  if (decision === 'participar') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
        ✓ Participar
      </span>
    );
  }
  if (decision === 'analisar') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
        ⏳ Analisar
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
      ✕ Não Participar
    </span>
  );
}
