"use client";

import Image from "next/image";
import { useState } from "react";
import type { StoryParagraph, StoryPhoto } from "../data/story";

export function StoryPhotoFigure({ photo, eager }: { photo: StoryPhoto; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl">
      <Image
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true);
        }}
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes="(max-width: 639px) 100vw, 448px"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        placeholder={photo.blur ? "blur" : "empty"}
        blurDataURL={photo.blur}
        onLoad={() => setLoaded(true)}
        className={`block w-full h-auto transition-[filter,transform] duration-500 ease-out motion-reduce:transition-none ${
          loaded ? "blur-0 scale-100" : "blur-md scale-[1.03]"
        }`}
      />
    </div>
  );
}

export function StoryBlock({
  text,
  photo,
  eager,
}: {
  text: string;
  photo?: StoryPhoto;
  eager?: boolean;
}) {
  return (
    <div className="space-y-4">
      <p>{text}</p>
      {photo && <StoryPhotoFigure photo={photo} eager={eager} />}
    </div>
  );
}

export default function StoryParagraphs({
  paragraphs,
  eager,
}: {
  paragraphs: StoryParagraph[];
  eager?: boolean;
}) {
  return (
    <>
      {paragraphs.map(({ text, photo }, i) => (
        <StoryBlock key={i} text={text} photo={photo} eager={eager} />
      ))}
    </>
  );
}
