"use client";

import { useEffect } from "react";
import { useSunLights } from "../hooks/useSunLights";

const KEY = "scheme";
const boot = `try{var s=localStorage.getItem("${KEY}");if(s){document.documentElement.dataset.scheme=s;document.documentElement.style.colorScheme=s}}catch(e){}`;

export default function SunScheme() {
  const lights = useSunLights();

  useEffect(() => {
    if (!lights) return;
    const scheme = lights === "off" ? "light" : "dark";
    const html = document.documentElement;
    html.dataset.scheme = scheme;
    html.style.colorScheme = scheme;
    try {
      localStorage.setItem(KEY, scheme);
    } catch {}
  }, [lights]);

  useEffect(() => {
    return () => {
      const html = document.documentElement;
      delete html.dataset.scheme;
      html.style.colorScheme = "";
    };
  }, []);

  return <script dangerouslySetInnerHTML={{ __html: boot }} />;
}
