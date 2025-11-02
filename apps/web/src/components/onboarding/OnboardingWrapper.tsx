'use client';

import { useState, useEffect } from 'react';
import { WelcomeFlow } from './WelcomeFlow';
import { generateSampleData } from '@/lib/sample-data';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';

interface OnboardingWrapperProps {
  householdId: string;
  children: React.ReactNode;
}

export function OnboardingWrapper({ householdId, children }: OnboardingWrapperProps): React.JSX.Element {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDataChoice, setShowDataChoice] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted to avoid hydration mismatch
    setIsMounted(true);
    
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('finapp_onboarding_completed');
    // Only show onboarding for new users (not in development)
    if (!hasCompletedOnboarding && process.env.NODE_ENV !== 'development') {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    setShowDataChoice(true);
  };

  const handleSkip = () => {
    localStorage.setItem('finapp_onboarding_completed', 'true');
    setShowWelcome(false);
    setShowDataChoice(false);
  };

  const handleGenerateSampleData = async () => {
    setIsGenerating(true);
    try {
      await generateSampleData(householdId);
      localStorage.setItem('finapp_onboarding_completed', 'true');
      setShowDataChoice(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to generate sample data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCleanStart = () => {
    localStorage.setItem('finapp_onboarding_completed', 'true');
    setShowDataChoice(false);
  };

  // Don't render modals until mounted to prevent hydration issues
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {showWelcome && (
        <WelcomeFlow onComplete={handleWelcomeComplete} onSkip={handleSkip} />
      )}

      {showDataChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Vytvorte si demo dáta</CardTitle>
              <CardDescription>
                Chcete začať s ukážkovými dátami alebo s čistou databázou?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={handleGenerateSampleData}
                  disabled={isGenerating}
                  className="border-2 border-primary rounded-lg p-6 text-left hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <div className="text-4xl mb-3">✨</div>
                  <div className="font-semibold text-lg mb-2">Demo dáta</div>
                  <p className="text-sm text-muted-foreground">
                    Vytvorí ukážkové úvery, výdavky, príjmy a majetok
                  </p>
                  {isGenerating && (
                    <div className="mt-3 text-sm text-primary">Generujem...</div>
                  )}
                </button>

                <button
                  onClick={handleCleanStart}
                  disabled={isGenerating}
                  className="border-2 rounded-lg p-6 text-left hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <div className="text-4xl mb-3">📝</div>
                  <div className="font-semibold text-lg mb-2">Čistý štart</div>
                  <p className="text-sm text-muted-foreground">
                    Začnite s prázdnou databázou a vytvorte si vlastné dáta
                  </p>
                </button>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="ghost" onClick={handleSkip}>
                  Preskočiť
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

