/**
 * FallbackPlayer.tsx
 * * NOTE: Local audio fallback is disabled. 
 * The broadcast fallback (AutoDJ) is now handled server-side by AzuraCast.
 */

export const FallbackPlayer = () => {
  // We return null so no local audio element is rendered.
  // This prevents "ghost" tracks from playing in the background.
  return null;
};