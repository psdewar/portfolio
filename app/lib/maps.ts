"use client";

import { useEffect, useState } from "react";

export interface PlaceResult {
  venue: string;
  address: string;
  city: string;
  region: string;
  country: string;
}

export function useGoogleMaps(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as any;
    if (w.google?.maps?.places?.AutocompleteSuggestion) {
      setReady(true);
      return;
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) return;

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if ((window as any).google?.maps?.places?.AutocompleteSuggestion) {
          setReady(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&libraries=places&loading=async`;
    script.async = true;
    document.head.appendChild(script);
    const check = setInterval(() => {
      if ((window as any).google?.maps?.places?.AutocompleteSuggestion) {
        setReady(true);
        clearInterval(check);
      }
    }, 100);
    return () => clearInterval(check);
  }, []);

  return ready;
}

export function createAutocomplete(
  container: HTMLElement,
  onSelect: (place: PlaceResult) => void,
  inputClassName?: string,
) {
  const google = (window as any).google;

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";

  const existingInput = container.querySelector("input");
  const hadFocus = existingInput === document.activeElement;
  const previousValue = existingInput?.value || "";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Magdalene Carney Institute, West Palm Beach, FL";
  input.value = previousValue;
  if (inputClassName) input.className = inputClassName;

  const list = document.createElement("ul");
  list.className =
    "absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg py-1 hidden";

  wrapper.appendChild(input);
  wrapper.appendChild(list);

  while (container.firstChild) container.removeChild(container.firstChild);
  container.appendChild(wrapper);

  if (hadFocus) input.focus();

  let debounceTimer: ReturnType<typeof setTimeout>;
  let suggestions: any[] = [];
  let requestId = 0;
  let sessionToken = new google.maps.places.AutocompleteSessionToken();

  const renderSuggestions = () => {
    list.replaceChildren();
    if (suggestions.length === 0) {
      list.classList.add("hidden");
      return;
    }
    list.classList.remove("hidden");
    for (const s of suggestions) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300";
      btn.textContent = s.placePrediction.text.text;
      btn.addEventListener("mousedown", async (e) => {
        e.preventDefault();
        const place = s.placePrediction.toPlace();
        await place.fetchFields({
          fields: ["displayName", "addressComponents"],
          sessionToken,
        });

        sessionToken = new google.maps.places.AutocompleteSessionToken();

        const result: PlaceResult = {
          venue: place.displayName || "",
          address: "",
          city: "",
          region: "",
          country: "",
        };

        if (place.addressComponents) {
          let streetNumber = "";
          let route = "";
          for (const c of place.addressComponents) {
            if (c.types.includes("street_number")) streetNumber = c.longText;
            else if (c.types.includes("route")) route = c.longText;
            else if (c.types.includes("locality") || c.types.includes("sublocality_level_1"))
              result.city = c.longText;
            else if (c.types.includes("administrative_area_level_1")) result.region = c.shortText;
            else if (c.types.includes("country")) result.country = c.shortText;
          }
          result.address = [streetNumber, route].filter(Boolean).join(" ");
        }

        input.value = "";
        suggestions = [];
        renderSuggestions();
        onSelect(result);
      });
      li.appendChild(btn);
      list.appendChild(li);
    }
  };

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (query.length < 2) {
      suggestions = [];
      renderSuggestions();
      return;
    }
    const thisRequest = ++requestId;
    debounceTimer = setTimeout(async () => {
      try {
        const response =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken,
          });
        if (thisRequest !== requestId) return;
        suggestions = response.suggestions || [];
      } catch {
        if (thisRequest !== requestId) return;
        suggestions = [];
      }
      renderSuggestions();
    }, 250);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      suggestions = [];
      renderSuggestions();
    }, 200);
  });

  return input;
}
