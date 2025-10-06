import Image from "next/image";

interface ProjectHeaderProps {
  title: string;
  tagline: string;
  coverUrl: string;
  location: string;
  category?: string;
}

export function ProjectHeader({
  title,
  tagline,
  coverUrl,
  location,
  category,
}: ProjectHeaderProps) {
  return (
    <div className="lg:col-span-2">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
      <p className="text-gray-600 dark:text-white mb-6">{tagline}</p>

      {/* Project Image */}
      <div className="relative bg-gradient-to-br from-yellow-100 to-green-100 rounded-lg overflow-hidden mb-6">
        <div className="aspect-video rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 w-full h-full">
            <Image
              src="/images/home/sunglasses.jpg"
              alt={title}
              width={640}
              height={360}
              className="object-cover"
              priority
            />
            <Image
              src={coverUrl}
              alt={title}
              width={640}
              height={360}
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
        <div className="flex items-center gap-1">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3
              -3 1.343-3 3 1.343 3 3 3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 22s8-8.5 8-13a8 8 0 10-16 0c0 4.5 8 13 8 13z"
            />
          </svg>
          <span>{location}</span>
        </div>
        {category && (
          <div className="flex items-center gap-1">
            <span>•</span>
            <span>{category}</span>
          </div>
        )}
      </div>
    </div>
  );
}
