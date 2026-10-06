import Anthropic from "@anthropic-ai/sdk";

let c: Anthropic | null = null;
export const anthropic = () => (c ??= new Anthropic());

// 대량·저가 작업(후보 선별)과 사용자가 직접 요청한 상세 정리를 분리
export const CURATE_MODEL = "claude-haiku-4-5";
export const DETAIL_MODEL = "claude-sonnet-5-5";
