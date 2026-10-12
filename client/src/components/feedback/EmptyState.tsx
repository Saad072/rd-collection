import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: { label: string; to: string };
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-10 px-6">
      <h3 className="text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted mb-6">{message}</p>
      {action && (
        <Link to={action.to} className="btn">
          {action.label}
        </Link>
      )}
    </div>
  );
}
