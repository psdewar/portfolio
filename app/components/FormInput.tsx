import { forwardRef } from "react";

type Variant = "neutral" | "gold";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  variant?: Variant;
}

const variantClasses: Record<Variant, { base: string; focus: string }> = {
  neutral: {
    base: "border-gray-200 dark:border-neutral-600",
    focus: "focus:border-neutral-900 dark:focus:border-neutral-100",
  },
  gold: {
    base: "border-neutral-200 dark:border-neutral-700",
    focus: "focus:border-[#d4a553] dark:focus:border-[#e8c474]",
  },
};

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, variant = "neutral", className, ...props }, ref) => {
    const v = variantClasses[variant];
    return (
      <div>
        <input
          ref={ref}
          className={`w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-5 text-sm sm:text-base md:text-2xl rounded-xl border-2 transition-colors bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none ${
            error ? "border-red-500 focus:border-red-500" : `${v.base} ${v.focus}`
          } ${className ?? ""}`}
          {...props}
        />
        {error && <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";

export default FormInput;
