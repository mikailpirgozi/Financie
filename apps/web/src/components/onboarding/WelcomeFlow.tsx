'use client';

import { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@finapp/ui';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface WelcomeFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    title: 'Vitajte v FinApp! 👋',
    description: 'Moderná aplikácia na správu osobných financií',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          FinApp vám pomôže sledovať a spravovať vaše financie na jednom mieste.
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <span>Správa úverov s automatickým harmonogramom splácania</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <span>Sledovanie výdavkov a príjmov</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <span>Evidencia majetku a jeho oceňovanie</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <span>Mesačné výkazy a štatistiky</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Úvery a splátky 💰',
    description: 'Kompletná správa úverov',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Vytvárajte úvery s automatickým generovaním splátkového kalendára.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="font-medium">Podporované typy úverov:</div>
          <ul className="space-y-1 text-sm">
            <li>• <strong>Anuita</strong> - rovnaké splátky každý mesiac</li>
            <li>• <strong>Fixná istina</strong> - konštantná istina, klesajúci úrok</li>
            <li>• <strong>Interest-only</strong> - len úroky + balón na konci</li>
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">
          Sledujte predčasné splatenie, penalizácie a simulujte rôzne scenáre.
        </p>
      </div>
    ),
  },
  {
    title: 'Výdavky a príjmy 💸',
    description: 'Automatická kategorizácia',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Zaznamenávajte výdavky a príjmy s automatickou kategorizáciou.
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="font-medium">Funkcie:</div>
          <ul className="space-y-1 text-sm">
            <li>• Vlastné kategórie a podkategórie</li>
            <li>• Pravidlá pre automatickú kategorizáciu</li>
            <li>• Mesačné sumáre a štatistiky</li>
            <li>• Export do CSV a PDF</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: 'Začnite teraz! 🚀',
    description: 'Vytvorte si demo dáta alebo začnite od nuly',
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Odporúčame vytvoriť demo dáta, aby ste sa mohli oboznámiť s aplikáciou.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border rounded-lg p-4 space-y-2">
            <div className="font-medium">✨ Demo dáta</div>
            <p className="text-sm text-muted-foreground">
              Vytvorí ukážkové úvery, výdavky a príjmy
            </p>
          </div>
          <div className="border rounded-lg p-4 space-y-2">
            <div className="font-medium">📝 Čistý štart</div>
            <p className="text-sm text-muted-foreground">
              Začnite s prázdnou databázou
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export function WelcomeFlow({ onComplete, onSkip }: WelcomeFlowProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              Krok {currentStep + 1} z {steps.length}
            </div>
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Preskočiť
            </button>
          </div>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step.content}
          
          {/* Progress indicator */}
          <div className="flex gap-2 mt-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Späť
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Dokončiť' : 'Ďalej'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

