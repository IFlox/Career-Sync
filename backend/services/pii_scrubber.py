import re
from typing import List, Tuple

class PIIScrubberService:
    """
    Scrubs Personally Identifiable Information (PII) before LLM or agent loops.
    """
    EMAIL_REGEX = r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
    PHONE_REGEX = r'(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,5}'
    ADDRESS_REGEX = r'(?:Room|Flat|Hostel|Sector|Apts|Apartment|Street|Road|Nagar|Colony)[\w\s,-]{5,35}'

    @classmethod
    def scrub(cls, text: str) -> Tuple[str, List[str]]:
        if not text:
            return "", []

        audit_log = []
        cleaned = text

        # 1. Email Masking
        def email_repl(match):
            audit_log.append("Email Masked: [PROTECTED_EMAIL]")
            return "[PROTECTED_EMAIL]"
        cleaned = re.sub(cls.EMAIL_REGEX, email_repl, cleaned, flags=re.IGNORECASE)

        # 2. Phone Masking
        def phone_repl(match):
            if len(match.group(0).strip()) >= 8:
                audit_log.append("Phone Masked: [PROTECTED_PHONE]")
                return "[PROTECTED_PHONE]"
            return match.group(0)
        cleaned = re.sub(cls.PHONE_REGEX, phone_repl, cleaned)

        # 3. Address Masking
        def addr_repl(match):
            audit_log.append("Address Masked: [PROTECTED_RESIDENCE]")
            return "[PROTECTED_RESIDENCE]"
        cleaned = re.sub(cls.ADDRESS_REGEX, addr_repl, cleaned, flags=re.IGNORECASE)

        return cleaned, audit_log