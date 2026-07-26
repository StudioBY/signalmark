const PROFILE_ACTOR = "apimaestro~linkedin-profile-detail";
const POSTS_ACTOR = "apimaestro~linkedin-profile-posts";

async function runActor(actorId, token, input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=180`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify actor ${actorId} failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

export function normalizeProfileUrl(url) {
  const match = String(url || "").match(/linkedin\.com\/in\/([A-Za-z0-9\-_%À-ÿ.]+)/i);
  if (!match) throw new Error("Provide a valid LinkedIn profile URL (linkedin.com/in/...)");
  const slug = match[1].replace(/\/$/, "");
  return { url: `https://www.linkedin.com/in/${slug}/`, slug };
}

export async function fetchProfileText(profileUrl, token) {
  const { url, slug } = normalizeProfileUrl(profileUrl);

  const [profileItems, postItems] = await Promise.all([
    runActor(PROFILE_ACTOR, token, { username: slug }),
    runActor(POSTS_ACTOR, token, { username: slug, page_number: 1 }).catch(() => []),
  ]);

  const raw = profileItems[0];
  if (!raw) throw new Error("Apify returned no profile data for this URL. The profile may be private or unavailable.");

  const p = { ...(raw.basic_info || raw.basicInfo || {}), ...raw };
  const headline = p.headline || p.occupation || p.subTitle || "";
  const about = p.about || p.summary || p.publicIdentifierSummary || p.description || "";

  const postTexts = postItems
    .map((item) => item.text || item.postText || item.content || item?.post?.text || "")
    .filter((t) => t && t.trim().length > 30)
    .slice(0, 5);

  return {
    profile_url: url,
    full_name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ") || slug,
    headline,
    about,
    posts: postTexts.join("\n\n---\n\n"),
    posts_count: postTexts.length,
  };
}