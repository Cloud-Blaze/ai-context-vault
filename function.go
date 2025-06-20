package function

import (
	"embed"
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

type Prompt struct {
	ID                   string   `json:"id"`
	MatchedCategory      bool     `json:"MatchedCategory"`
	MatchedSubcategory   bool     `json:"MatchedSubcategory"`
	MatchedSystemMessage bool     `json:"MatchedSystemMessage"`
	Category             string   `json:"category"`
	Subcategory          string   `json:"subcategory"`
	SystemMessage        string   `json:"system_message"`
	Keywords             []string `json:"keywords"`
	Topic                string   `json:"topic"`
}

type PromptQ struct {
	ID string `json:"id"`
	Q  string `json:"Q"`
}

var (
	promptsCache  []Prompt
	promptsCacheQ []PromptQ
	cacheLoaded   bool
)

//go:embed roles/*.json
var embeddedFiles embed.FS

//go:embed questions/*.json
var embeddedFilesQuestions embed.FS

func loadPrompts() error {
	files, err := embeddedFiles.ReadDir("roles")
	if err != nil {
		return err
	}
	var allPrompts []Prompt
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		data, err := embeddedFiles.ReadFile("roles/" + file.Name())
		if err != nil {
			log.Printf("Failed to read embedded file %s: %v", file.Name(), err)
			continue
		}
		var prompts []Prompt
		if err := json.Unmarshal(data, &prompts); err != nil {
			log.Printf("Failed to parse embedded file %s: %v", file.Name(), err)
			continue
		}
		allPrompts = append(allPrompts, prompts...)
	}
	promptsCache = allPrompts
	log.Printf("Loaded %d prompts from embedded JSON files", len(promptsCache))
	return nil
}

func loadPromptsQ() error {
	files, err := embeddedFilesQuestions.ReadDir("questions")
	if err != nil {
		return err
	}
	var allPrompts []PromptQ
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		data, err := embeddedFilesQuestions.ReadFile("questions/" + file.Name())
		if err != nil {
			log.Printf("Failed to read embedded file %s: %v", file.Name(), err)
			continue
		}
		var prompts []PromptQ
		if err := json.Unmarshal(data, &prompts); err != nil {
			log.Printf("Failed to parse embedded file %s: %v", file.Name(), err)
			continue
		}
		allPrompts = append(allPrompts, prompts...)
	}
	promptsCacheQ = allPrompts
	log.Printf("Loaded %d prompts from embedded JSON files", len(promptsCacheQ))
	return nil
}

// HTTP entrypoint
func SearchPrompts(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := loadPrompts(); err != nil {
		http.Error(w, "Failed to load prompts: "+err.Error(), 500)
		return
	}
	if err := loadPromptsQ(); err != nil {
		http.Error(w, "Failed to load loadPromptsQ: "+err.Error(), 500)
		return
	}

	query := strings.ToLower(r.URL.Query().Get("q"))
	if query == "" {
		http.Error(w, "Missing query param 'q'", 400)
		return
	}

	trimmedQuery := strings.TrimSpace(query)
	if !strings.Contains(trimmedQuery, " ") {
		if err := loadPrompts(); err != nil {
			http.Error(w, "Failed to load prompts: "+err.Error(), 500)
			return
		}
		if err := loadPromptsQ(); err != nil {
			http.Error(w, "Failed to load loadPromptsQ: "+err.Error(), 500)
			return
		}

		var results []Prompt
		for _, p := range promptsCache {
			if strings.Contains(strings.ToLower(p.Category), trimmedQuery) {
				p.MatchedCategory = true
			} else {
				p.MatchedCategory = false
			}
			if strings.Contains(strings.ToLower(p.Subcategory), trimmedQuery) {
				p.MatchedSubcategory = true
			} else {
				p.MatchedSubcategory = false
			}
			if strings.Contains(strings.ToLower(p.SystemMessage), trimmedQuery) {
				p.MatchedSystemMessage = true
			} else {
				p.MatchedSystemMessage = false
			}

			// Check if any keyword matches
			keywordMatch := false
			for _, keyword := range p.Keywords {
				if strings.Contains(strings.ToLower(keyword), trimmedQuery) {
					keywordMatch = true
					break
				}
			}

			if strings.Contains(strings.ToLower(p.Category), trimmedQuery) ||
				strings.Contains(strings.ToLower(p.Subcategory), trimmedQuery) ||
				strings.Contains(strings.ToLower(p.SystemMessage), trimmedQuery) ||
				keywordMatch {
				results = append(results, p)
			}
		}

		var resultsQ []PromptQ
		for _, p := range promptsCacheQ {
			if strings.Contains(strings.ToLower(p.Q), trimmedQuery) {
				resultsQ = append(resultsQ, p)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"results":  results,
			"resultsQ": resultsQ,
		})
	} else {
		// Query contains space: split and require all words in SystemMessage (AND logic)
		words := strings.Fields(trimmedQuery)
		var results []Prompt
		for _, p := range promptsCache {
			sysMsg := strings.ToLower(p.SystemMessage)
			allWordsPresent := true
			for _, word := range words {
				if !strings.Contains(sysMsg, word) {
					allWordsPresent = false
					break
				}
			}
			if allWordsPresent {
				p.MatchedSystemMessage = true
				results = append(results, p)
			} else {
				p.MatchedSystemMessage = false
			}
			// Still set category/subcategory matches for highlighting
			if strings.Contains(strings.ToLower(p.Category), trimmedQuery) {
				p.MatchedCategory = true
			} else {
				p.MatchedCategory = false
			}
			if strings.Contains(strings.ToLower(p.Subcategory), trimmedQuery) {
				p.MatchedSubcategory = true
			} else {
				p.MatchedSubcategory = false
			}
		}

		var resultsQ []PromptQ
		for _, p := range promptsCacheQ {
			if strings.Contains(strings.ToLower(p.Q), trimmedQuery) {
				resultsQ = append(resultsQ, p)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"results":  results,
			"resultsQ": resultsQ,
		})
	}
}
