import google.generativeai as genai
import json
import uuid
from typing import Optional, List
from app.config import get_settings

settings = get_settings()


def _configure_gemini():
    """Configure the Gemini API with the API key."""
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)


def _get_model():
    """Get a Gemini generative model instance."""
    _configure_gemini()
    return genai.GenerativeModel("gemini-2.5-flash-lite")


async def chat_with_tutor(
    message: str,
    node_topic: Optional[str] = None,
    roadmap_title: Optional[str] = None,
    chat_history: Optional[List[dict]] = None,
) -> str:
    """
    Send a message to the AI Tutor and get a response.
    Context-aware: knows the current node topic and roadmap.
    """
    model = _get_model()

    # Build system context
    context_parts = ["You are an expert corporate trainer and learning mentor on the SkillNexus platform."]
    if roadmap_title:
        context_parts.append(f"The learner is following the '{roadmap_title}' learning roadmap.")
    if node_topic:
        context_parts.append(f"The learner is currently studying the topic: '{node_topic}'.")
    context_parts.append(
        "Keep your answers concise, practical, and encouraging. "
        "Use examples when helpful. If the learner asks you to quiz them, "
        "generate relevant questions about the current topic."
    )
    system_prompt = " ".join(context_parts)

    # Build conversation history for context
    history_text = ""
    if chat_history:
        recent = chat_history[-10:]  # Last 10 messages for context
        for msg in recent:
            role_label = "Learner" if msg["role"] == "user" else "Tutor"
            history_text += f"\n{role_label}: {msg['content']}"

    full_prompt = f"""{system_prompt}

{f"Previous conversation:{history_text}" if history_text else ""}

Learner: {message}

Tutor:"""

    try:
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        return f"I'm sorry, I'm having trouble connecting right now. Please try again. (Error: {str(e)})"


async def generate_quiz(
    node_topic: str,
    num_questions: int = 3,
) -> dict:
    """
    Generate a quiz with multiple-choice questions for a given topic.
    Returns: {questions: [{question, options, correct_index}]}
    """
    model = _get_model()

    prompt = f"""You are a quiz generator for a corporate training platform.
Generate exactly {num_questions} multiple-choice questions about "{node_topic}".

You MUST respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{{
    "questions": [
        {{
            "question": "What is...",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_index": 0
        }}
    ]
}}

Rules:
- Each question must have exactly 4 options
- correct_index is 0-based (0, 1, 2, or 3)
- Questions should test practical understanding, not just memorization
- Make questions progressively harder
"""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        # Try to extract JSON from response
        if response_text.startswith("```"):
            # Remove markdown code block
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        return json.loads(response_text)
    except (json.JSONDecodeError, Exception) as e:
        raise ValueError(f"AI Quiz Generation failed. Please try again. Detailed Error: {str(e)}")


async def verify_quiz_answers(
    node_topic: str,
    questions: List[dict],
    user_answers: List[int],
) -> dict:
    """
    Verify quiz answers and provide feedback.
    """
    correct_count = 0
    correct_answers = []

    for i, q in enumerate(questions):
        correct_idx = q.get("correct_index", 0)
        correct_answers.append(correct_idx)
        if i < len(user_answers) and user_answers[i] == correct_idx:
            correct_count += 1

    total = len(questions)
    passed = correct_count >= (total * 0.7)  # 70% to pass

    # Generate feedback using AI
    model = _get_model()
    try:
        feedback_prompt = f"""The learner just took a quiz on "{node_topic}" and scored {correct_count}/{total}.
{"They passed!" if passed else "They didn't pass this time."}
Give a brief (2-3 sentences) encouraging feedback. If they didn't pass, suggest what to review."""

        response = model.generate_content(feedback_prompt)
        feedback = response.text.strip()
    except Exception:
        feedback = (
            f"You scored {correct_count}/{total}. "
            + ("Great job! You've demonstrated solid understanding." if passed
               else "Keep studying and try again. You're making progress!")
        )

    return {
        "score": correct_count,
        "total": total,
        "passed": passed,
        "correct_answers": correct_answers,
        "feedback": feedback,
    }


async def recommend_roadmaps(skills: List[str], available_roadmaps: List[dict]) -> List[str]:
    """
    AI-powered roadmap recommender based on extracted resume skills and actual database roadmaps.
    """
    if not available_roadmaps:
        return []

    model = _get_model()

    # Format available roadmaps for the prompt
    roadmap_descriptions = ""
    for rm in available_roadmaps:
        roadmap_descriptions += f"- Title: {rm['title']}\n"
        if rm.get('description'):
            roadmap_descriptions += f"  Description: {rm['description']}\n"

    skills_text = ", ".join(skills) if skills else "No specific technical skills listed."

    generation_prompt = f"""You are an expert career counselor for a platform called SkillNexus.
Recommend the best learning roadmaps for a user based on their extracted resume skills.

User skills:
{skills_text}

Available roadmaps:
{roadmap_descriptions}

You MUST respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{{
    "recommended_roadmaps": ["Roadmap Title 1", "Roadmap Title 2"]
}}

Rules:
- You ONLY choose roadmap titles from the exact "Available roadmaps" list provided above.
- Match the titles exactly as they are provided. Do not invent new roadmaps.
- Recommend between 1 to 3 of the most relevant roadmaps.
"""

    try:
        response = model.generate_content(generation_prompt)
        response_text = response.text.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        data = json.loads(response_text)
        return data.get("recommended_roadmaps", [])
    except (json.JSONDecodeError, Exception) as e:
        print(f"Failed to generate AI roadmap recommendations: {str(e)}")
        # Fallback to random or basic matching if AI fails, or just return empty
        return []

async def generate_roadmap_from_prompt(prompt: str) -> dict:
    """
    AI Roadmap Generator: Generate a complete roadmap JSON structure from a text prompt.
    Bonus feature for admins.
    """
    model = _get_model()

    generation_prompt = f"""You are a learning roadmap architect for a corporate training platform called SkillNexus.
Based on the following request, generate a complete learning roadmap with a hierarchical node structure.

Request: "{prompt}"

You MUST respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{{
    "title": "Roadmap Title",
    "description": "Brief description of the learning path",
    "category": "Technology/Management/etc",
    "nodes": [
        {{
            "title": "Topic Name",
            "description": "What the learner will study",
            "resource_links": [{{"title": "Resource Name", "url": "https://example.com"}}],
            "children": [
                {{
                    "title": "Sub-topic",
                    "description": "Description",
                    "resource_links": [],
                    "children": []
                }}
            ]
        }}
    ]
}}

Rules:
- Create a realistic, comprehensive learning path with 3-6 top-level topics
- Each topic can have 2-4 subtopics (children)
- Subtopics can have their own children (up to 4 levels deep)
- Include real, relevant resource links where possible (official docs, tutorials)
- Order topics from foundational to advanced
- Total should be 15-40 nodes
"""

    try:
        response = model.generate_content(generation_prompt)
        response_text = response.text.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        return json.loads(response_text)
    except (json.JSONDecodeError, Exception) as e:
        raise ValueError(f"Failed to generate roadmap: {str(e)}")
