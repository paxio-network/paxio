'use strict';

/**
 * Movers repository stub — W-1.3.
 *
 * TODO M-L1-impl: replace with Postgres-backed implementation once
 * FA-01 (M-L1-impl) lands reputation + volume aggregates per agent.
 *
 * Cold-registry (no agents): getMoversForWindow returns empty candidates
 * (no gainers/losers), getPaeiHistory returns empty array.
 * Wiring relies on empty candidates to produce deterministic cold-state
 * movers response ({ gainers: [], losers: [], paeiHistory: [] }).
 *
 * Port interface matches `MoversRepo` from
 * products/07-intelligence/app/domain/movers.ts.
 */

/**
 * @param {'1h'|'24h'|'7d'|'30d'} _window
 * @returns {Promise<{ candidates: Array<{ did: string; name: string; category: string; rep: number; repD: number; vol24: number; }> }>}
 */
const getMoversForWindow = async (_window) => ({
  candidates: [],
});

/**
 * @param {number} _daysBack
 * @returns {Promise<Array<{ t: number; v: number }>>}
 */
const getPaeiHistory = async (_daysBack) => [];

const moversRepoStub = Object.freeze({
  getMoversForWindow,
  getPaeiHistory,
});

module.exports = { moversRepoStub };