import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui";
import { copy } from "@/content/copy";

type ViewMenuProps = {
  showTechnicalInfo: boolean;
  onShowTechnicalInfoChange: (show: boolean) => void;
};

export function ViewMenu({
  showTechnicalInfo,
  onShowTechnicalInfoChange,
}: ViewMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="text-base">
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem
          checked={showTechnicalInfo}
          onCheckedChange={onShowTechnicalInfoChange}
          onSelect={(event) => event.preventDefault()}
        >
          {copy.viewMenuShowTechnicalInfo}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
