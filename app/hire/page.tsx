"use client";
import { IdeaFormData } from "../IdeaFormData";
import { processFormData } from "../actions";
import { ChangeEvent, useState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react";
import Image from "next/image";

export default function Page() {
  const initialInput = {
    name: "",
    email: "",
    pitch: "",
    appName: "",
    requirements: ["", "", ""],
    appType: { web: false, mobile: false },
    plan: "",
    pending: false,
    error: null as Error | null,
    success: "",
  };
  const [input, setInput] = useState(initialInput);
  const { pending, error, success, ...formDataInput } = input;
  const { name, email, pitch, appName, requirements, appType, plan }: IdeaFormData = formDataInput;

  const handleSetInput = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInput((prev) => {
      if (name.startsWith("requirement")) {
        const index = Number(name.split("-")[1]);
        const newRequirements = [...prev.requirements];
        newRequirements[index] = value;
        return { ...prev, requirements: newRequirements, error: null };
      } else {
        return { ...prev, [name]: value, error: null };
      }
    });
  };

  const handleSetOptions = (e: ChangeEvent<HTMLInputElement>) => {
    setInput((prev) => ({
      ...prev,
      appType: { ...appType, [e.target.name]: e.target.checked },
      error: null,
    }));
  };

  const handleSetTextArea = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput((prev) => ({ ...prev, [e.target.name]: e.target.value, error: null }));
  };

  const handleSubmit = async () => {
    try {
      if (!appType.web && !appType.mobile) {
        throw new Error("Please select at least one app type.");
      }
      if (plan.length < 50) {
        throw new Error("Please explain your plan more thoroughly.");
      }
      setInput((prev) => ({ ...prev, pending: true }));
      await processFormData(formDataInput);
      setInput({ ...initialInput, success: "Thanks! You'll hear from me soon." });
    } catch (e) {
      setInput((prev) => ({ ...prev, error: e as Error }));
    } finally {
      setInput((prev) => ({ ...prev, pending: false }));
    }
  };

  const inputClassName =
    "mt-1 block w-full py-2 px-3 rounded-md bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors sm:text-sm";

  return (
    <div className="flex justify-center mb-32 pt-8">
      <div className="max-w-5xl w-full px-4">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Image panel — hidden on mobile, shown on desktop */}
          <div className="hidden md:block md:w-[360px] flex-shrink-0">
            <div className="sticky top-24">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                {/* TODO: Replace with hire-specific photo */}
                <Image
                  src="/images/home/new-era-6.jpg"
                  alt="Peyt Spencer"
                  fill
                  className="object-cover"
                  sizes="360px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white/80 text-sm leading-relaxed">
                    Software engineer at Microsoft. Founder of Lyrist. I build
                    full-stack applications from idea to production.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form panel */}
          <div className="flex-1 min-w-0">
            <div className="mb-12">
              <h1 className="font-semibold text-3xl mb-4 text-gray-900 dark:text-white">Hire Peyt Spencer</h1>
              <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                I'm a software engineer at Microsoft and the founder of Lyrist, a
                songwriting app used by independent artists. I build full-stack
                applications with TypeScript, React, Next.js, Supabase, and
                Stripe — from idea to production. I also built my own live
                streaming infrastructure from scratch. If you have a product idea,
                I can help you ship it.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-2xl mb-1 text-gray-900 dark:text-white">
                Tell me more about your idea
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                I will respond to you within 48 hours
              </p>
              <form action={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className={inputClassName}
                    value={name}
                    onChange={handleSetInput}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className={inputClassName}
                    value={email}
                    onChange={handleSetInput}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pitch" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    Pitch your idea in 50 characters or less
                  </label>
                  <input
                    type="text"
                    name="pitch"
                    id="pitch"
                    className={inputClassName}
                    value={pitch}
                    onChange={handleSetInput}
                    maxLength={50}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="appName" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    App Name (optional)
                  </label>
                  <input
                    type="text"
                    name="appName"
                    id="appName"
                    className={inputClassName}
                    value={appName}
                    onChange={handleSetInput}
                  />
                </div>
                <h2 className="mt-8 font-medium text-xl pt-3 text-gray-900 dark:text-white">
                  What are the absolute minimum requirements for your product to be viable?
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  Format each requirement as "[intended audience] [intended action] [intended outcome]".
                  Requirement 1 should be your highest priority.
                </p>
                {requirements.map((req, index) => (
                  <div key={index}>
                    <label htmlFor={`requirement-${index}`} className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      Requirement {index + 1}
                    </label>
                    <input
                      type="text"
                      name={`requirement-${index}`}
                      id={`requirement-${index}`}
                      className={inputClassName}
                      value={requirements[index]}
                      onChange={handleSetInput}
                      required={index === 0}
                    />
                  </div>
                ))}
                <h2 className="mt-8 font-medium text-xl pt-3 text-gray-900 dark:text-white">App Type</h2>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <input
                      className="h-6 w-6 rounded-md accent-yellow-500"
                      type="checkbox"
                      name="web"
                      checked={appType.web}
                      onChange={handleSetOptions}
                    />
                    Web
                  </label>
                  <label className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <input
                      className="h-6 w-6 rounded-md accent-yellow-500"
                      type="checkbox"
                      name="mobile"
                      checked={appType.mobile}
                      onChange={handleSetOptions}
                    />
                    Mobile
                  </label>
                </div>
                <h2 className="mt-8 font-medium text-xl pt-3 text-gray-900 dark:text-white">
                  Describe at least one way you plan to reach customers.
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  Knowing who you want your customers to be
                  provides insights into prioritizing features and
                  helps define what success looks like for you.
                </p>
                <div>
                  <label htmlFor="plan" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    At least 50 characters
                  </label>
                  <textarea
                    name="plan"
                    id="plan"
                    className={inputClassName}
                    value={plan}
                    onChange={handleSetTextArea}
                    minLength={50}
                    rows={4}
                    required
                  />
                </div>
                <button
                  disabled={pending || !!error}
                  type="submit"
                  className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-black bg-yellow-500 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors"
                >
                  Submit
                </button>
                {error && (
                  <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <WarningCircle size={20} weight="fill" />
                    {error.message}
                  </p>
                )}
                {success && (
                  <p className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle size={20} weight="fill" />
                    {success}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
