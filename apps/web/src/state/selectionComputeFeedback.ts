export const SELECTION_MOVING_DELAY_MS = 100;

export async function withSelectionMovingFeedback<T>(
  onMoving: () => void,
  onIdle: () => void,
  work: () => Promise<T>,
): Promise<T> {
  let movingShown = false;

  const timer = setTimeout(() => {
    movingShown = true;
    onMoving();
  }, SELECTION_MOVING_DELAY_MS);

  try {
    return await work();
  } finally {
    clearTimeout(timer);
    if (movingShown) {
      onIdle();
    }
  }
}
