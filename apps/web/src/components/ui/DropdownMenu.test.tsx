import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./DropdownMenu";

describe("DropdownMenu", () => {
  it("renders menu items with accent-muted hover tokens when open", async () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost">
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>New</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const item = await screen.findByRole("menuitem", { name: "New" });
    expect(item.className).toContain("hover:bg-accent-muted");
    expect(item.className).toContain("text-primary");
  });

  it("supports disabled menu items", async () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost">
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled>Undo</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const item = await screen.findByRole("menuitem", { name: "Undo" });
    expect(item).toHaveAttribute("aria-disabled", "true");
  });
});
