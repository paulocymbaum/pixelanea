import {
  applyThemeToDocument,
  resolveTheme,
  useSessionStore,
} from "@/state/sessionStore";
import { useEffect } from "react";

export function useThemeBootstrap() {
  const theme = useSessionStore((s) => s.theme);

  useEffect(() => {
    applyThemeToDocument(resolveTheme(theme));
  }, [theme]);
}
