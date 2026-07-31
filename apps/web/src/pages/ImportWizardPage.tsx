import { PixelateWizard } from "@/components/import/PixelateWizard";
import { useThemeBootstrap } from "@/shell/useThemeBootstrap";
import { TooltipProvider } from "@/components/ui";

type ImportWizardPageProps = {
  onComplete: () => void;
  onBack: () => void;
};

export function ImportWizardPage({ onComplete, onBack }: ImportWizardPageProps) {
  useThemeBootstrap();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-surface">
        <PixelateWizard onComplete={onComplete} onBack={onBack} />
      </div>
    </TooltipProvider>
  );
}
