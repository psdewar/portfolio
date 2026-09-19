export default function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-6">
      {title}
      {count !== undefined && (
        <span className="ml-2 text-base font-normal text-neutral-400 tabular-nums">{count}</span>
      )}
    </h2>
  );
}
