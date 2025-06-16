import React, { useState, useEffect, useRef, useCallback } from "react";
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
  getCustomPrompts,
  addCustomPrompt,
  deleteCustomPrompt,
  saveCustomPrompts,
} from "../../storage/contextStorage";

const VAULT_BORDER = "border-[#23272f]";

const TopicNodeTree = ({ onClose, onCloseCat }) => {
  const [topics, setTopics] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
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
  const [customPrompts, setCustomPrompts] = useState({});
  const [showAddPromptPopup, setShowAddPromptPopup] = useState(false);
  const [newPromptCategory, setNewPromptCategory] = useState("");
  const [newPromptSubcategory, setNewPromptSubcategory] = useState("");
  const [newPromptText, setNewPromptText] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [superCategories, setSuperCategories] = useState([]);
  const [selectedSuperCategory, setSelectedSuperCategory] = useState(null);
  const [superCategoryClicks, setSuperCategoryClicks] = useState({});

  // Add refs for the scrollable containers
  const categoriesRef = useRef(null);
  const subcategoriesRef = useRef(null);
  const topicsRef = useRef(null);
  const superCategoriesRef = useRef(null);

  // Add scroll position handlers
  const handleCategoriesScroll = () => {
    if (categoriesRef.current) {
      chrome.storage.local.set({
        ctx_categories_scroll: categoriesRef.current.scrollTop,
      });
    }
  };

  const handleSubcategoriesScroll = () => {
    if (subcategoriesRef.current) {
      chrome.storage.local.set({
        ctx_subcategories_scroll: subcategoriesRef.current.scrollTop,
      });
    }
  };

  const handleTopicsScroll = () => {
    if (topicsRef.current) {
      chrome.storage.local.set({
        ctx_topics_scroll: topicsRef.current.scrollTop,
      });
    }
  };

  // Add scroll position handler for super categories
  const handleSuperCategoriesScroll = () => {
    if (superCategoriesRef.current) {
      chrome.storage.local.set({
        ctx_supercategories_scroll: superCategoriesRef.current.scrollTop,
      });
    }
  };

  // Persist last selected super category
  useEffect(() => {
    if (selectedSuperCategory) {
      chrome.storage.local.set({
        ctx_last_super_category: selectedSuperCategory,
      });
    }
  }, [selectedSuperCategory]);

  // Add useEffect for scroll restoration and last super category
  useEffect(() => {
    const restoreScrollPositions = async () => {
      const { ctx_supercategories_scroll, ctx_last_super_category } =
        await chrome.storage.local.get([
          "ctx_supercategories_scroll",
          "ctx_last_super_category",
        ]);
      if (superCategoriesRef.current && ctx_supercategories_scroll) {
        superCategoriesRef.current.scrollTop = ctx_supercategories_scroll;
      }
      if (ctx_last_super_category) {
        setSelectedSuperCategory(ctx_last_super_category);
      }
    };
    restoreScrollPositions();
  }, []);

  // Load super categories and their click counts
  useEffect(() => {
    const loadSuperCategories = async () => {
      try {
        const extensionId = chrome.runtime.id;
        const response = await fetch(
          `chrome-extension://${extensionId}/supercategories.json`
        );
        console.log("Supercategories fetch response:", response);
        if (!response.ok)
          throw new Error("Failed to fetch supercategories.json");
        const data = await response.json();
        console.log("Supercategories data:", data);
        // Sort by click count ONLY on initial load
        const { super_category_clicks } = await chrome.storage.local.get(
          "super_category_clicks"
        );
        let sorted = data;
        if (super_category_clicks) {
          setSuperCategoryClicks(super_category_clicks);
          sorted = [...data].sort((a, b) => {
            const clicksA = super_category_clicks[a.name] || 0;
            const clicksB = super_category_clicks[b.name] || 0;
            return clicksB - clicksA;
          });
        }
        setSuperCategories(sorted);
      } catch (error) {
        console.error("Error loading super categories:", error);
      }
    };
    loadSuperCategories();
  }, []);

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
      // Load custom prompts
      const custom = await getCustomPrompts();
      setCustomPrompts(custom);
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
                `https://storage.googleapis.com/ai-context-vault/topics_by_slug/${
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

  // Merge custom prompts with regular topics (custom on top)
  const mergedTopics = React.useMemo(() => {
    const merged = { ...customPrompts };
    for (const [cat, subcats] of Object.entries(topics)) {
      if (merged[cat]) {
        // If category exists in both, merge arrays
        merged[cat] = [...merged[cat], ...subcats];
      } else {
        merged[cat] = subcats;
      }
    }
    return merged;
  }, [customPrompts, topics]);

  // Update all categories and subcategories for autocomplete (custom only)
  useEffect(() => {
    // Only use custom categories for the popup autocomplete
    const cats = Object.keys(customPrompts);
    setAllCategories(cats);

    if (newPromptCategory && customPrompts[newPromptCategory]) {
      const subs = customPrompts[newPromptCategory].map(
        (item) => item.name || item
      );
      setAllSubcategories(subs);
    } else {
      setAllSubcategories([]);
    }
  }, [customPrompts, newPromptCategory]);

  // Add debounced search function
  const debouncedSearch = useCallback((query) => {
    if (query.length < 3) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    fetch(
      `https://us-central1-cloud-blaze.cloudfunctions.net/SearchPrompts?q=${encodeURIComponent(
        query
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        setSearchResults(data);
        setIsSearching(false);
      })
      .catch((error) => {
        console.error("Search error:", error);
        setIsSearching(false);
      });
  }, []);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      debouncedSearch(query);
    }, 2000);

    setSearchTimeout(timeout);
  };

  // Clear search when category/subcategory is selected
  const handleCategoryClick = (category) => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setTopicData([]);
    saveLastTopicSelection(category, null);
  };

  const subcatArr = mergedTopics[selectedCategory] || [];
  const isCustomPrompt =
    subcatArr.length > 0 && subcatArr[0].hasOwnProperty("CustomQ");

  const handleSubcategoryClick = async (subcategory) => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedSubcategory(subcategory);
    setTopicsLoading(true);
    saveLastTopicSelection(selectedCategory, subcategory);

    // Check if this is a custom prompt
    const subcatArr = mergedTopics[selectedCategory] || [];
    if (subcatArr.length > 0 && subcatArr[0].hasOwnProperty("CustomQ")) {
      const data = [subcatArr[subcategory]];
      setTopicData(data);
      chrome.storage.local.set({ topic_data_cache: data });
      setTopicsLoading(false);
      return;
    }

    try {
      if (
        mergedTopics[selectedCategory][subcategory].hasOwnProperty(
          "categorySlug"
        )
      ) {
        const response = await fetch(
          `https://storage.googleapis.com/ai-context-vault/questions_by_slug/${mergedTopics[selectedCategory][subcategory].categorySlug}/${mergedTopics[selectedCategory][subcategory].slug}.json`
        );
        if (!response.ok) throw new Error("Failed to fetch topic data");
        const data = await response.json();
        setTopicData(data);
        chrome.storage.local.set({ topic_data_cache: data });
      } else {
        const response = await fetch(
          `https://storage.googleapis.com/ai-context-vault/topics_by_slug/${mergedTopics[selectedCategory][subcategory].slug}.json`
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
          " " +
          selectedSubcategory +
          '\n"' +
          topic.Q +
          (businessQuestionsTemplate
            ? businessQuestionsTemplate
            : "\"\nI am building or optimizing an online business and I want to explore this question in depth.\nPlease treat this as a focused topic within the broader world of digital entrepreneurship. Start by briefly summarizing the key concepts, related strategies, and potential use cases. Then guide me through a structured response—offering practical advice, common pitfalls, proven methods, and any tools or frameworks worth using.\nYour response should be clear, actionable, and helpful whether I'm just starting out or scaling up. Teach me what I need to know to apply this insight today, and if helpful, suggest what I should ask next.")
      );
      setVisitedTopics([]);
    } else if (topic.hasOwnProperty("CustomQ")) {
      // Custom prompt - inject only the prompt, no default text
      injectTextIntoTextarea(topic.CustomQ);
      await addVisitedTopic(topic.CustomQ);
      setVisitedTopics((prev) =>
        prev.includes(topic.CustomQ) ? prev : [...prev, topic.CustomQ]
      );
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

  const handleAddPrompt = () => {
    setNewPromptCategory("");
    setNewPromptSubcategory("");
    setNewPromptText("");
    setShowAddPromptPopup(true);
  };

  const handleEditPrompt = (category, subcategory) => {
    console.log("Editing prompt:", { category, subcategory });
    const subcatItem = mergedTopics[category][subcategory];
    console.log("Subcat item:", subcatItem);

    setNewPromptCategory(category);
    setNewPromptSubcategory(subcatItem.name || subcategory);
    setNewPromptText(subcatItem.CustomQ || "");
    setIsEditing(true);
    setEditingPromptId(subcatItem.name || subcategory);
    setShowAddPromptPopup(true);
  };

  const handleSaveCustomPrompt = async () => {
    if (!newPromptCategory || !newPromptSubcategory || !newPromptText) {
      alert("Please fill in all fields");
      return;
    }

    console.log("Saving prompt:", {
      isEditing,
      editingPromptId,
      newPromptCategory,
      newPromptSubcategory,
      newPromptText,
    });

    const customPrompts = await getCustomPrompts();
    console.log("Current custom prompts:", customPrompts);

    if (isEditing) {
      // If category changed, remove from old category first
      const oldCategory = selectedCategory;
      if (oldCategory !== newPromptCategory && customPrompts[oldCategory]) {
        customPrompts[oldCategory] = customPrompts[oldCategory].filter(
          (item) => item.name !== editingPromptId
        );
        // Remove empty category
        if (customPrompts[oldCategory].length === 0) {
          delete customPrompts[oldCategory];
        }
      }

      // Add to new category
      if (!customPrompts[newPromptCategory]) {
        customPrompts[newPromptCategory] = [];
      }

      // If same category, update existing
      if (oldCategory === newPromptCategory) {
        const index = customPrompts[newPromptCategory].findIndex(
          (item) => item.name === editingPromptId
        );
        if (index !== -1) {
          customPrompts[newPromptCategory][index] = {
            name: newPromptSubcategory,
            CustomQ: newPromptText,
          };
        }
      } else {
        // Add to new category
        customPrompts[newPromptCategory].push({
          name: newPromptSubcategory,
          CustomQ: newPromptText,
        });
      }
    } else {
      // Add new prompt
      if (!customPrompts[newPromptCategory]) {
        customPrompts[newPromptCategory] = [];
      }
      customPrompts[newPromptCategory].push({
        name: newPromptSubcategory,
        CustomQ: newPromptText,
      });
    }

    console.log("Updated custom prompts:", customPrompts);
    await saveCustomPrompts(customPrompts);
    const updated = await getCustomPrompts();
    console.log("Verified updated prompts:", updated);

    setCustomPrompts(updated);
    setShowAddPromptPopup(false);
    setIsEditing(false);
    setEditingPromptId(null);

    // If we just modified the currently selected category, refresh the topic data
    if (
      selectedCategory === newPromptCategory ||
      selectedCategory === oldCategory
    ) {
      setTopicData([]);
      chrome.storage.local.set({ topic_data_cache: [] });
    }
  };

  const getCustomPromptText = (category, subcategory) => {
    if (customPrompts[category]) {
      const item = customPrompts[category].find(
        (item) => item.name === subcategory
      );
      return item ? item.CustomQ : "";
    }
    return "";
  };

  const handleDeletePrompt = async (category, subcategory) => {
    // Get the actual subcategory name from the item
    const subcatItem = mergedTopics[category][subcategory];
    const subcategoryName = subcatItem.name || subcategory;

    await deleteCustomPrompt(category, subcategoryName);
    const updated = await getCustomPrompts();
    setCustomPrompts(updated);

    // Reset selection if we deleted the currently selected item
    if (selectedCategory === category && selectedSubcategory === subcategory) {
      setSelectedSubcategory(null);
      setTopicData([]);
    }
  };

  const truncateMessage = (message, maxLength = 300) => {
    if (!message) return "Inject Prompt";
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message;
  };

  // Handle super category click
  const handleSuperCategoryClick = (superCategory) => {
    setSelectedSuperCategory(superCategory);
    // Update click count
    const newClicks = {
      ...superCategoryClicks,
      [superCategory.name]: (superCategoryClicks[superCategory.name] || 0) + 1,
    };
    setSuperCategoryClicks(newClicks);
    chrome.storage.local.set({ super_category_clicks: newClicks });
    // Do NOT sort superCategories here, only on full refresh
  };

  // Add this constant for the All pill
  const ALL_SUPER_CATEGORY = {
    name: "All",
    icon: "⭐️",
    color: "#23272f", // dark grey
    includes: [],
  };

  // Filter topics based on selected super category
  const filteredTopics = React.useMemo(() => {
    if (!selectedSuperCategory || selectedSuperCategory.name === "All")
      return mergedTopics;
    const filtered = {};
    const includes = selectedSuperCategory.includes;
    for (const [cat, subcats] of Object.entries(mergedTopics)) {
      if (includes.includes(cat)) {
        filtered[cat] = subcats;
      }
    }
    return filtered;
  }, [mergedTopics, selectedSuperCategory]);

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
        <div className="flex flex-col h-[600px]">
          <div className="flex flex-1 flex-col w-full">
            {/* Super Categories Filter - now at the top of the columns, below headers */}
            <div
              ref={superCategoriesRef}
              onScroll={handleSuperCategoriesScroll}
              className="w-full z-20 overflow-x-auto overflow-y-hidden border-t border-b border-[#333]"
              style={{ height: "106px", backgroundColor: "rgb(30, 30, 30)" }}
            >
              <div className="flex flex-col h-full px-4">
                {/* Search Input */}
                <div className="flex items-center mt-2 mb-2 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search prompts..."
                    className="flex-grow px-4 py-2 bg-gray-800 border border-gray-600 rounded-full text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {isSearching ? (
                    <div className="ml-3" style={{ marginLeft: "22px" }}>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onCloseCat();
                      }}
                      className="ai-context-close text-2xl"
                      style={{ lineHeight: 1, marginLeft: "22px" }}
                    >
                      ×
                    </button>
                  )}
                </div>
                {/* Super Categories */}
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300 font-medium whitespace-nowrap">
                    Group:
                  </span>
                  {/* Show red X to clear filter if not All */}
                  {selectedSuperCategory &&
                    selectedSuperCategory.name !== "All" && (
                      <button
                        onClick={() =>
                          setSelectedSuperCategory(ALL_SUPER_CATEGORY)
                        }
                        className="ml-2 flex items-center justify-center p-1 rounded-full hover:bg-red-100 transition-colors"
                        title="Clear filter"
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="10" cy="10" r="10" fill="#ef4444" />
                          <path
                            d="M6 6L14 14M14 6L6 14"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    )}
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {/* All pill always first */}
                    <button
                      key={ALL_SUPER_CATEGORY.name}
                      onClick={() =>
                        setSelectedSuperCategory(ALL_SUPER_CATEGORY)
                      }
                      className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        !selectedSuperCategory ||
                        selectedSuperCategory.name === "All"
                          ? "bg-green-400 text-white"
                          : "hover:opacity-90"
                      }`}
                      style={{
                        backgroundColor:
                          !selectedSuperCategory ||
                          selectedSuperCategory.name === "All"
                            ? "#22c55e"
                            : ALL_SUPER_CATEGORY.color,
                        color:
                          !selectedSuperCategory ||
                          selectedSuperCategory.name === "All"
                            ? "#fff"
                            : "#fff",
                        minWidth: "fit-content",
                        marginLeft: 15,
                        marginTop: 3,
                      }}
                    >
                      <span
                        className="mr-1.5"
                        style={{ fontSize: "1.5em", lineHeight: 1 }}
                      >
                        {ALL_SUPER_CATEGORY.icon}
                      </span>
                      {ALL_SUPER_CATEGORY.name}
                    </button>
                    {/* Render the rest of the super categories */}
                    {superCategories.map((superCat) => {
                      const isSelected =
                        selectedSuperCategory?.name === superCat.name;
                      return (
                        <button
                          key={superCat.name}
                          onClick={() => handleSuperCategoryClick(superCat)}
                          className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            isSelected
                              ? "bg-green-400 text-white"
                              : "hover:opacity-90"
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? "#22c55e"
                              : superCat.color,
                            color: isSelected ? "#fff" : "#000",
                            minWidth: "fit-content",
                          }}
                        >
                          <span
                            className="mr-1.5"
                            style={{ fontSize: "1.5em", lineHeight: 1 }}
                          >
                            {superCat.icon}
                          </span>
                          {superCat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex overflow-y-auto" style={{ height: "496px" }}>
              {/* Categories Panel */}
              <div
                ref={categoriesRef}
                onScroll={handleCategoriesScroll}
                className={`w-1/3 border-r ${VAULT_BORDER} p-0 overflow-y-auto`}
              >
                <div
                  className="sticky top-0 z-10 p-4 flex justify-between items-center"
                  style={{ backgroundColor: "rgb(30, 30, 30)" }}
                >
                  <h2 className="text-lg font-semibold text-gray-200">
                    Categories
                  </h2>
                  <button
                    onClick={handleAddPrompt}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    Add Prompt
                  </button>
                </div>
                <div className="p-4 pt-0">
                  {categoriesLoading ? (
                    <div className="text-gray-400">Loading categories...</div>
                  ) : (
                    <div className="space-y-2">
                      {Object.keys(filteredTopics).map((category) => (
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
              <div
                ref={subcategoriesRef}
                onScroll={handleSubcategoriesScroll}
                className={`w-1/3 border-r ${VAULT_BORDER} p-0 overflow-y-auto`}
                style={{ height: "496px" }}
              >
                <div
                  className="sticky top-0 z-10 p-4"
                  style={{ backgroundColor: "rgb(30, 30, 30)" }}
                >
                  <h2 className="text-lg font-semibold text-gray-200">
                    {isCustomPrompt ? "Prompt Alias" : "Subcategories"}
                  </h2>
                </div>
                <div className="p-4 pt-0">
                  {selectedCategory ? (
                    <div className="space-y-2">
                      {mergedTopics[selectedCategory] &&
                        Object.keys(mergedTopics[selectedCategory]).map(
                          (subcategory) => (
                            <div
                              key={subcategory}
                              className="flex items-center justify-between gap-2"
                            >
                              <button
                                onClick={() =>
                                  handleSubcategoryClick(subcategory)
                                }
                                className={`flex-1 text-left px-3 py-2 rounded-md transition-colors font-semibold flex items-center${
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
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="10"
                                      fill="#22c55e"
                                    />
                                    <path
                                      d="M6 10.5L9 13.5L14 8.5"
                                      stroke="white"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                                {mergedTopics[selectedCategory][subcategory]
                                  .name || subcategory}
                              </button>
                              {isCustomPrompt && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPrompt(
                                        selectedCategory,
                                        subcategory
                                      );
                                    }}
                                    className="flex-shrink-0 p-2 text-blue-500 hover:text-blue-600"
                                    title="Edit prompt"
                                  >
                                    <button className="ai-context-button edit">
                                      ✎
                                    </button>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePrompt(
                                        selectedCategory,
                                        subcategory
                                      );
                                    }}
                                    className="flex-shrink-0 p-2 text-red-500 hover:text-red-600"
                                    title="Delete prompt"
                                  >
                                    <svg
                                      width="20"
                                      height="20"
                                      viewBox="0 0 20 20"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M15 5L5 15M5 5L15 15"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        )}
                    </div>
                  ) : (
                    <div className="text-gray-400">Select a category</div>
                  )}
                </div>
              </div>
              {/* Topics Panel */}
              {!searchResults ? (
                <div
                  ref={topicsRef}
                  onScroll={handleTopicsScroll}
                  className="w-1/3 p-0 overflow-y-auto"
                  style={{ height: "496px" }}
                >
                  <div
                    className="sticky top-0 z-10 p-4"
                    style={{ backgroundColor: "rgb(30, 30, 30)" }}
                  >
                    <h2 className="text-lg font-semibold text-gray-200">
                      Inject Prompt
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
                                  style={{ minHeight: "150px" }}
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
                              className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center cursor-pointer border-2 border-[#ebebeb]"
                              style={{
                                minHeight: "50px",
                                border: "2px solid #ebebeb",
                                borderWidth: "2px",
                                borderStyle: "solid",
                                borderColor: "#ebebeb",
                              }}
                            >
                              {topic.Q}
                            </button>
                          );
                        })}
                      </div>
                    ) : topicData &&
                      topicData.length > 0 &&
                      topicData[0].topic ? (
                      <div className="space-y-2">
                        {topicData
                          .slice()
                          .sort((a, b) => a.topic.localeCompare(b.topic))
                          .map((topic) => {
                            console.error("Topic:", topic.topic);
                            return (
                              <button
                                key={topic.id}
                                onClick={() => handleTopicClick(topic)}
                                className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center cursor-pointer border-2 border-[#ebebeb]"
                                style={{
                                  minHeight: "90px",
                                  border: "2px solid #ebebeb",
                                  borderWidth: "2px",
                                  borderStyle: "solid",
                                  borderColor: "#ebebeb",
                                }}
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
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="10"
                                      fill="#22c55e"
                                    />
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
                            );
                          })}
                      </div>
                    ) : topicData && topicData.length > 0 ? (
                      <div className="space-y-2">
                        {topicData.map((topic) => {
                          return (
                            <button
                              key={topic.CustomQ}
                              onClick={() => handleTopicClick(topic)}
                              className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center cursor-pointer border-2 border-[#ebebeb]"
                              style={{
                                minHeight: "50px",
                                border: "2px solid #ebebeb",
                                borderWidth: "2px",
                                borderStyle: "solid",
                                borderColor: "#ebebeb",
                              }}
                            >
                              {topic.hasOwnProperty("CustomQ") &&
                              topic.CustomQ.length > 0
                                ? truncateMessage(topic.CustomQ)
                                : truncateMessage(topic.system_message)}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400">Select a subcategory</div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Topics Panel Search */}
              {searchResults ? (
                <div
                  ref={topicsRef}
                  onScroll={handleTopicsScroll}
                  className="w-1/3 p-0 overflow-y-auto"
                  style={{ height: "496px" }}
                >
                  <div
                    className="sticky top-0 z-10 p-4"
                    style={{ backgroundColor: "rgb(30, 30, 30)" }}
                  >
                    <h2 className="text-lg font-semibold text-gray-200">
                      {searchResults ? "Search Results" : "Inject Prompt"}
                    </h2>
                  </div>
                  <div className="p-4 pt-0">
                    {searchResults ? (
                      <div className="space-y-2">
                        {searchResults.resultsQ &&
                          searchResults.resultsQ.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleTopicClick({ Q: result.Q })}
                              className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center cursor-pointer border-2 border-[#ebebeb]"
                              style={{
                                minHeight: "50px",
                                border: "2px solid #ebebeb",
                                borderWidth: "2px",
                                borderStyle: "solid",
                                borderColor: "#ebebeb",
                              }}
                            >
                              {result.Q}
                            </button>
                          ))}
                        {searchResults.results &&
                          searchResults.results.map((topic) => (
                            <button
                              key={topic.id}
                              onClick={() => handleTopicClick(topic)}
                              className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center cursor-pointer border-2 border-[#ebebeb]"
                              style={{
                                minHeight: "50px",
                                border: "2px solid #ebebeb",
                                borderWidth: "2px",
                                borderStyle: "solid",
                                borderColor: "#ebebeb",
                              }}
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
                                  <circle
                                    cx="10"
                                    cy="10"
                                    r="10"
                                    fill="#22c55e"
                                  />
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
                    ) : topicsLoading ? (
                      <div className="text-gray-400">Loading topics...</div>
                    ) : topicData &&
                      topicData.length > 0 &&
                      topicData[0].topic ? (
                      <div className="space-y-2">
                        {topicData
                          .slice()
                          .sort((a, b) => a.topic.localeCompare(b.topic))
                          .map((topic) => {
                            return (
                              <button
                                key={topic.id}
                                onClick={() => handleTopicClick(topic)}
                                className="w-full text-left px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors flex items-center cursor-pointer border-2 border-[#ebebeb]"
                                style={{
                                  minHeight: "90px",
                                  border: "2px solid #ebebeb",
                                  borderWidth: "2px",
                                  borderStyle: "solid",
                                  borderColor: "#ebebeb",
                                }}
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
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="10"
                                      fill="#22c55e"
                                    />
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
                            );
                          })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Add Prompt Popup */}
      {showAddPromptPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => {
              setShowAddPromptPopup(false);
              setIsEditing(false);
              setEditingPromptId(null);
            }}
          />
          <div
            className="relative bg-[#23272f] rounded-lg shadow-xl border border-gray-700 p-6 w-full max-w-2xl"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <h3 className="text-lg font-semibold text-gray-200 mb-4">
              {isEditing ? "Edit Custom Prompt" : "Add Custom Prompt"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newPromptCategory}
                  onChange={(e) => setNewPromptCategory(e.target.value)}
                  placeholder="Enter or select category"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Prompt Alias
                </label>
                <input
                  type="text"
                  value={newPromptSubcategory}
                  onChange={(e) => setNewPromptSubcategory(e.target.value)}
                  placeholder="Enter subcategory name"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  list="subcategories-list"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Prompt
                </label>
                <textarea
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  placeholder="Enter your custom prompt..."
                  rows={8}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddPromptPopup(false);
                  setIsEditing(false);
                  setEditingPromptId(null);
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomPrompt}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {isEditing ? "Edit Changes" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicNodeTree;
