from keybert import KeyBERT

_kw_model = None

def get_model():
    global _kw_model
    if _kw_model is None:
        _kw_model = KeyBERT()
    return _kw_model

def extract_topics(text: str, n: int = 10) -> list[str]:
    model = get_model()
    keywords = model.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 2),
        stop_words="english",
        top_n=n
    )
    return [kw[0] for kw in keywords]