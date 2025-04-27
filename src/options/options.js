import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  gatherAllContextData,
  syncFullDataToGist,
} from "../storage/contextStorage";
import { encryptPAT, decryptPAT } from "../services/patEncryption";

function OptionsPage() {
  const [pat, setPat] = useState("");
  const [gistUrl, setGistUrl] = useState("");
  const [, setNothing] = useState("");
  const [enableGodMode, setEnableGodMode] = useState(false);
  const [godModePat, setGodModePat] = useState("");
  const [godModeGistUrl, setGodModeGistUrl] = useState("");

  useEffect(() => {
    // Load both encrypted PAT and gistURL from chrome.storage.local
    chrome.storage.local.get(
      [
        "encryptedPAT",
        "gistURL",
        "godModeEnabled",
        "godModeEncryptedPAT",
        "godModeGistURL",
      ],
      async (res) => {
        if (res.encryptedPAT) {
          try {
            const decryptedPAT = await decryptPAT(res.encryptedPAT);
            setPat(decryptedPAT);
          } catch (error) {
            console.error("[AI Context Vault] Failed to decrypt PAT:", error);
          }
        }
        if (res.gistURL) setGistUrl(res.gistURL);
        if (res.godModeEnabled) setEnableGodMode(res.godModeEnabled);
        if (res.godModeEncryptedPAT) {
          try {
            const decryptedGodModePAT = await decryptPAT(
              res.godModeEncryptedPAT
            );
            setGodModePat(decryptedGodModePAT);
          } catch (error) {
            console.error(
              "[AI Context Vault] Failed to decrypt God Mode PAT:",
              error
            );
          }
        }
        if (res.godModeGistURL) setGodModeGistUrl(res.godModeGistURL);
      }
    );
  }, []);

  const handleManualPAT = async (pat) => {
    if (!pat || pat.length < 10) {
      alert("Please provide a valid PAT token");
      return;
    }

    try {
      const encryptedData = await encryptPAT(pat);
      chrome.storage.local.set({ encryptedPAT: encryptedData }, () => {
        console.log("[AI Context Vault] Saved encrypted GitHub PAT");
        alert("GitHub PAT saved!");
      });
    } catch (error) {
      console.error("[AI Context Vault] Failed to encrypt PAT:", error);
      alert("Failed to save PAT. Please try again.");
    }
  };

  const handleGodModeToggle = async (enabled) => {
    setEnableGodMode(enabled);
    chrome.storage.local.set({ godModeEnabled: enabled });

    if (enabled) {
      // When enabling God Mode, try to copy the main PAT if God Mode PAT doesn't exist
      chrome.storage.local.get(
        ["encryptedPAT", "godModeEncryptedPAT"],
        async (res) => {
          if (res.encryptedPAT && !res.godModeEncryptedPAT) {
            try {
              // Copy the already encrypted main PAT to God Mode
              chrome.storage.local.set(
                { godModeEncryptedPAT: res.encryptedPAT },
                () => {
                  console.log(
                    "[AI Context Vault] Copied main encrypted PAT to God Mode"
                  );
                  // Update the UI to show the PAT was copied
                  chrome.storage.local.get(["encryptedPAT"], async (res) => {
                    if (res.encryptedPAT) {
                      try {
                        const decryptedPAT = await decryptPAT(res.encryptedPAT);
                        setGodModePat(decryptedPAT);
                      } catch (error) {
                        console.error(
                          "[AI Context Vault] Failed to decrypt PAT for UI:",
                          error
                        );
                      }
                    }
                  });
                }
              );
            } catch (error) {
              console.error(
                "[AI Context Vault] Failed to copy main PAT to God Mode:",
                error
              );
            }
          }
        }
      );
    }
  };

  const handleGodModePAT = async (pat) => {
    if (!pat || pat.length < 10) {
      // If God Mode PAT is empty, try to use the main PAT
      chrome.storage.local.get(["encryptedPAT"], async (res) => {
        if (res.encryptedPAT) {
          try {
            // Use the already encrypted main PAT
            chrome.storage.local.set(
              { godModeEncryptedPAT: res.encryptedPAT },
              () => {
                console.log(
                  "[AI Context Vault] Using main encrypted PAT for God Mode"
                );
              }
            );
          } catch (error) {
            console.error(
              "[AI Context Vault] Failed to use main PAT for God Mode:",
              error
            );
          }
        } else {
          alert(
            "Please provide a valid God Mode PAT token or set up the main PAT first"
          );
        }
      });
      return;
    }

    try {
      const encryptedData = await encryptPAT(pat);
      chrome.storage.local.set({ godModeEncryptedPAT: encryptedData }, () => {
        console.log("[AI Context Vault] Saved encrypted God Mode GitHub PAT");
        alert("God Mode GitHub PAT saved!");
      });
    } catch (error) {
      console.error(
        "[AI Context Vault] Failed to encrypt God Mode PAT:",
        error
      );
      alert("Failed to save God Mode PAT. Please try again.");
    }
  };

  const handleGodModeGistUrl = (url) => {
    if (!url) {
      // If God Mode Gist URL is empty, try to use the main Gist URL
      chrome.storage.local.get(["gistURL"], (res) => {
        if (res.gistURL) {
          // Add a suffix to make it different from the main context Gist URL
          const godModeGistUrl = `${res.gistURL}-god-mode`;
          chrome.storage.local.set({ godModeGistURL: godModeGistUrl }, () => {
            console.log(
              "[AI Context Vault] Using modified main Gist URL for God Mode"
            );
            setGodModeGistUrl(godModeGistUrl);
          });
        } else {
          alert(
            "Please provide a valid Gist URL or set up the main Gist URL first"
          );
        }
      });
      return;
    }

    // Check if the URL is different from the main context Gist URL
    chrome.storage.local.get(["gistURL"], (res) => {
      if (res.gistURL && res.gistURL === url) {
        alert(
          "God Mode Gist URL must be different from the main context Gist URL"
        );
        return;
      }

      chrome.storage.local.set({ godModeGistURL: url }, () => {
        console.log("[AI Context Vault] Saved God Mode Gist URL");
      });
    });
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1>AI Context Vault - Options</h1>
      <hr />

      <h2>GitHub Gist Sync Context Settings</h2>
      <label htmlFor="pat">GitHub PAT:</label>
      <input
        id="pat"
        type="password"
        className="input"
        value={pat}
        onChange={(e) => setPat(e.target.value)}
        placeholder="Paste your GitHub Personal Access Token"
        style={{ width: 300, marginRight: 8 }}
      />
      <button className="button" onClick={() => handleManualPAT(pat)}>
        Save Token
      </button>

      <button
        onClick={() => createOrUpdateGist(setNothing)}
        className="button"
        style={{ marginLeft: 10 }}
      >
        Create/Update Gist
      </button>

      <hr />

      <h3>Use Existing Gist</h3>
      <input
        type="text"
        className="input"
        value={gistUrl}
        onChange={(e) => setGistUrl(e.target.value)}
        placeholder="https://gist.github.com/username/gistId"
        style={{ width: 400, marginRight: 8 }}
      />
      <button onClick={() => saveGistURL(gistUrl)}>Save Gist URL</button>

      <hr />

      <h2>God Mode Settings</h2>
      <div>
        <label>
          <input
            type="checkbox"
            id="enableGodMode"
            checked={enableGodMode}
            onChange={(e) => handleGodModeToggle(e.target.checked)}
          />
          Enable God Mode (Track potentially deleted requests and responses)
        </label>
      </div>

      {enableGodMode && (
        <div style={{ marginTop: 15 }}>
          <div style={{ marginBottom: 15 }}>
            <label htmlFor="godModePat">GitHub PAT for God Mode:</label>
            <input
              id="godModePat"
              type="password"
              className="input"
              value={godModePat}
              onChange={(e) => setGodModePat(e.target.value)}
              placeholder="Enter GitHub PAT for God Mode"
              style={{ width: 300, marginRight: 8 }}
            />
            <button
              className="button"
              onClick={() => handleGodModePAT(godModePat)}
            >
              Save God Mode Token
            </button>
            <button
              className="button"
              onClick={() => createOrUpdateGodModeGist(setNothing)}
              style={{ marginLeft: 10 }}
            >
              Create/Update God Mode Gist
            </button>
          </div>
          <div>
            <label htmlFor="godModeGistUrl">God Mode Gist URL:</label>
            <input
              id="godModeGistUrl"
              type="text"
              className="input"
              value={godModeGistUrl}
              onChange={(e) => setGodModeGistUrl(e.target.value)}
              placeholder="Enter Gist URL for God Mode (must be different from main context)"
              style={{ width: 400, marginRight: 8 }}
            />
            <button
              className="button"
              onClick={() => handleGodModeGistUrl(godModeGistUrl)}
            >
              Save God Mode Gist URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(<OptionsPage />);

////////////////////////////////////////////////////////////////////////////////
// GITHUB GIST SYNC - ADDED AT BOTTOM
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// GITHUB GIST SYNC - ADDED AT BOTTOM
////////////////////////////////////////////////////////////////////////////////

/**
 * (Optional) If you want to run any init code upon loading the options
 */
function initGitHubGistSyncUI() {
  chrome.storage.local.get(["githubToken"], (res) => {
    console.log(
      "[AI Context Vault] Current stored GitHub token:",
      res.githubToken
    );
  });
}

/**
 * Minimal function storing a GitHub token in local storage
 */
export function handleSaveGitHubToken(token) {
  chrome.storage.local.set({ githubToken: token }, () => {
    console.log("[AI Context Vault] GitHub token saved in local storage");
  });
}

export function handleCreateOrUpdateGist(gistData) {
  chrome.storage.local.get(["githubToken"], (res) => {
    if (!res.githubToken) {
      console.error("[AI Context Vault] No GitHub token found!");
      return;
    }
    const token = res.githubToken;
    // placeholder for gist logic
  });
}

/**
 * createOrUpdateGist
 * 1) If gistURL is set, do a PATCH to update that Gist
 * 2) Otherwise, do a POST to create a new Gist
 * 3) Always store the final gistURL in chrome.storage.local
 */
export async function createOrUpdateGist(callbackFunc) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["gistPAT", "gistURL"], async (res) => {
      const pat = res.gistPAT;
      let gistUrl = res.gistURL || "";
      if (!pat) {
        alert("No GitHub PAT found. Please provide one first.");
        return reject("No PAT");
      }

      // 1) Gather data from the new chrome.storage local approach
      const data = await gatherAllContextData();

      // 2) Build gist payload
      const gistPayload = {
        description: "AI Context Vault Sync",
        public: false,
        files: {
          "ai_context_vault_data.json": {
            content: JSON.stringify(data, null, 2),
          },
        },
      };

      try {
        let resp;
        if (gistUrl && gistUrl.includes("/")) {
          // Attempt an update
          // E.g. gistUrl = "https://gist.github.com/username/123abc"
          // We need to extract gistId ("123abc")
          const gistId = gistUrl.split("/").pop();
          resp = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: "PATCH",
            headers: {
              Authorization: `token ${pat}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(gistPayload),
          });
        } else {
          // If gistURL isn't set, create a brand-new gist
          resp = await fetch("https://api.github.com/gists", {
            method: "POST",
            headers: {
              Authorization: `token ${pat}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(gistPayload),
          });
        }

        if (!resp.ok) {
          const errData = await resp.json();
          console.error(
            "[AI Context Vault] Gist creation/update error:",
            errData
          );
          alert("Gist creation/update failed. Check console.");
          return reject(errData);
        } else {
          const gistInfo = await resp.json();
          console.log(
            "[AI Context Vault] Created/Updated Gist:",
            gistInfo.html_url
          );
          if (gistUrl && gistUrl.includes("/")) {
            alert("Gist updated successfully!");
          } else {
            alert("Gist created successfully!");
          }
          callbackFunc();

          // Always store the final gistURL
          chrome.storage.local.set({ gistURL: gistInfo.html_url }, () => {
            console.log("[AI Context Vault] Stored gistURL in local storage.");
          });

          resolve(gistInfo);
        }
      } catch (err) {
        console.error("[AI Context Vault] createOrUpdateGist error:", err);
        alert(`Error creating/updating gist: ${err.message}`);
        reject(err);
      }
    });
  });
}

