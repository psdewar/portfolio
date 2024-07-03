export type IdeaFormData = {
  name: string;
  email: string;
  pitch: string;
  appName?: string;
  requirements: string[];
  appType: { web: boolean; mobile: boolean };
  plan: string;
};
