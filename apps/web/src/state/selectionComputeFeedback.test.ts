import { describe, expect, it, vi } from "vitest";
import { withSelectionMovingFeedback } from "@/state/selectionComputeFeedback";

describe("withSelectionMovingFeedback", () => {
  it("does not signal moving when work finishes before the delay", async () => {
    const onMoving = vi.fn();
    const onIdle = vi.fn();

    await withSelectionMovingFeedback(onMoving, onIdle, async () => "ok");

    expect(onMoving).not.toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("signals moving after 100ms and clears when work completes", async () => {
    const onMoving = vi.fn();
    const onIdle = vi.fn();

    await withSelectionMovingFeedback(onMoving, onIdle, async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return "done";
    });

    expect(onMoving).toHaveBeenCalledTimes(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });
});
