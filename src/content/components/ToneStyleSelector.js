import React, { useState, useEffect } from "react";
import { injectTextIntoTextarea, findActiveTextarea } from "../inject";

const tones = [
  "Authoritative/Commanding",
  "Clinical (Precise, devoid of emotion)",
  "Cold/Detached",
  "Confident/Assured",
  "Cynical/Skeptical",
  "Emotional (Rich with feelings)",
  "Empathetic/Understanding",
  "Formal/Respectful",
  "Friendly (Warm, inviting, approachable)",
  "Humorous/Light-hearted",
  "Informal (Conversational, perfect for blogs)",
  "Ironic (Contrasting what's said, for creative twists)",
  "Optimistic/Hopeful",
  "Pessimistic/Doubtful",
  "Playful (Fun, content needs a dash of whimsy)",
  "Sarcastic (Witty, yet cutting)",
  "Serious (Grave, topics of importance)",
  "Sympathetic/Compassionate",
  "Tentative (exploring uncertainties)",
];

const styles = [
  "Academic/Scholarly",
  "Analytical/Logical",
  "Argumentative/Debating",
  "Conversational/Relaxed",
  "Creative/Artistic",
  "Descriptive",
  "Epigrammatic (Brief, pointed, and witty)",
  "Epistolary (Letter-like, personal, and direct)",
  "Expository (Explanatory, clarifying concepts or ideas)",
  "Informative/Educational",
  "Instructive (providing step-by-step guidance)",
  "Journalistic (focusing on the who, what, where...)",
  "Metaphorical (symbols and comparisons->meanings)",
  "Narrative/Storytelling",
  "Persuasive/Convincing",
  "Poetic/Rhythmic and expressive",
  "Satirical (Critiquing through humor and irony)",
];

export default function ToneStyleSelector({ onClose }) {
  const [tone, setTone] = useState("");
  const [style, setStyle] = useState("");

  useEffect(() => {
    // Load saved preferences
    chrome.storage.local.get(["ctx_tone", "ctx_style"], (result) => {
      if (result.ctx_tone) setTone(result.ctx_tone);
      if (result.ctx_style) setStyle(result.ctx_style);
    });
  }, []);

  const handleToneChange = (e) => {
    const newTone = e.target.value;
    setTone(newTone);
    chrome.storage.local.set({ ctx_tone: newTone });
  };

  const handleStyleChange = (e) => {
    const newStyle = e.target.value;
    setStyle(newStyle);
    chrome.storage.local.set({ ctx_style: newStyle });
  };

  const handleSetTone = () => {
    if (tone && style) {
      const prompt = `Write in ${tone} tone and in a ${style} writing style.`;

      const textarea = findActiveTextarea();
      if (!textarea) {
        showConfirmationBubble("Could not find input area", "error");
        return;
      }

      // Get the current content
      let currentContent = "";
      if (textarea.tagName.toLowerCase() === "div") {
        // Handle contenteditable div
        currentContent = textarea.innerText;
      } else {
        // Standard textarea
        currentContent = textarea.value;
      }
      injectTextIntoTextarea(prompt + "\n\n" + currentContent, false);
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-[120px] p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-200">
          Tone and Style Helper
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
          ×
        </button>
      </div>

      <div className="flex flex-row gap-4 items-center">
        <select
          value={tone}
          onChange={handleToneChange}
          className="flex-1 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-gray-200"
        >
          <option value="">Select Tone</option>
          {tones.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={style}
          onChange={handleStyleChange}
          className="flex-1 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-gray-200"
        >
          <option value="">Select Style</option>
          {styles.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={handleSetTone}
          disabled={!tone || !style}
          className="px-4 py-1 bg-green-400 text-black rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap"
        >
          Set Tone
        </button>
      </div>
    </div>
  );
}
