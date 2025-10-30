'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@finapp/ui';
import { IncomesClient } from './IncomesClient';
import { IncomeTemplateCard } from '@/components/income-templates/IncomeTemplateCard';
import { QuickAddIncomeDialog } from '@/components/income-templates/QuickAddIncomeDialog';
import { ManageTemplatesDialog } from '@/components/income-templates/ManageTemplatesDialog';

interface Category {
  id: string;
  name: string;
}

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

interface Income {
  id: string;
  date: string;
  amount: number;
  source: string;
  note: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
}

interface IncomesPageClientProps {
  incomes: Income[];
  templates: IncomeTemplate[];
  categories: Category[];
  householdId: string;
  total: number;
}

export function IncomesPageClient({
  incomes,
  templates,
  categories,
  householdId,
  total,
}: IncomesPageClientProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<IncomeTemplate | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);

  const handleQuickAdd = (template: IncomeTemplate) => {
    setSelectedTemplate(template);
    setQuickAddOpen(true);
  };

  const handleEdit = (_template: IncomeTemplate) => {
    setManageTemplatesOpen(true);
  };

  const handleDelete = (_template: IncomeTemplate) => {
    // DeleteDialog handles the actual deletion
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Príjmy</h1>
          <p className="text-muted-foreground">Správa vašich príjmov</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageTemplatesOpen(true)}>
            ⚙️ Šablóny
          </Button>
          <Link href="/dashboard/incomes/new">
            <Button>➕ Nový príjem</Button>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Celkové príjmy</p>
              <p className="text-3xl font-bold">{total.toFixed(2)} €</p>
            </div>
            <div className="text-4xl">💵</div>
          </div>
        </CardContent>
      </Card>

      {/* Income Templates - Quick Add */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pravidelné príjmy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((template) => (
                <IncomeTemplateCard
                  key={template.id}
                  template={template}
                  onQuickAdd={handleQuickAdd}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incomes List */}
      {!incomes || incomes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💵</div>
            <h3 className="text-lg font-semibold mb-2">Žiadne príjmy</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatiaľ nemáte zaznamenané žiadne príjmy.
            </p>
            {templates.length > 0 ? (
              <p className="text-sm text-muted-foreground mb-4">
                Použite šablóny vyššie alebo pridajte nový príjem
              </p>
            ) : (
              <Link href="/dashboard/incomes/new">
                <Button>Pridať prvý príjem</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <IncomesClient incomes={incomes} />
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <QuickAddIncomeDialog
        template={selectedTemplate}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
      />

      <ManageTemplatesDialog
        open={manageTemplatesOpen}
        onOpenChange={setManageTemplatesOpen}
        householdId={householdId}
        categories={categories}
      />
    </div>
  );
}

