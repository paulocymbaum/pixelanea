import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui";
import type { FileMenuEntry } from "./fileMenuItems";

type FileMenuProps = {
  items: FileMenuEntry[];
};

function renderEntry(entry: FileMenuEntry, key: string) {
  if (entry.type === "separator") {
    return <DropdownMenuSeparator key={key} />;
  }

  if (entry.type === "submenu") {
    return (
      <DropdownMenuSub key={key}>
        <DropdownMenuSubTrigger disabled={entry.disabled}>
          {entry.label}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {entry.items.map((item) => (
            <DropdownMenuItem
              key={item.label}
              disabled={item.disabled}
              onSelect={() => item.action()}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenuItem
      key={key}
      disabled={entry.disabled}
      onSelect={() => entry.action()}
    >
      {entry.label}
    </DropdownMenuItem>
  );
}

export function FileMenu({ items }: FileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="text-base">
          File
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items.map((item, index) => renderEntry(item, `${item.type}-${index}`))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
