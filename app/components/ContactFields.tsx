import { forwardRef } from "react";
import FormInput from "./FormInput";

type Variant = "neutral" | "gold";

interface ContactFieldsProps {
  email: string;
  name: string;
  phone: string;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  errors?: { email?: string; name?: string };
  variant?: Variant;
}

const ContactFields = forwardRef<HTMLInputElement, ContactFieldsProps>(
  ({ email, name, phone, onEmailChange, onNameChange, onPhoneChange, errors, variant = "neutral" }, ref) => {
    return (
      <>
        <FormInput
          ref={ref}
          type="email"
          placeholder="Email address *"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          error={errors?.email}
          variant={variant}
          enterKeyHint="next"
          autoComplete="email"
        />
        <FormInput
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          error={errors?.name}
          variant={variant}
          enterKeyHint="next"
          autoComplete="name"
        />
        <FormInput
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          variant={variant}
          enterKeyHint="done"
          autoComplete="tel"
        />
      </>
    );
  },
);

ContactFields.displayName = "ContactFields";

export default ContactFields;
