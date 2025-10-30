import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      // Splash Screen Configuration
      backgroundUri: 'splash.png',
      buttonLabel: 'Launch App',
      description: '',
      heading: '', // Removed - text is in the splash image instead
      appIconUri: 'ocricon_adobe_reddit.png',
    },
    postData: {
      documentCount: 0,
    },
    subredditName: subredditName,
    title: 'Document Manager',
  });
};
