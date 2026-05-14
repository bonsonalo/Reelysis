import re
from app.core.logger import logger

def validate_password_strength(password: str) -> str:
    if not len(password) > 5:
        raise ValueError("Password length should be more than 5")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password should atleast contain 1 Upper case letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password should contain lower case letter")
    if not re.search(r"\d", password):
        raise ValueError("Password should contain atleast 1 digit")
    if not re.search(r"[!@#$%^&*(){}/'.,]", password):
        raise ValueError("Password should contain special case letter")
    logger.info("Password validated")
    return password