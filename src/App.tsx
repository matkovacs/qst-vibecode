import { AppLayout } from "@diligentcorp/atlas-react-bundle";
import { Outlet, Route, Routes } from "react-router";
import "./styles.css";

import Navigation from "./Navigation.js";
import IndexPage from "./pages/IndexPage.js";
import BuilderPage from "./pages/BuilderPage.js";
import RespondPage from "./pages/RespondPage.js";
import ResultsPage from "./pages/ResultsPage.js";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppLayout navigation={<Navigation />}>
            <Outlet />
          </AppLayout>
        }
      >
        <Route index element={<IndexPage />} />
        <Route path="builder/new" element={<BuilderPage />} />
        <Route path="builder/:id" element={<BuilderPage />} />
        <Route path="respond/:id" element={<RespondPage />} />
        <Route path="results/:id" element={<ResultsPage />} />
      </Route>
    </Routes>
  );
}
