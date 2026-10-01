import { useState, useCallback } from 'react';

export interface UseFormStepReturn {
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  resetStep: () => void;
}

/**
 * Level 3: Local UI State — Multi-step Wizard & Form Steps
 * Keeps multi-step progression encapsulated inside modals or checkout forms.
 */
export function useFormStep(totalSteps: number, initialStep: number = 1): UseFormStepReturn {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const resetStep = useCallback(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  return {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === totalSteps,
    resetStep,
  };
}
