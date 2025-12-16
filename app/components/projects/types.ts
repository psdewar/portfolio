export interface TeamMember {
  name: string;
  role: string;
}

export interface WorkEmbed {
  title: string;
  url: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Update {
  id: string;
  date: string;
  title: string;
  body: string;
}

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  coverUrl: string;
  backers: number;
  daysLeft: number;
  location: string;
  category: string;
  goalCents: number;
  raisedCents: number;
  deadline: string | null;
  storyWhat: string;
  storyWho: string;
  storyWhy: string;
  storyHow: string;
  stretchGoalCents: number;
  team: TeamMember[];
  workEmbeds: WorkEmbed[];
  risks: string;
  faq: FAQ[];
  updates: Update[];
  venmoUrl: string;
  stripeCheckoutUrl: string;
}
