import { RulesManager } from '@/components/rules/RulesManager';

export default function RulesPage(): React.JSX.Element {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Categorization Rules</h1>
      <p className="text-gray-600 mb-6">
        Create rules to automatically categorize your expenses and incomes based on their
        descriptions.
      </p>
      <RulesManager />
    </div>
  );
}

