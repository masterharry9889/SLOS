# app/agents/assessment_agent.py
"""AssessmentAgent: grade MCQ deterministically; grade written answers against a rubric with score, feedback, and missing_points; return topic-level weakness stats."""

import os
from app.core import LLMWrapper


class AssessmentAgent:
    def __init__(self, llm: LLMWrapper):
        self.llm = llm

    def grade_mcq(self, question: dict, student_answer: str, answer_key: str) -> dict:
        """Grade a multiple-choice question deterministically."""
        is_correct = student_answer.strip() == answer_key.strip()
        return {
            "is_correct": is_correct,
            "score": 1 if is_correct else 0,
            "feedback": "Correct" if is_correct else "Incorrect - the correct answer is " + answer_key,
            "missing_points": [] if is_correct else ["Selected incorrect option"]
        }

    def grade_written(self, question: dict, student_answer: str, rubric: dict) -> dict:
        """Grade a written answer against a rubric."""
        prompt = (
            "Grade the following student answer against the provided rubric.\n"
            "Return JSON with: score (int), feedback (str), missing_points (list of str).\n\n"
            "RUBIC: " + str(rubic) + "\n\n"
            "STUDENT ANSWER: " + student_answer + "\n\n"
            "JSON schema: {{\\n"
            '    "score": int,\n'
            '    "feedback": str,\n'
            '    "missing_points": [str]\n'
            "}}\n\n"
            "Return ONLY the JSON, no surrounding analysis or quotes."
        )

        response = self.llm.models["assess"](
            prompt
        )

        try:
            result = json.loads(response.strip())
            # Ensure required fields
            if "score" not in result:
                result["score"] = 0
            if "feedback" not in result:
                result["feedback"] = "No feedback provided"
            if "missing_points" not in result:
                result["missing_points"] = []
            return result
        except json.JSONDecodeError:
            return {
                "score": 0,
                "feedback": "Could not parse grading output",
                "missing_points": []
            }

    def topic_weakness_stats(self, results: list) -> dict:
        """Return topic-level weakness stats from assessment results."""
        # Aggregate by topic_id
        topic_stats = {}
        for r in results:
            topic = r.get("topic_id", "unknown")
            if topic not in topic_stats:
                topic_stats[topic] = {"errors": 0, "topics_attempted": 0}
            topic_stats[topic]["errors"] += r.get("missing_points", []) if isinstance(r.get("missing_points"), list) else []
            topic_stats[topic]["topics_attempted"] += 1

        # Calculate weakness percentages
        for topic, stats in topic_stats.items():
            if stats["topics_attempted"] > 0:
                stats["weakness_percent"] = (
                    len(stats["errors"]) / stats["topics_attempted"] / 10
                ) * 100
            else:
                stats["weakness_percent"] = 0

        return topic_stats