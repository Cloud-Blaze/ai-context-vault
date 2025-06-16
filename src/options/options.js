import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  gatherAllContextData,
  syncFullDataToGist,
  getTemplate,
  setTemplate,
  getProfiles,
  saveProfile,
  deleteProfile,
  setCurrentProfileSelected,
  getCurrentProfileSelected,
} from "../storage/contextStorage";
import { encryptPAT, decryptPAT } from "../services/patEncryption";

function OptionsPage() {
  const [pat, setPat] = useState("");
  const [gistUrl, setGistUrl] = useState("");
  const [, setNothing] = useState("");
  const [enableGodMode, setEnableGodMode] = useState(false);
  const [godModePat, setGodModePat] = useState("");
  const [godModeGistUrl, setGodModeGistUrl] = useState("");
  const [businessQuestionsTemplate, setBusinessQuestionsTemplate] = useState(
    "\nI am building or optimizing an online business and I want to explore this question in depth.\nPlease treat this as a focused topic within the broader world of digital entrepreneurship. Start by briefly summarizing the key concepts, related strategies, and potential use cases. Then guide me through a structured response—offering practical advice, common pitfalls, proven methods, and any tools or frameworks worth using.\nYour response should be clear, actionable, and helpful whether I'm just starting out or scaling up. Teach me what I need to know to apply this insight today, and if helpful, suggest what I should ask next."
  );
  const [roleLearningTemplate, setRoleLearningTemplate] = useState(
    "\nLearning path: I want you to first summarize the key ideas and subtopics within this domain, then guide me through a structured exploration of its most important concepts, frameworks, terminology, controversies, and real-world applications.\nAsk me clarifying questions if needed, then help me master this subject as if you're my personal mentor—starting from the fundamentals but willing to go into advanced territory.\nPrioritize clarity, mental models, real-world analogies, and interactive back-and-forth.\nWhen relevant, break things into layers of depth (e.g., Level 1: Core Concepts → Level 2: Technical Methods → Level 3: Current Research Challenges).\nYour goal: make this knowledge stick. Engage me like I'm an ambitious but curious peer—not a passive student."
  );
  const [contextInjectionTemplate, setContextInjectionTemplate] = useState(
    "\n\n📏EXECUTION PARAMETERS:\n- Full contextual compliance is a non-negotiable requirement\n\n- Deviation from established context is prohibited\n\n- Every response must be comprehensively informed by and aligned with this context\n\nCONTINUED INTERACTION:\n-Preserve and apply all previous contextual understanding\n-Integrate new input with existing knowledge\n-Respond comprehensively and contextually\n\n🆕NEW USER PROMPT ON "
  );
  const [profiles, setProfiles] = useState([]);
  const [selectedAlias, setSelectedAlias] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [profileAlias, setProfileAlias] = useState("");
  const [profilePrompt, setProfilePrompt] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [profileError, setProfileError] = useState("");

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

  useEffect(() => {
    (async () => {
      setBusinessQuestionsTemplate(
        await getTemplate(
          "ctx_business_questions_template",
          businessQuestionsTemplate
        )
      );
      setRoleLearningTemplate(
        await getTemplate("ctx_role_learning_template", roleLearningTemplate)
      );
      setContextInjectionTemplate(
        await getTemplate(
          "ctx_context_injection_template",
          contextInjectionTemplate
        )
      );
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const loaded = await getProfiles();
      setProfiles(loaded);
      const current = await getCurrentProfileSelected();
      setSelectedAlias(current || "");
    })();
  }, [showProfileModal]);

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

  const handleSelectProfile = async (alias) => {
    setSelectedAlias(alias);
    await setCurrentProfileSelected(alias);
  };

  const handleAddProfile = () => {
    setProfileAlias("");
    setProfilePrompt("");
    setEditingId(null);
    setModalMode("add");
    setShowProfileModal(true);
    setProfileError("");
  };

  const handleEditProfile = (profile) => {
    setProfileAlias(profile.alias);
    setProfilePrompt(profile.prompt);
    setEditingId(profile.id);
    setModalMode("edit");
    setShowProfileModal(true);
    setProfileError("");
  };

  const handleDeleteProfile = async (alias) => {
    await deleteProfile(alias);
    const loaded = await getProfiles();
    setProfiles(loaded);
    if (selectedAlias === alias) {
      setSelectedAlias("");
      await setCurrentProfileSelected("");
    }
  };

  const handleSaveProfile = async () => {
    if (!profileAlias.trim()) {
      setProfileError("Alias is required");
      return;
    }
    if (!profilePrompt.trim()) {
      setProfileError("Prompt is required");
      return;
    }
    try {
      await saveProfile({
        id: editingId || Date.now().toString(),
        alias: profileAlias.trim(),
        prompt: profilePrompt.trim(),
      });
      setShowProfileModal(false);
      setProfileError("");
      const loaded = await getProfiles();
      setProfiles(loaded);
    } catch (e) {
      setProfileError(e.message);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <style>{`
        input[type="text"], input[type="password"], textarea {
          font-size: 16px !important;
        }
      `}</style>
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
      <button onClick={() => saveGistURL(gistUrl)} className="button">
        Save Gist URL
      </button>

      <hr />

      <h2>God Mode Settings (Alpha)</h2>
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

      <div style={{ marginTop: 30 }}>
        <h2>Business Questions Template Prompt</h2>
        <textarea
          value={businessQuestionsTemplate}
          onChange={(e) => setBusinessQuestionsTemplate(e.target.value)}
          rows={6}
          style={{ width: "100%", fontFamily: "monospace", marginBottom: 8 }}
        />
        <button
          className="button"
          onClick={() =>
            setTemplate(
              "ctx_business_questions_template",
              businessQuestionsTemplate
            )
          }
        >
          Save
        </button>
      </div>
      <div style={{ marginTop: 30 }}>
        <h2>Role Learning Template</h2>
        <textarea
          value={roleLearningTemplate}
          onChange={(e) => setRoleLearningTemplate(e.target.value)}
          rows={6}
          style={{ width: "100%", fontFamily: "monospace", marginBottom: 8 }}
        />
        <button
          className="button"
          onClick={() =>
            setTemplate("ctx_role_learning_template", roleLearningTemplate)
          }
        >
          Save
        </button>
      </div>
      <div style={{ marginTop: 30 }}>
        <h2>Context Injection Template</h2>
        <textarea
          value={contextInjectionTemplate}
          onChange={(e) => setContextInjectionTemplate(e.target.value)}
          rows={6}
          style={{ width: "100%", fontFamily: "monospace", marginBottom: 8 }}
        />
        <button
          className="button"
          onClick={() =>
            setTemplate(
              "ctx_context_injection_template",
              contextInjectionTemplate
            )
          }
        >
          Save
        </button>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-2">Profile Management</h2>
        <div className="mb-4 flex items-center justify-between">
          <span className="font-semibold">Profiles</span>
          <button className="button" onClick={handleAddProfile}>
            Add Profile
          </button>
        </div>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              checked={selectedAlias === ""}
              onChange={() => handleSelectProfile("")}
            />
            <span>No Profile</span>
          </label>
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`flex items-center space-x-2 border rounded-md px-3 py-2 ${
                selectedAlias === profile.alias
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                checked={selectedAlias === profile.alias}
                onChange={() => handleSelectProfile(profile.alias)}
              />
              <span className="font-semibold">{profile.alias}</span>
              <button
                className="ai-context-button edit"
                onClick={() => handleEditProfile(profile)}
                title="Edit"
              >
                ✎
              </button>
              <button
                className="ai-context-button delete"
                onClick={() => handleDeleteProfile(profile.alias)}
                title="Delete"
              >
                x
              </button>
            </div>
          ))}
        </div>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {modalMode === "add" ? "Add Profile" : "Edit Profile"}
              </h3>
              <div className="mb-4">
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ marginRight: 10 }}
                >
                  Alias
                </label>
                <input
                  type="text"
                  value={profileAlias}
                  onChange={(e) => setProfileAlias(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  style={{ width: 450, height: 46 }}
                  disabled={modalMode === "edit"}
                />
              </div>
              <div className="mb-4" style={{ marginTop: 15 }}>
                <label className="block text-sm font-medium mb-1">Prompt</label>
                <br />
                <br />
                <textarea
                  value={profilePrompt}
                  onChange={(e) => setProfilePrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={10}
                  style={{ width: 645 }}
                />
              </div>
              {profileError && (
                <div className="text-red-600 mb-2">{profileError}</div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 text-gray-600 hover:text-black"
                  onClick={() => setShowProfileModal(false)}
                  style={{ marginRight: 10 }}
                >
                  Cancel
                </button>
                <button className="button" onClick={handleSaveProfile}>
                  {modalMode === "add" ? "Add" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
        {selectedAlias && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <hr />
            <span className="font-semibold">
              Current Active Profile on all Prompts:
            </span>{" "}
            {selectedAlias}
          </div>
        )}
      </div>
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
