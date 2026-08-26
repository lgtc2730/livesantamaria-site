import { buildMarineRecommendationsResponse } from "../lib/marine/api-handler.mjs";

export function onRequestGet({ env }) {
  return buildMarineRecommendationsResponse({ marineControl: env?.MARINE_CONTROL });
}
