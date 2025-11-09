'use client';
import { useSession } from 'next-auth/react';

const Session = () => {
  useSession({
    required: false, // Allow unauthenticated access - don't force login
  });
  return <></>;
};

export default Session;
