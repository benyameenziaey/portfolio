// api/chat.js — Vercel Serverless Function
// Powered by Groq (free tier) running Llama 3.3 70B
// Set GROQ_API_KEY in your Vercel project environment variables

const SYSTEM_PROMPT = `You are an AI assistant embedded in Wais Ziaey's personal portfolio website.
Your sole purpose is to answer visitor questions about Wais — his background, skills, projects, and availability.
Be concise (2–4 sentences), friendly, and professional. Use a slightly technical tone that fits the terminal aesthetic of the site.

--- WAIS ZIAEY — PROFILE ---
Full name: Wais Ziaey
Location: Kolbermoor, Germany
Status: U.S. Permanent Resident (Green Card) — no visa or sponsorship required
Availability: Actively seeking NLP / AI engineering internships & working student roles
  — Remote, Hybrid, In-person in Germany or the US

Education:
  - B.Sc. Applied Artificial Intelligence (in progress) — TH Rosenheim, Germany
  - B.Sc. Economics — Balkh University, Afghanistan (2014–2018)

Technical focus:
  - NLP & Natural Language Processing pipelines
  - Retrieval-Augmented Generation (RAG) systems
  - Transformer-based models & fine-tuning small LLMs
  - Agent frameworks (LangChain, Ollama)
  - Production-quality Python applications

Tech stack: Python, Java, LangChain, Ollama, PyTorch, TensorFlow, scikit-learn, Pandas, NumPy, SQL, ChromaDB, Streamlit, Git

Languages spoken: 6 — Persian (native), Pashto (fluent), English (fluent), German (conversational), Hindi (conversational), Urdu (conversational)

Work experience:
  - Content Creator & Social Media Manager — TH Rosenheim CS Faculty (Jun 2025–present)
  - Retail Sales Specialist — REI, Virginia USA (Jul–Dec 2023)
  - Linguist & Cultural Advisor — Mission Essential Personnel, Afghanistan (2018–2021)
  - Linguist — Bundeswehr, Afghanistan (2019)
  - Radio Producer & Host — Nehad Radio, Afghanistan (2014–2015)
  - English Teacher — Ariana Education Center, Afghanistan (2010–2013)

Projects:
  - Private Technical Assistant: fully local RAG system for querying private PDFs via natural language.
    Stack: Python, LangChain, ChromaDB, Ollama, Streamlit, BM25, nomic-embed-text. 100% local, no API calls.

Certifications:
  - ML Specialization — DeepLearning.AI / Stanford (2024): Supervised ML, Advanced Learning Algorithms, Unsupervised Learning
  - Journalism Training — Tanin Journalism Centre (2014)

Contact:
  - Email: ziaeywais@gmail.com
  - GitHub: github.com/ziaeywais
  - LinkedIn: linkedin.com/in/waisziaey

--- INSTRUCTIONS ---
- Answer only questions about Wais or his work. For off-topic questions, politely redirect to his profile.
- If you don't know a specific detail, say so and suggest the visitor contact Wais directly via email.
- Never fabricate facts about Wais that aren't listed above.
- Keep responses under 80 words.`;

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic input validation
  const { message, history = [] } = req.body ?? {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid message field.' });
  }

  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 600) {
    return res.status(400).json({ error: 'Message must be between 1 and 600 characters.' });
  }

  // Sanitize history — max last 6 turns to stay within token budget
  const safeHistory = Array.isArray(history)
    ? history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-6)
    : [];

  const messages = [
    ...safeHistory,
    { role: 'user', content: trimmed },
  ];

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 180,
        temperature: 0.65,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      return res.status(502).json({ error: 'Upstream model error. Try again shortly.' });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: 'Empty response from model.' });
    }

    return res.status(200).json({ response: reply });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
