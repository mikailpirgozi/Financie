'use client';

import { Button } from '@finapp/ui';
import { Card, CardContent } from '@finapp/ui';

interface IncomeTemplate {
  id: string;
  name: string;
  default_amount: number | null;
  note: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
}

interface IncomeTemplateCardProps {
  template: IncomeTemplate;
  onQuickAdd: (template: IncomeTemplate) => void;
  onEdit: (template: IncomeTemplate) => void;
  onDelete: (template: IncomeTemplate) => void;
}

export function IncomeTemplateCard({
  template,
  onQuickAdd,
  onEdit,
  onDelete,
}: IncomeTemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{template.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {template.categories?.name}
            </p>
            {template.default_amount && (
              <p className="text-sm font-medium text-green-600 mt-1">
                {Number(template.default_amount).toFixed(2)} €
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              onClick={() => onQuickAdd(template)}
              className="text-xs h-7 px-2"
            >
              ➕ Pridať
            </Button>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(template)}
                className="text-xs h-6 px-1"
              >
                ✏️
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(template)}
                className="text-xs h-6 px-1 text-destructive hover:text-destructive"
              >
                🗑️
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

