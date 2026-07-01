import { z } from "zod";

export const initiateCallSchema = z.object({
  calleeId: z.string().min(1),
  callType: z.enum(["AUDIO", "VIDEO"]),
  offerSdp: z.string().min(1),
});

export const acceptCallSchema = z.object({
  answerSdp: z.string().min(1),
});

export const iceCandidatesSchema = z.object({
  candidates: z.array(z.object({}).passthrough()).min(1),
});
