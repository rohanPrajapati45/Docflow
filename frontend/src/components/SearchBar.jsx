import { useState, useEffect, useRef } from "react";
import { searchFiles } from "../api/index.js";
import "./SearchBar.css";

const SearchBar = ({ onSearchResults }) => {
  const [query, setQuery] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (!query.trim()) {
        onSearchResults(null);
        return;
      }

      try {
        const { data } = await searchFiles(query.trim());
        onSearchResults(data);
      } catch {
        onSearchResults(null);
      }
    }, 500);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search files by name or category..."
      />
    </div>
  );
};

export default SearchBar;
