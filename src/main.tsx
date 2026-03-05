import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";

import { AtlasThemeProvider } from "@diligentcorp/atlas-react-bundle";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AtlasThemeProvider tokenMode="atlas-light">
        <App />
      </AtlasThemeProvider>
    </HashRouter>
  </StrictMode>,
);
