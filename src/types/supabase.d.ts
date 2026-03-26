import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      avatar_url: string | null;
    }
  }
}

declare module '@supabase/supabase-js' {
  interface User {
    id: string;
    email: string;
    user_metadata: {
      username?: string;
      avatar_url?: string;
    }
  }
}