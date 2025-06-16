import React, { useState, useEffect } from "react";
import { injectTextIntoTextarea } from "../inject";

const tones = [
  "Authoritative",
  "Clinical",
  "Cold",
  "Confident",
  "Cynical",
  "Emotional",
  "Empathetic",
  "Formal",
  "Friendly",
  "Humorous",
  "Informal",
  "Ironic",
  "Optimistic",
  "Pessimistic",
  "Playful",
  "Sarcastic",
  "Serious",
  "Sympathetic",
  "Tentative",
];

const styles = [
  "Academic",
  "Analytical",
  "Argumentative",
  "Conversational",
  "Creative",
  "Descriptive",
  "Epigrammatic",
  "Epistolary",
  "Expository",
  "Informative",
  "Instructive",
  "Journalistic",
  "Metaphorical",
  "Narrative",
  "Persuasive",
  "Poetic",
  "Satirical",
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
      injectTextIntoTextarea(prompt, false);
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-[120px] p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-200">Tone and Style</h3>
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
