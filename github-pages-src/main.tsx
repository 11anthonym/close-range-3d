import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CloseRangeGame from "../app/CloseRangeGame";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("Close Range could not find its game mount.");

createRoot(root).render(
  <StrictMode>
    <CloseRangeGame />
  </StrictMode>,
);
