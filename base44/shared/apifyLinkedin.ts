/** Posts are billed per result — never fetch more than this per analysis. */
const MAX_POSTS = 20;

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
    runActor(POSTS_ACTOR, token, {
      username: slug,
      page_number: 1,
      limit: MAX_POSTS,
      total_posts: MAX_POSTS,
      maxItems: MAX_POSTS,
    }).catch(() => []),
  ]);

  const raw = profileItems[0];
  if (!raw) throw new Error("Apify returned no profile data for this URL. The profile may be private or unavailable.");

  const p = { ...(raw.basic_info || raw.basicInfo || {}), ...raw };
  const headline = p.headline || p.occupation || p.subTitle || "";
  const about = p.about || p.summary || p.publicIdentifierSummary || p.description || "";

  // Keep only what the engine reads — post text (and its date). All per-post metadata
  // (reactions, comments, images, author and share objects) is dropped here, never stored.
  const postTexts = postItems
    .map((item) => ({
      text: item.text || item.postText || item.content || item?.post?.text || "",
      date: item.posted_at?.date || item.postedAt || item.date || "",
    }))
    .filter((p) => p.text && p.text.trim().length > 30)
    .slice(0, MAX_POSTS)
    .map((p) => p.text);

  const fullName =
    p.fullName ||
    p.fullname ||
    [p.firstName || p.first_name, p.lastName || p.last_name].filter(Boolean).join(" ").trim();

  return {
    profile_url: url,
    full_name: fullName || slug,
    photo_url: p.profile_picture_url || p.profilePicture || p.profilePicUrl || p.picture || "",
    headline,
    about,
    posts: postTexts.join("\n\n---\n\n"),
    posts_count: postTexts.length,
  };
}