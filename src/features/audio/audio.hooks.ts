import { playerStore } from './audio.lib.ts';

export function usePlayer() {
  return playerStore.use();
}
