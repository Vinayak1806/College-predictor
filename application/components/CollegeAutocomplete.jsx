"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function CollegeAutocomplete({
  id,
  name,
  defaultValue = "",
  placeholder = "Type a college name or institute code",
  admissionRoute,
  selectionMode = "navigate",
  onSelect,
  onQueryChange,
  className = "",
  inputClassName = "",
  showIcon = true
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-suggestions`;
  const router = useRouter();
  const containerRef = useRef(null);
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchReady, setSearchReady] = useState(false);

  useEffect(() => {
    function closeSuggestions(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeSuggestions);
    return () => document.removeEventListener("pointerdown", closeSuggestions);
  }, []);

  useEffect(() => {
    if (!searchReady) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    const search = query.trim();
    if (search.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: search, pageSize: "8" });
        if (admissionRoute) params.set("route", admissionRoute);
        const response = await fetch(`/api/colleges?${params.toString()}`, {
          signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "College search failed");
        setSuggestions(data.data || []);
        setActiveIndex(-1);
        setOpen(true);
      } catch (error) {
        if (error.name !== "AbortError") setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [admissionRoute, query, searchReady]);

  function chooseCollege(college) {
    setQuery(college.name);
    setSearchReady(false);
    setOpen(false);
    onSelect?.(college);
    if (selectionMode === "navigate") {
      const routeQuery = admissionRoute ? `?route=${encodeURIComponent(admissionRoute)}` : "";
      router.push(`/colleges/${college.slug}${routeQuery}`);
    }
  }

  function handleKeyDown(event) {
    if (!open || !suggestions.length) {
      if (event.key === "ArrowDown" && suggestions.length) setOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      chooseCollege(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        {showIcon ? <Search aria-hidden="true" className="shrink-0 text-slate-400" size={20} /> : null}
        <input
          id={inputId}
          name={name}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-label="Search colleges"
          autoComplete="off"
          className={`min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-slate-400 ${inputClassName}`}
          placeholder={placeholder}
          role="combobox"
          value={query}
          onChange={(event) => {
            setSearchReady(true);
            setQuery(event.target.value);
            onQueryChange?.(event.target.value);
            setOpen(event.target.value.trim().length >= 2);
          }}
          onFocus={() => {
            if (searchReady && query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open ? (
        <div id={listId} className="menu-enter absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-line bg-white shadow-raised" role="listbox">
          {loading ? <p className="px-4 py-3 text-sm text-slate-500">Searching colleges...</p> : null}
          {!loading && suggestions.map((college, index) => (
            <button
              key={college.slug}
              aria-selected={activeIndex === index}
              className={`grid min-h-14 w-full gap-1 border-t border-line px-4 py-2.5 text-left first:border-t-0 ${
                activeIndex === index ? "bg-cyan-50" : "hover:bg-panel"
              }`}
              role="option"
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseCollege(college)}
            >
              <span className="text-sm font-semibold leading-5 text-ink">{college.name}</span>
              <span className="text-xs text-slate-500">
                {[college.instituteCode, college.city?.name].filter(Boolean).join(" | ")}
              </span>
            </button>
          ))}
          {!loading && !suggestions.length ? (
            <p className="px-4 py-3 text-sm text-slate-500">No matching college found.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
