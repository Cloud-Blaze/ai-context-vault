import React from "react";
import { createRoot } from "react-dom/client";

function OptionsPage() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1>AI Context Vault - Options</h1>
      <p>
        This is where you can manage advanced settings, connect your GitHub Gist
        for sync, etc.
      </p>
      <hr />
      <div>
        <h2>Coming Soon</h2>
        <p>GitHub Gist Sync Settings</p>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(<OptionsPage />);
