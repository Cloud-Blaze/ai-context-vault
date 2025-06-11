import React, { useState, useEffect } from "react";
import { injectTextIntoTextarea, showConfirmationBubble } from "../inject";

// Define the green color used in the Bookmarks button
const VAULT_GREEN = "bg-green-400 text-black"; // adjust if you use a different green
const VAULT_BG = "bg-[#23272f]"; // match the AI Context Vault background
const VAULT_BORDER = "border-[#23272f]";

const TopicNodeTree = ({ onClose }) => {
  const [topics, setTopics] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [topicData, setTopicData] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setCategoriesLoading(true);
        const extensionId = chrome.runtime.id;
        const response = await fetch(
          `chrome-extension://${extensionId}/topics.json`
        );
        if (!response.ok) throw new Error("Failed to fetch topics");
        const data = await response.json();
        setTopics(data);
      } catch (error) {
        console.error("Error fetching topics:", error);
        showConfirmationBubble("Failed to load topics", "error");
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchTopics();
  }, []);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setTopicData([]);
  };

  const handleSubcategoryClick = async (subcategory) => {
    setSelectedSubcategory(subcategory);
    setTopicsLoading(true);
    try {
      const response = await fetch(
        `https://aicontextvault.com/topics_by_slug/${topics[selectedCategory][subcategory].slug}.json`
      );
      if (!response.ok) throw new Error("Failed to fetch topic data");
      const data = await response.json();
      setTopicData(data);
    } catch (error) {
      console.error("Error fetching topic data:", error);
      showConfirmationBubble("Failed to load topic data", "error");
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleTopicClick = (topic) => {
    injectTextIntoTextarea(topic.system_message);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50"
      style={{ marginTop: "20px" }}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full max-w-4xl rounded-lg shadow-xl border ${VAULT_BORDER} bg-[#23272f]`}
        style={{ backgroundColor: "rgb(30, 30, 30)" }}
      >
        <div className="flex h-[600px]">
          {/* Categories Panel */}
          <div className={`w-1/3 border-r ${VAULT_BORDER} p-0 overflow-y-auto`}>
            <div
              className="sticky top-0 z-10 p-4"
              style={{ backgroundColor: "rgb(30, 30, 30)" }}
            >
              <h2 className="text-lg font-semibold text-gray-200">
                Categories
              </h2>
            </div>
            <div className="p-4 pt-0">
              {categoriesLoading ? (
                <div className="text-gray-400">Loading categories...</div>
              ) : (
                <div className="space-y-2">
                  {Object.keys(topics).map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors font-semibold ${
                        selectedCategory === category
                          ? "bg-green-400 text-black"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subcategories Panel */}
          <div className={`w-1/3 border-r ${VAULT_BORDER} p-0 overflow-y-auto`}>
            <div
              className="sticky top-0 z-10 p-4"
              style={{ backgroundColor: "rgb(30, 30, 30)" }}
            >
              <h2 className="text-lg font-semibold text-gray-200">
                Subcategories
              </h2>
            </div>
            <div className="p-4 pt-0">
              {selectedCategory ? (
                <div className="space-y-2">
                  {topics[selectedCategory] &&
                    Object.keys(topics[selectedCategory]).map((subcategory) => (
                      <button
                        key={subcategory}
                        onClick={() => handleSubcategoryClick(subcategory)}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors font-semibold ${
                          selectedSubcategory === subcategory
                            ? "bg-green-400 text-black"
                            : "text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {topics[selectedCategory][subcategory].name}
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-gray-400">Select a category</div>
              )}
            </div>
          </div>

          {/* Topics Panel */}
          <div className="w-1/3 p-0 overflow-y-auto">
            <div
              className="sticky top-0 z-10 p-4"
              style={{ backgroundColor: "rgb(30, 30, 30)" }}
            >
              <h2 className="text-lg font-semibold text-gray-200">
                Role Topics
              </h2>
            </div>
            <div className="p-4 pt-0">
              {topicsLoading ? (
                <div className="text-gray-400">Loading topics...</div>
              ) : topicData && topicData.length > 0 ? (
                <div className="space-y-2">
                  {topicData.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicClick(topic)}
                      className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      {topic.topic}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">Select a subcategory</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicNodeTree;
