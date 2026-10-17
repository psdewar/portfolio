import Image from "next/image";
import type { StoryParagraph, StoryPhoto } from "../data/story";

export function StoryPhotoFigure({ photo }: { photo: StoryPhoto }) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      sizes="(max-width: 639px) 100vw, 448px"
      loading="lazy"
      decoding="async"
      className="block w-full h-auto rounded-xl"
    />
  );
}

export function StoryBlock({
  text,
  photo,
}: {
  text: string;
  photo?: StoryPhoto;
}) {
  return (
    <div className="space-y-4">
      <p>{text}</p>
      {photo && <StoryPhotoFigure photo={photo} />}
    </div>
  );
}

export default function StoryParagraphs({ paragraphs }: { paragraphs: StoryParagraph[] }) {
  return (
    <>
      {paragraphs.map(({ text, photo }, i) => (
        <StoryBlock key={i} text={text} photo={photo} />
      ))}
    </>
  );
}
