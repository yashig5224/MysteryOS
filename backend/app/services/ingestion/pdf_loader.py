import fitz

def extract_pdf_text(path: str) -> str:
    document = fitz.open(path)
    return "\n".join(page.get_text() for page in document)
