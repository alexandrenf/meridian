import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="mb-6">The page you are looking for doesn't exist.</p>
      <Link 
        href="/"
        className="underline text-primary hover:opacity-80"
      >
        Go back home
      </Link>
    </div>
  );
} 