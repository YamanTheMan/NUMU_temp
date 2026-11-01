
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from api.openai_api import ask_tutor

router = APIRouter(
    prefix="/api/tutor",
    tags=["Musaid"]
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class TutorRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    language: Literal["en", "ar"] = "en"
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=10
    )


@router.post("/ask")
def ask_musaid(request: TutorRequest):
    try:
        conversation = []

        for message in request.history:
            speaker = (
                "Student"
                if message.role == "user"
                else "Musa'id"
            )

            conversation.append(
                f"{speaker}: {message.content}"
            )

        conversation.append(
            f"Student: {request.question}"
        )

        prompt = (
            "Continue this financial education conversation. "
            "Use earlier messages only as conversation context. "
            "Explain clearly for a beginner. "
            "Do not give personalized investment advice.\n\n"
            + "\n".join(conversation)
            + "\nMusa'id:"
        )

        answer = ask_tutor(
            question=prompt,
            language=request.language
        )

        return {
            "answer": answer,
            "language": request.language
        }

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Musa'id is temporarily unavailable."
        )
