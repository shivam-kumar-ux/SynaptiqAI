// js/youtube.js — YouTube Learning Resources Integration for SYNAPTIQAI

export async function fetchTopicVideos(topicName, subject = "", weaknessType = "concept", limit = 4) {
  let queryPrefix = "";
  switch (weaknessType) {
    case "concept":
    case "conceptual":
      queryPrefix = "concept explanation visual tutorial";
      break;
    case "application":
      queryPrefix = "solved examples problem solving step by step";
      break;
    case "revision":
    case "memory":
      queryPrefix = "one shot quick revision summary";
      break;
    case "exam_prep":
    case "calculation":
      queryPrefix = "exam questions previous year solved";
      break;
    default:
      queryPrefix = "explanation tutorial";
  }

  const query = `${subject} ${topicName} ${queryPrefix}`.trim();

  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        return data.videos;
      }
    }
  } catch {}

  // Local fallback curated search link objects if server API unavailable
  const encodedQ = encodeURIComponent(`${subject} ${topicName} tutorial`);
  return [
    {
      videoId: "search_1",
      title: `${topicName} - Full Concept & Solved Examples`,
      channel: "Academic AI Learning",
      duration: "15:40",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      url: `https://www.youtube.com/results?search_query=${encodedQ}`
    },
    {
      videoId: "search_2",
      title: `${topicName} - Quick Revision & Exam Questions`,
      channel: "Exam Readiness Prep",
      duration: "10:20",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      url: `https://www.youtube.com/results?search_query=${encodedQ}+revision`
    }
  ];
}