export function saveGistURL(gistURL) {
  chrome.storage.local.set({ gistURL }, () => {
    console.log("[AI Context Vault] Saved Gist URL:", gistURL);
    alert(`Gist URL saved`);
    syncFullDataToGist();
  });
}

export async function loadGistURL() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["gistURL"], (res) => {
      resolve(res.gistURL || "");
    });
  });
}

export async function createOrUpdateGodModeGist(callbackFunc) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(
      ["godModeEncryptedPAT", "godModeGistURL"],
      async (res) => {
        const encryptedPat = res.godModeEncryptedPAT;
        let gistUrl = res.godModeGistURL || "";
        console.error("[AI Context Vault] Gist URL:", gistUrl);

        if (!encryptedPat) {
          console.error("[AI Context Vault] No God Mode PAT found in storage");
          alert("No God Mode GitHub PAT found. Please provide one first.");
          return reject("No PAT");
        }

        try {
          console.error("[AI Context Vault] Attempting to decrypt PAT...");
          const decryptedPat = await decryptPAT(encryptedPat);
          console.error(
            "[AI Context Vault] Decrypted PAT length:",
            decryptedPat?.length
          );
          console.error(
            "[AI Context Vault] Decrypted PAT first 10 chars:",
            decryptedPat?.substring(0, 10)
          );

          if (!decryptedPat) {
            console.error(
              "[AI Context Vault] Decryption returned null/undefined"
            );
            throw new Error("Failed to decrypt PAT");
          }

          // 1) Gather data from the new chrome.storage local approach
          const data = {};

          // Fetch God Mode logs
          const godModeLogs = localStorage.getItem("godModeLogs");
          if (godModeLogs) {
            data.godModeLogs = JSON.parse(godModeLogs);
          }

          // 2) Build gist payload
          const gistPayload = {
            description: "AI Context Vault God Mode Sync",
            public: false,
            files: {
              "ai_context_vault_god_mode_data.json": {
                content: JSON.stringify(data, null, 2),
              },
            },
          };

          let resp;
          if (gistUrl && gistUrl.includes("/")) {
            // Attempt an update
            const gistId = gistUrl.split("/").pop();
            console.error(
              "[AI Context Vault] Updating existing gist with ID:",
              gistId
            );
            console.error(
              "[AI Context Vault] Using Authorization header:",
              `token ${decryptedPat.substring(0, 10)}...`
            );
            resp = await fetch(`https://api.github.com/gists/${gistId}`, {
              method: "PATCH",
              headers: {
                Authorization: `token ${decryptedPat}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(gistPayload),
            });
            console.error(
              "[AI Context Vault] Update response status:",
              resp.status
            );
          } else {
            // Create a new gist
            console.error("[AI Context Vault] Creating new gist...");
            console.error(
              "[AI Context Vault] Using Authorization header:",
              `token ${decryptedPat.substring(0, 10)}...`
            );
            resp = await fetch("https://api.github.com/gists", {
              method: "POST",
              headers: {
                Authorization: `token ${decryptedPat}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(gistPayload),
            });
            console.error(
              "[AI Context Vault] Create response status:",
              resp.status
            );
          }

          if (!resp.ok) {
            const errData = await resp.json();
            console.error(
              "[AI Context Vault] GitHub API error:",
              JSON.stringify(errData, null, 2)
            );
            alert("God Mode Gist creation/update failed. Check console.");
            return reject(errData);
          } else {
            const gistInfo = await resp.json();
            console.error(
              "[AI Context Vault] Gist created/updated successfully:",
              JSON.stringify(gistInfo, null, 2)
            );
            if (gistUrl && gistUrl.includes("/")) {
              alert("God Mode Gist updated successfully!");
            } else {
              alert("God Mode Gist created successfully!");
            }
            callbackFunc();

            // Always store the final gistURL
            chrome.storage.local.set(
              { godModeGistURL: gistInfo.html_url },
              () => {
                console.error(
                  "[AI Context Vault] Stored God Mode gistURL:",
                  gistInfo.html_url
                );
              }
            );
            setGodModeGistUrl(gistInfo.html_url);

            resolve(gistInfo);
          }
        } catch (err) {
          console.error(
            "[AI Context Vault] createOrUpdateGodModeGist error:",
            err
          );
          console.error("[AI Context Vault] Error stack:", err.stack);
          alert(`Error creating/updating God Mode gist: ${err.message}`);
          reject(err);
        }
      }
    );
  });
}

initGitHubGistSyncUI();
