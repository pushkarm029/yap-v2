interface LoadingStateProps {
  text?: string;
}

export default function LoadingState({ text = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <span className="ml-2 text-gray-500">{text}</span>
    </div>
  );
}
