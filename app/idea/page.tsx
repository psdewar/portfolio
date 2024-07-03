"use client";
import { IdeaFormData } from "app/IdeaFormData";
import { processFormData } from "app/actions";
import { ChangeEvent, useState } from "react";

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

  return (
    <section className="mb-40">
      <div className="prose-neutral dark:prose-invert">
        <h1 className="font-medium text-2xl mb-8">
          Apply for me to build your app
          <p className="text-base text-neutral-400">Expect my response within 48 hours</p>
        </h1>

        <form action={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Your Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={name}
              onChange={handleSetInput}
              required
            />
          </div>
          <div className="mt-4">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={email}
              onChange={handleSetInput}
              required
            />
          </div>
          <div className="mt-4">
            <label htmlFor="pitch" className="block text-sm font-medium">
              Pitch your idea in 50 characters or less
            </label>
            <input
              type="text"
              name="pitch"
              id="pitch"
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={pitch}
              onChange={handleSetInput}
              maxLength={50}
              required
            />
          </div>
          <div className="mt-4">
            <label htmlFor="appName" className="block text-sm font-medium">
              App Name (optional)
            </label>
            <input
              type="text"
              name="appName"
              id="appName"
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={appName}
              onChange={handleSetInput}
            />
          </div>
          <h2 className="mt-8 font-normal text-xl">
            What are the absolute minimum requirements for your product to be viable?
          </h2>
          <p className="mt-1">
            Format each requirement as “[intended audience] [intended action] [intended outcome]”.
            Requirement 1 should be your highest priority.
          </p>
          {requirements.map((req, index) => (
            <div key={index} className="mt-4">
              <label htmlFor={`requirement-${index}`} className="block text-sm font-medium">
                Requirement {index + 1}
              </label>
              <input
                type="text"
                name={`requirement-${index}`}
                id={`requirement-${index}`}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                value={requirements[index]}
                onChange={handleSetInput}
                required={index === 0}
              />
            </div>
          ))}
          <h2 className="mt-8 font-normal text-xl">App Type</h2>
          <div className="mt-4 flex flex-col gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                className="h-6 w-6 rounded-md accent-indigo-600"
                type="checkbox"
                name="web"
                checked={appType.web}
                onChange={handleSetOptions}
              />
              Web
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                className="h-6 w-6 rounded-md accent-indigo-600"
                type="checkbox"
                name="mobile"
                checked={appType.mobile}
                onChange={handleSetOptions}
              />
              Mobile
            </label>
          </div>
          <h2 className="mt-8 font-normal text-xl">
            Describe at least one way you plan to reach customers.
          </h2>
          <div className="mt-4">
            <label htmlFor="plan" className="block text-sm font-medium">
              At least 50 characters
            </label>
            <textarea
              name="plan"
              id="plan"
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
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
            className="my-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit
          </button>
          {error && <p>❌ {error.message}</p>}
          {success && <p>✅ {success}</p>}
        </form>
      </div>
    </section>
  );
}
