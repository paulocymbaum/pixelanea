let cKeyHeld = false;

export function isCKeyHeld(): boolean {
  return cKeyHeld;
}

export function resetCKeyHeld(): void {
  cKeyHeld = false;
}

/** Track C key for Shift+C ellipse marquee while pointer is on canvas. */
export function bindSelectionModifierKeys(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.key.toLowerCase() === "c" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      cKeyHeld = true;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === "c") {
      cKeyHeld = false;
    }
  };

  const onBlur = () => {
    cKeyHeld = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    cKeyHeld = false;
  };
}
