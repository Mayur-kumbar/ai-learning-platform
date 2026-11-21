
from youtube_transcript_api import YouTubeTranscriptApi


def fetch_youtube_transcript(
    video_id: str,
    preferred_languages=None,
    translate_to_english=False
) -> dict:
    """
    Fetch the best available YouTube transcript.

    Returns:
        success: bool
        transcript: str | None
        error: str | None
        language: str | None
        language_code: str | None
        is_generated: bool | None
        is_translated: bool
    """

    if preferred_languages is None:
        preferred_languages = ["en"]

    try:
        api = YouTubeTranscriptApi()

        # Step 1: Get all available transcripts
        transcript_list = api.list(video_id)

        # Step 2: Print available languages
        print("Available transcripts:")

        for item in transcript_list:
            print(
                f"- {item.language} ({item.language_code}) "
                f"| Generated: {item.is_generated} "
                f"| Translatable: {item.is_translatable}"
            )

        # Step 3: Select transcript
        selected = None

        # First preference: requested languages
        try:
            selected = transcript_list.find_transcript(
                preferred_languages
            )
        except Exception:
            pass

        # Second preference: any available transcript
        if selected is None:
            selected = next(iter(transcript_list), None)

        if selected is None:
            return {
                "success": False,
                "transcript": None,
                "error": "No transcripts available for this video.",
                "language": None,
                "language_code": None,
                "is_generated": None,
                "is_translated": False,
            }

        is_translated = False

        # Step 4: Optionally translate into English
        if (
            translate_to_english
            and selected.language_code != "en"
        ):
            if selected.is_translatable:
                selected = selected.translate("en")
                is_translated = True
            else:
                print("English translation unavailable. Using original.")

        # Step 5: Fetch transcript
        fetched = selected.fetch()

        transcript_text = " ".join(
            snippet.text for snippet in fetched.snippets
        ).strip()

        if not transcript_text:
            raise ValueError("Transcript contains empty content.")

        return {
            "success": True,
            "transcript": transcript_text,
            "error": None,
            "language": fetched.language,
            "language_code": fetched.language_code,
            "is_generated": fetched.is_generated,
            "is_translated": is_translated,
        }

    except Exception as e:
        return {
            "success": False,
            "transcript": None,
            "error": f"{type(e).__name__}: {str(e)}",
            "language": None,
            "language_code": None,
            "is_generated": None,
            "is_translated": False,
        }


# ---------------- TEST ----------------

if __name__ == "__main__":

    VIDEO_ID = "gm5DcqzZ3f4"

    result = fetch_youtube_transcript(
        video_id=VIDEO_ID,
        preferred_languages=["en"],
        translate_to_english=True
    )

    if result["success"]:

        print("\nSUCCESS!")
        print("Language:", result["language"])
        print("Language code:", result["language_code"])
        print("Auto-generated:", result["is_generated"])
        print("Translated:", result["is_translated"])

        print("\nTranscript preview:\n")
        print(result["transcript"][:1000])

    else:
        print("\nFAILED:", result["error"])
