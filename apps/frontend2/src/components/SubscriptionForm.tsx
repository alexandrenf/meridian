import { useState, useEffect } from 'react';
import { subscribeToNewsletter } from '@/utils/api';

const STORAGE_KEY = 'meridian_subscribed';

export default function SubscriptionForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);

  useEffect(() => {
    // Check subscription status
    const subscribed = localStorage.getItem(STORAGE_KEY) === 'true';
    setHasSubscribed(subscribed);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await subscribeToNewsletter(email);

      if (!response.success) {
        throw new Error(response.message || 'Failed to subscribe');
      }

      setEmail('');
      setHasSubscribed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (error) {
      alert('Something went wrong, please try again.');
      console.error('Subscription error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setHasSubscribed(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div>
      {!hasSubscribed ? (
        <div className="gap-2 text-sm flex flex-col items-center">
          <p>Want this brief in your inbox? Sign up for updates</p>
          <form onSubmit={handleSubmit} className="flex group max-w-md border border-zinc-300 mx-auto">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="your@email.com"
              required
              className="flex-grow px-4 py-2 focus:outline-zinc-400"
            />
            <button
              type="submit"
              className="bg-zinc-300 text-zinc-700 hover:cursor-pointer px-4 py-2 font-medium hover:bg-zinc-400 dark:hover:bg-zinc-400 transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Subscribe'}
            </button>
          </form>
        </div>
      ) : (
        <div className="text-center text-sm">
          <p>You're subscribed to our updates!</p>
          <button onClick={handleChangeEmail} className="underline mt-2 text-xs">
            Change email
          </button>
        </div>
      )}
    </div>
  );
} 