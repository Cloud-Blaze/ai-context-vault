import React, { useState, useEffect } from "react";
import { injectTextIntoTextarea, showConfirmationBubble } from "../inject";
import {
  saveLastTopicSelection,
  getLastTopicSelection,
  addVisitedTopic,
  getVisitedTopics,
  addVisitedCategory,
  getVisitedCategories,
  addVisitedSubcategory,
  getVisitedSubcategories,
  getTemplate,
} from "../../storage/contextStorage";

const VAULT_BORDER = "border-[#23272f]";

const TopicNodeTree = ({ onClose }) => {
  const [topics, setTopics] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [topicData, setTopicData] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [visitedTopics, setVisitedTopics] = useState([]);
  const [visitedCategories, setVisitedCategories] = useState([]);
  const [visitedSubcategories, setVisitedSubcategories] = useState([]);
  const [businessQuestionsTemplate, setBusinessQuestionsTemplate] =
    useState("");
  const [roleLearningTemplate, setRoleLearningTemplate] = useState("");

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setCategoriesLoading(true);
        const extensionId = chrome.runtime.id;
        // Fetch both files
        const [response1, response2] = await Promise.all([
          fetch(`chrome-extension://${extensionId}/topics.json`),
          fetch(`chrome-extension://${extensionId}/questions.json`),
        ]);
        if (!response1.ok) throw new Error("Failed to fetch topics.json");
        if (!response2.ok) throw new Error("Failed to fetch questions.json");
        const data1 = await response1.json();
        const data2 = await response2.json();

        // Merge logic
        const merged = { ...data1 };
        for (const [cat, subcats] of Object.entries(data2)) {
          if (merged[cat]) {
            // If category exists, merge arrays
            merged[cat] = [...merged[cat], ...subcats];
          } else {
            merged[cat] = subcats;
          }
        }

        // Sort categories and subcategories
        const sorted = {};
        Object.keys(merged)
          .sort((a, b) => a.localeCompare(b))
          .forEach((cat) => {
            sorted[cat] = Array.isArray(merged[cat])
              ? merged[cat]
                  .slice()
                  .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              : merged[cat];
          });

        setTopics(sorted);
      } catch (error) {
        console.error("Error fetching topics:", error);
        showConfirmationBubble("Failed to load topics", "error");
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchTopics();
  }, []);

  useEffect(() => {
    const loadPersisted = async () => {
      const last = await getLastTopicSelection();
      setSelectedCategory(last.category);
      setSelectedSubcategory(last.subcategory);
      const visited = await getVisitedTopics();
      setVisitedTopics(visited);
      const cats = await getVisitedCategories();
      setVisitedCategories(cats);
      const subs = await getVisitedSubcategories();
      setVisitedSubcategories(subs);
      // Load templates
      setBusinessQuestionsTemplate(
        await getTemplate("ctx_business_questions_template", "")
      );
      setRoleLearningTemplate(
        await getTemplate("ctx_role_learning_template", "")
      );
      // If both category and subcategory exist, try to load cached topic data
      if (last.category && last.subcategory) {
        chrome.storage.local.get(["topic_data_cache"], async (res) => {
          if (res.topic_data_cache && Array.isArray(res.topic_data_cache)) {
            setTopicData(res.topic_data_cache);
          } else {
            // fallback to fetch
            setTopicsLoading(true);
            try {
              const response = await fetch(
                `https://aicontextvault.com/topics_by_slug/${
                  topics[last.category][last.subcategory].slug
                }.json`
              );
              if (response.ok) {
                const data = await response.json();
                setTopicData(data);
                chrome.storage.local.set({ topic_data_cache: data });
              }
            } catch (error) {
              // ignore
            } finally {
              setTopicsLoading(false);
            }
          }
        });
      }
    };
    loadPersisted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setTopicData([]);
    lastTopicData = [];
    saveLastTopicSelection(category, null);
  };

  const handleSubcategoryClick = async (subcategory) => {
    setSelectedSubcategory(subcategory);
    setTopicsLoading(true);
    saveLastTopicSelection(selectedCategory, subcategory);
    try {
      if (
        topics[selectedCategory][subcategory].hasOwnProperty("categorySlug")
      ) {
        const response = await fetch(
          `https://aicontextvault.com/questions_by_slug/${topics[selectedCategory][subcategory].categorySlug}/${topics[selectedCategory][subcategory].slug}.json`
        );
        if (!response.ok) throw new Error("Failed to fetch topic data");
        const data = await response.json();
        setTopicData(data);
        chrome.storage.local.set({ topic_data_cache: [] });
      } else {
        const response = await fetch(
          `https://aicontextvault.com/topics_by_slug/${topics[selectedCategory][subcategory].slug}.json`
        );
        if (!response.ok) throw new Error("Failed to fetch topic data");
        const data = await response.json();
        setTopicData(data);
        chrome.storage.local.set({ topic_data_cache: data });
      }
    } catch (error) {
      console.error("Error fetching topic data:", error);
      showConfirmationBubble("Failed to load topic data", "error");
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleTopicClick = async (topic) => {
    if (topic.hasOwnProperty("Q")) {
      // If the topic is a question, we need to handle it differently
      injectTextIntoTextarea(
        "Here is my question I am curious about this topic of " +
          selectedCategory +
          ": " +
          topics[selectedCategory][selectedSubcategory].name +
          '\n"' +
          topic.Q +
          '"' +
          (businessQuestionsTemplate
            ? businessQuestionsTemplate
            : "\nI am building or optimizing an online business and I want to explore this question in depth.\nPlease treat this as a focused topic within the broader world of digital entrepreneurship. Start by briefly summarizing the key concepts, related strategies, and potential use cases. Then guide me through a structured response—offering practical advice, common pitfalls, proven methods, and any tools or frameworks worth using.\nYour response should be clear, actionable, and helpful whether I'm just starting out or scaling up. Teach me what I need to know to apply this insight today, and if helpful, suggest what I should ask next.")
      );
      setVisitedTopics([]);
    } else {
      injectTextIntoTextarea(
        topic.system_message +
          (roleLearningTemplate
            ? roleLearningTemplate
            : "\nLearning path: I want you to first summarize the key ideas and subtopics within this domain, then guide me through a structured exploration of its most important concepts, frameworks, terminology, controversies, and real-world applications.\nAsk me clarifying questions if needed, then help me master this subject as if you're my personal mentor—starting from the fundamentals but willing to go into advanced territory.\nPrioritize clarity, mental models, real-world analogies, and interactive back-and-forth.\nWhen relevant, break things into layers of depth (e.g., Level 1: Core Concepts → Level 2: Technical Methods → Level 3: Current Research Challenges).\nYour goal: make this knowledge stick. Engage me like I'm an ambitious but curious peer—not a passive student.")
      );
      await addVisitedTopic(topic.topic);
      setVisitedTopics((prev) =>
        prev.includes(topic.topic) ? prev : [...prev, topic.topic]
      );
    }
    // Mark subcategory and category as visited
    if (selectedCategory && selectedSubcategory) {
      await addVisitedCategory(selectedCategory);
      setVisitedCategories((prev) =>
        prev.includes(selectedCategory) ? prev : [...prev, selectedCategory]
      );
      await addVisitedSubcategory(selectedCategory, selectedSubcategory);
      const subKey = `${selectedCategory}|${selectedSubcategory}`;
      setVisitedSubcategories((prev) =>
        prev.includes(subKey) ? prev : [...prev, subKey]
      );
    }
    onClose();
  };

  // Helper to check if any topic in a subcategory is visited
  const isSubcategoryVisited = (category, subcategory) => {
    const subKey = `${category}|${subcategory}`;
    return visitedSubcategories.includes(subKey);
  };

  // Helper to check if any subcategory in a category is visited
  const isCategoryVisited = (category) => visitedCategories.includes(category);

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
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors font-semibold flex items-center${
                        selectedCategory === category
                          ? " bg-green-400 text-black"
                          : " text-gray-300 hover:bg-gray-700"
                      }`}
                      style={{ minHeight: "50px" }}
                    >
                      {isCategoryVisited(category) && (
                        <svg
                          className="mr-2 flex-shrink-0"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="10" cy="10" r="10" fill="#22c55e" />
                          <path
                            d="M6 10.5L9 13.5L14 8.5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
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
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors font-semibold flex items-center${
                          selectedSubcategory === subcategory
                            ? " bg-green-400 text-black"
                            : " text-gray-300 hover:bg-gray-700"
                        }`}
                        style={{ minHeight: "50px" }}
                      >
                        {isSubcategoryVisited(
                          selectedCategory,
                          subcategory
                        ) && (
                          <svg
                            className="mr-2 flex-shrink-0"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle cx="10" cy="10" r="10" fill="#22c55e" />
                            <path
                              d="M6 10.5L9 13.5L14 8.5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
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
              ) : topicData &&
                topicData.length > 0 &&
                topicData[0].hasOwnProperty("Q") ? (
                <div className="space-y-2">
                  {topicData.map((topic) => {
                    const isNumbered = /^\s*\d+\.\s/.test(topic.Q);
                    if (isNumbered) {
                      return (
                        <React.Fragment key={topic.Q}>
                          <hr className="border-gray-700 my-1" />
                          <div
                            className="w-full text-left px-3 py-2 rounded-md bg-gray-800 text-gray-400 flex items-center cursor-default select-none"
                            style={{ minHeight: "50px" }}
                          >
                            {topic.Q}
                          </div>
                          <hr className="border-gray-700 my-1" />
                        </React.Fragment>
                      );
                    }
                    return (
                      <button
                        key={topic.Q}
                        onClick={() => handleTopicClick(topic)}
                        className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center cursor-pointer"
                        style={{ minHeight: "50px" }}
                      >
                        {topic.Q}
                      </button>
                    );
                  })}
                </div>
              ) : topicData &&
                topicData.length > 0 &&
                topicData[0].hasOwnProperty("topic") ? (
                <div className="space-y-2">
                  {topicData
                    .slice()
                    .sort((a, b) => a.topic.localeCompare(b.topic))
                    .map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicClick(topic)}
                        className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center cursor-pointer"
                        style={{ minHeight: "50px" }}
                      >
                        {visitedTopics.includes(topic.topic) && (
                          <svg
                            className="mr-2 flex-shrink-0"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle cx="10" cy="10" r="10" fill="#22c55e" />
                            <path
                              d="M6 10.5L9 13.5L14 8.5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
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
