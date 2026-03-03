"use client";

import { useEffect, useState } from "react";

export interface PlaceResult {
  venue: string;
  address: string;
  city: string;
  region: string;
  country: string;
}

export interface CityResult {
  city: string;
  region: string;
  country: string;
}

export function useGoogleMaps(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as any;
    if (w.google?.maps?.places?.PlaceAutocompleteElement) {
      setReady(true);
      return;
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) return;

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if ((window as any).google?.maps?.places?.PlaceAutocompleteElement) {
          setReady(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    script.async = true;
    document.head.appendChild(script);
    const check = setInterval(() => {
      if ((window as any).google?.maps?.places?.PlaceAutocompleteElement) {
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
) {
  const google = (window as any).google;
  const el = new google.maps.places.PlaceAutocompleteElement();
  el.style.width = "100%";

  el.addEventListener("gmp-select", async ({ placePrediction }: any) => {
    const place = placePrediction.toPlace();
    await place.fetchFields({ fields: ["displayName", "addressComponents"] });

    const result: PlaceResult = { venue: place.displayName || "", address: "", city: "", region: "", country: "" };

    if (place.addressComponents) {
      let streetNumber = "";
      let route = "";
      for (const c of place.addressComponents) {
        if (c.types.includes("street_number")) streetNumber = c.longText;
        else if (c.types.includes("route")) route = c.longText;
        else if (c.types.includes("locality") || c.types.includes("sublocality_level_1")) result.city = c.longText;
        else if (c.types.includes("administrative_area_level_1")) result.region = c.shortText;
        else if (c.types.includes("country")) result.country = c.shortText;
      }
      result.address = [streetNumber, route].filter(Boolean).join(" ");
    }

    onSelect(result);
  });

  while (container.firstChild) container.removeChild(container.firstChild);
  container.appendChild(el);
  return el;
}

export function createCityAutocomplete(
  container: HTMLElement,
  onSelect: (result: CityResult) => void,
) {
  const google = (window as any).google;
  const el = new google.maps.places.PlaceAutocompleteElement({
    types: ["locality", "administrative_area_level_3"],
  });
  el.style.width = "100%";

  el.addEventListener("gmp-select", async ({ placePrediction }: any) => {
    const place = placePrediction.toPlace();
    await place.fetchFields({ fields: ["addressComponents"] });

    const result: CityResult = { city: "", region: "", country: "" };

    if (place.addressComponents) {
      for (const c of place.addressComponents) {
        if (c.types.includes("locality") || c.types.includes("administrative_area_level_3")) result.city = c.longText;
        else if (c.types.includes("administrative_area_level_1")) result.region = c.shortText;
        else if (c.types.includes("country")) result.country = c.shortText;
      }
    }

    onSelect(result);
  });

  while (container.firstChild) container.removeChild(container.firstChild);
  container.appendChild(el);
  return el;
}
