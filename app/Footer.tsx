import { Badge } from "./Badge";

export function Footer() {
  return (
    <footer className="antialiased max-w-2xl mb-8 flex flex-col md:flex-row mx-4 lg:mx-auto lg:bottom-20">
      <p className="flex-auto min-w-0 flex flex-col px-2 md:px-0">
        <span className="not-prose text-sm">
          {`Special thanks to `}
          <Badge href="https://twitter.com/@leeerob">
            <img src="/next-logo.svg" width="10" height="10" alt="Lee Robinson" className="!mr-1" />
            Lee Robinson
          </Badge>
          {` for the template inspiration.`}
        </span>
      </p>
    </footer>
  );
}
