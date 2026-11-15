// ============================================================
// DROPRUGBY - QUIZ DEL DÍA
// /api/quiz-daily  (lo llama el cron de vercel.json una vez por día)
//
// Si el quiz automático está activo (panel → Juegos → Quiz) y el quiz
// publicado no es de hoy, genera uno nuevo y lo guarda.
// Si está configurada CRON_SECRET en Vercel, exige ese token.
// ============================================================

import { r2GetJSON, r2PutJSONSafe } from "../lib/r2.js";
import { migrateSeason } from "../lib/urba.js";
import { generateDailyQuiz, quizDateKey } from "../lib/quiz-ai.js";

const BLOB_PATH = "droprugby/content.json";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: "No autorizado." });
  }

  try {
    const content = await r2GetJSON(BLOB_PATH);
    if (!content || typeof content !== "object") {
      return res.status(500).json({ ok: false, error: "No se pudo leer el contenido." });
    }

    migrateSeason(content);

    const settings = content.games?.quiz || {};
    if (settings.enabled === false || settings.ai === false) {
      return res.status(200).json({ ok: true, skipped: "El quiz automático está desactivado." });
    }

    const today = quizDateKey();
    if (content.quiz?.date === today) {
      return res.status(200).json({ ok: true, skipped: "Ya hay quiz de hoy.", id: content.quiz.id });
    }

    const quiz = await generateDailyQuiz(content, { req, date: today });
    content.quiz = quiz;
    content.quizHistory = [
      { id: quiz.id, date: quiz.date, questions: quiz.questions.map((q) => q.q) },
      ...(Array.isArray(content.quizHistory) ? content.quizHistory : [])
    ].slice(0, 30);
    content.quizAI = {
      lastRun: new Date().toISOString(),
      lastError: quiz.aiError || "",
      model: quiz.model || "",
      source: quiz.source
    };

    await r2PutJSONSafe(BLOB_PATH, content);

    return res.status(200).json({ ok: true, id: quiz.id, source: quiz.source, model: quiz.model, aiError: quiz.aiError });
  } catch (error) {
    console.error("ERROR /api/quiz-daily:", error);
    return res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
}
