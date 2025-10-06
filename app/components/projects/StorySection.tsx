interface StoryData {
  what: string;
  who: string;
  why: string;
  how: string;
}

interface StorySectionProps {
  story: StoryData;
  tagline?: string;
}

export function StorySection({ story, tagline }: StorySectionProps) {
  return (
    <section>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Story</h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">WHAT?</h3>
          <p className="text-gray-700 leading-relaxed">
            &ldquo;{story.what}&rdquo; {tagline && tagline}
          </p>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">WHO?</h3>
          <p className="text-gray-700 leading-relaxed">{story.who}</p>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">WHY?</h3>
          <p className="text-gray-700 leading-relaxed">{story.why}</p>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">HOW?</h3>
          <p className="text-gray-700 leading-relaxed">{story.how}</p>
        </div>
      </div>
    </section>
  );
}
