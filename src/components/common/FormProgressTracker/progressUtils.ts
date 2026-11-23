export type ProgressStepStatus =
  | 'complete'
  | 'partial'
  | 'pending'
  | 'error'
  | 'optional_empty'
  | 'optional_done';

export interface FormProgressStep {
  id: string;
  stepNumber?: string;
  label: string;
  status: ProgressStepStatus;
  detail: string;
  optional?: boolean;
  targetId?: string;
}

export interface FormProgressSummary {
  completedRequired: number;
  totalRequired: number;
  remainingRequired: number;
  percentage: number;
  isReady: boolean;
  hasErrors: boolean;
  errorCount: number;
  optionalCompleted: number;
  optionalTotal: number;
  nextPendingStep: FormProgressStep | null;
  pendingRequiredLabels: string[];
}

export const computeFormProgress = (
  steps: readonly FormProgressStep[]
): FormProgressSummary => {
  const requiredSteps = steps.filter((step) => !step.optional);
  const optionalSteps = steps.filter((step) => Boolean(step.optional));

  const totalRequired = requiredSteps.length;
  const completedRequired = requiredSteps.filter(
    (step) => step.status === 'complete'
  ).length;
  const remainingRequired = Math.max(0, totalRequired - completedRequired);

  const errorSteps = steps.filter((step) => step.status === 'error');
  const errorCount = errorSteps.length;
  const hasErrors = errorCount > 0;

  const percentage =
    totalRequired === 0
      ? 100
      : Math.round((completedRequired / totalRequired) * 100);

  const isReady = completedRequired === totalRequired && !hasErrors;

  const optionalTotal = optionalSteps.length;
  const optionalCompleted = optionalSteps.filter(
    (step) => step.status === 'optional_done' || step.status === 'complete'
  ).length;

  const incompleteRequired = requiredSteps.filter(
    (step) => step.status !== 'complete'
  );

  const nextPendingStep =
    errorSteps[0] ?? incompleteRequired[0] ?? null;

  const pendingRequiredLabels = incompleteRequired.map((step) => step.label);

  return {
    completedRequired,
    totalRequired,
    remainingRequired,
    percentage,
    isReady,
    hasErrors,
    errorCount,
    optionalCompleted,
    optionalTotal,
    nextPendingStep,
    pendingRequiredLabels,
  };
};
