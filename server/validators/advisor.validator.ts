import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

export const advisorChatSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required")
    .max(100, "Too many messages"),
  portfolioId: z.string().optional(),
});

export type AdvisorChatInput = z.infer<typeof advisorChatSchema>;
