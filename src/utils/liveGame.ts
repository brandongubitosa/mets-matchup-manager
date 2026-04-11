import { MLB_TEAMS } from '../constants';
import type { GamePredictionRouteParams, LiveGame } from '../types';

/**
 * MLB schedule `codedGameState` is more reliable than `abstractGameState` alone
 * (e.g. games can be underway while some fields still read as Preview).
 */
export function isGameInProgress(game: LiveGame): boolean {
  const code = game.codedGameState;
  return game.status.abstractGameState === 'Live' || code === 'I' || code === 'DI';
}

export function isGameFinal(game: LiveGame): boolean {
  return game.status.abstractGameState === 'Final' || game.codedGameState === 'F';
}

export function isScoreboardStarted(game: LiveGame): boolean {
  return isGameInProgress(game) || isGameFinal(game);
}

/** Lower number sorts earlier: live, other, preview, final */
export function liveGameSortOrder(game: LiveGame): number {
  if (isGameInProgress(game)) return 0;
  const abs = game.status.abstractGameState;
  if (abs === 'Preview' || abs === 'Pre-Game') return 2;
  if (isGameFinal(game)) return 3;
  return 1;
}

export function buildGamePredictionRouteParams(
  game: LiveGame,
  highlightTeamId?: number
): GamePredictionRouteParams {
  const homeId = game.homeTeam.id;
  const awayId = game.awayTeam.id;
  const focusTeamId =
    highlightTeamId != null && (homeId === highlightTeamId || awayId === highlightTeamId)
      ? highlightTeamId
      : awayId;

  const isUserHome = focusTeamId === homeId;
  const opponentTeamId = isUserHome ? awayId : homeId;

  const teamName =
    MLB_TEAMS[focusTeamId]?.name ?? (isUserHome ? game.homeTeam.name : game.awayTeam.name);
  const opponentTeamName =
    MLB_TEAMS[opponentTeamId]?.name ?? (isUserHome ? game.awayTeam.name : game.homeTeam.name);

  const teamPitcherId = isUserHome    ? game.homeProbablePitcher?.id
    : game.awayProbablePitcher?.id;
  const opponentPitcherId = isUserHome
    ? game.awayProbablePitcher?.id
    : game.homeProbablePitcher?.id;

  return {
    teamId: focusTeamId,
    teamName,
    opponentTeamId,
    opponentTeamName,
    isHome: isUserHome,
    gameId: game.gamePk,
    teamPitcherId,
    opponentPitcherId,
  };
}
