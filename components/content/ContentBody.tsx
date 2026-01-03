import MentionText from '../posts/MentionText';
import ContentImage from './ContentImage';

interface ContentBodyProps {
  content: string;
  imageUrl?: string | null;
  contentClassName?: string;
  imageClassName?: string;
}

export default function ContentBody({
  content,
  imageUrl,
  contentClassName = 'text-gray-900',
  imageClassName = '',
}: ContentBodyProps) {
  return (
    <div className="mt-3 mb-2 overflow-x-hidden min-w-0">
      <div className={`text-sm sm:text-base leading-relaxed ${contentClassName}`}>
        <MentionText content={content} />
      </div>
      {imageUrl && <ContentImage imageUrl={imageUrl} alt="" className={imageClassName} />}
    </div>
  );
}
