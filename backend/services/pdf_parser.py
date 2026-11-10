"""
Real PDF Document Parser for CareerSync
Validates binary PDF headers, extracts searchable text, and enforces page/size constraints.
"""
import io
from pypdf import PdfReader

class PDFResumeParser:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes, max_pages: int = 10) -> str:
        if not file_bytes or len(file_bytes) < 4:
            raise ValueError("Uploaded file is empty or corrupted.")

        # Validate PDF magic bytes header
        if not file_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid file format. File does not start with standard PDF header.")

        try:
            reader = PdfReader(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document structure: {str(e)}")

        total_pages = len(reader.pages)
        if total_pages == 0:
            raise ValueError("The uploaded PDF document contains no readable pages.")

        if total_pages > max_pages:
            raise ValueError(f"Resume exceeds maximum allowed page count ({max_pages} pages).")

        extracted_text = []
        for i, page in enumerate(reader.pages[:max_pages]):
            text = page.extract_text()
            if text:
                extracted_text.append(text)

        full_text = "\n".join(extracted_text).strip()

        # Scanned image detection
        if len(full_text.split()) < 20:
            raise ValueError(
                "Unable to extract text from PDF. The document appears to be a scanned image. "
                "Please upload a standard text-searchable PDF."
            )

        return full_text