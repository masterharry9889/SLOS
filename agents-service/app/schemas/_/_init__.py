# app/schemas/__init__.py
from pydantic import BaseModel, Field

# Topic tree from uploaded document
class TopicTree(BaseModel):
    subject_title: str
    source_type: str  # "syllabus" | "content"
    units: list  # [{title, chapters: [{title, concepts: [str], source_spans: [{"page": int, "start": int, "end": int}]}]}]

# Notes request
class NotesRequest(BaseModel):
    chapter_id: str
    subject_context: str
    mode: str  # "grounded" | "knowledge"
    depth: str  # "brief" | "standard" | "detailed"

# Cheat sheet request
class CheatSheetRequest(BaseModel):
    scope: str  # "chapter" | "unit" | "subject"
    format: str  # "one_page" | "formulas_only" | "last_minute"

# Paper blueprint
class PaperQuestionType(BaseModel):
    count: int
    marks: int

class PaperBlueprint(BaseModel):
    chapters: list
    total_marks: int
    duration_min: int
    difficulty_mix: str  # "easy" | "medium" | "hard"
    question_types: dict[str, PaperQuestionType]  # e.g. {"mcq": {"count": 5, "marks": 1}}
    past_paper_pattern: str = Field(default=None)

# Assessment request
class AssessmentRequest(BaseModel):
    attempt_id: str
    typed_answers: dict

# Paper question output
class PaperQuestion(BaseModel):
    id: str
    type: str
    marks: int
    topic_id: str
    difficulty: str
    text: str
    options: dict = Field(default=None)  # for MCQ
    answer_key: str
    marking_scheme: dict

class PaperOutput(BaseModel):
    sections: list
    questions: list[PaperQuestion]
    answer_key: dict
    marking_scheme: dict