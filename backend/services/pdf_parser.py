"""
Real PDF Document Parser for CareerSync
Extracts plain text and structured blocks from binary PDF uploads.
"""
import io
from pypdf import PdfReader
from typing import Dict, Any

class PDFResumeParser:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes) -> str:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            extracted_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text.append(text)
            return "\n".join(extracted_text)
        except Exception as e:
            return f"Error extracting text from PDF: {str(e)}"