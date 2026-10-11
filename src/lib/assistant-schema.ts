import { z } from "zod";
export const liveCourseSchema = z.object({
  id: z.string().max(160),
  title: z.string().min(1).max(200),
  provider: z.string().max(100),
  url: z
    .string()
    .url()
    .refine((u) => {
      const v = new URL(u);
      return v.protocol === "https:" && !v.username && !v.password;
    }),
  source: z.string().url(),
  description: z.string().max(700),
  topics: z.array(z.string().max(80)).max(20),
  checkedAt: z.iso.datetime(),
});
export type LiveCourse = z.infer<typeof liveCourseSchema>;
export const assistantSchema = z
  .object({
    enabled: z.boolean().default(false),
    onboarded: z.boolean().default(false),
    dismissed: z.boolean().default(false),
    minutes: z.number().int().min(5).max(240).default(30),
    live: z.array(liveCourseSchema).max(60).default([]),
    searchedAt: z.string().default(""),
    searchGoal: z.string().max(160).default(""),
    searchStatus: z.string().max(500).default(""),
    excluded: z.array(z.string().max(300)).max(200).default([]),
  })
  .default({
    enabled: false,
    onboarded: false,
    dismissed: false,
    minutes: 30,
    live: [],
    searchedAt: "",
    searchGoal: "",
    searchStatus: "",
    excluded: [],
  });
export const emptyAssistant = () => assistantSchema.parse(undefined);
