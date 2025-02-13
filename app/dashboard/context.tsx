import { createContext, useState } from "react";

export const useApp = (user: { id: string }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState<Record<string, string>>({});

  return { user, menuOpen, setMenuOpen, threadTitle, setThreadTitle };
};

export const AppContext = createContext({} as ReturnType<typeof useApp>);
