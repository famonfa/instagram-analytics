import { NextRequest, NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/facebookSession";
import {
  FacebookGraphError,
  fetchInstagramMedia,
  fetchMediaInsights,
} from "@/lib/facebookGraph";

type PostSummary = {
  id: string;
  caption: string | undefined;
  media_type: string;
  media_url: string | undefined;
  thumbnail_url: string | undefined;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  insights: Record<string, number>;
};

type AnalysisResult = {
  model: string;
  summary: string;
  topPostId?: string;
};

const DEFAULT_MODEL = "gpt-4o-mini";

async function collectPostSummaries(session: Parameters<typeof fetchInstagramMedia>[0]) {
  const media = await fetchInstagramMedia(session, { limit: 50 });

  if (!media.length) {
    return [];
  }

  // Analyze all posts, not just top 5
  const enriched = await Promise.all(
    media.map(async (item) => {
      try {
        const insights = await fetchMediaInsights(
          session,
          item.id,
          item.media_type
        );

        return {
          id: item.id,
          caption: item.caption,
          media_type: item.media_type,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url,
          permalink: item.permalink,
          timestamp: item.timestamp,
          like_count: item.like_count ?? 0,
          comments_count: item.comments_count ?? 0,
          insights,
        } satisfies PostSummary;
      } catch (error) {
        if (error instanceof FacebookGraphError) {
          console.error("[insights/analysis] media insights error", {
            mediaId: item.id,
            message: error.message,
            payload: error.payload?.error,
          });
        } else {
          console.error("[insights/analysis] media insights error", error);
        }

        return {
          id: item.id,
          caption: item.caption,
          media_type: item.media_type,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url,
          permalink: item.permalink,
          timestamp: item.timestamp,
          like_count: item.like_count ?? 0,
          comments_count: item.comments_count ?? 0,
          insights: {},
        } satisfies PostSummary;
      }
    })
  );

  return enriched;
}

function buildPrompt(posts: PostSummary[]) {
  const dataset = posts.map((post) => ({
    id: post.id,
    mediaType: post.media_type,
    mediaUrl: post.media_url,
    thumbnailUrl: post.thumbnail_url,
    caption: post.caption,
    permalink: post.permalink,
    timestamp: post.timestamp,
    likes: post.like_count,
    comments: post.comments_count,
    insights: post.insights,
  }));

  return [
    "You are an Instagram marketing strategist. Review the supplied posts and determine which one drove the most impact.",
    "Impact should consider total engagement (likes, comments, saves, shares, plays, reach, impressions) when available.",
    "Respond with three sections:",
    "1. `Top Post` — identify the winning post by its ID, media type, AND include the mediaUrl or thumbnailUrl so the user can see which post it is.",
    "2. `Why it worked` — list 2-3 concise bullet points grounded in the metrics and caption.",
    "3. `Recommendations` — provide 3 actionable suggestions to replicate or improve future performance.",
    "",
    "Dataset (JSON):",
    JSON.stringify(dataset, null, 2),
  ].join("\n");
}

async function callOpenAI(prompt: string): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to your environment before requesting analysis."
    );
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a senior social media analyst. Be concise, tactical, and rely strictly on the provided data. Use markdown bullet lists where helpful.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `OpenAI API error (${response.status}): ${details || "no response body"}`
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI did not return any content.");
  }

  return {
    model,
    summary: content,
  };
}

export async function POST(request: NextRequest) {
  const session = await readSessionFromCookies(request.cookies);

  if (!session) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 }
    );
  }

  try {
    const posts = await collectPostSummaries(session);

    if (!posts.length) {
      return NextResponse.json(
        { error: "no_posts", message: "No Instagram posts available yet." },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(posts);
    const analysis = await callOpenAI(prompt);

    return NextResponse.json({
      success: true,
      model: analysis.model,
      summary: analysis.summary,
      analyzedPosts: posts.length,
    });
  } catch (error) {
    console.error("[insights/analysis] failed", error);

    return NextResponse.json(
      {
        error: "analysis_failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error during analysis",
      },
      { status: 500 }
    );
  }
}
