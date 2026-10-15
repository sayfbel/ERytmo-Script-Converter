import os
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken

def _get_fernet_instance() -> Fernet:
    """
    Derives a consistent 32-byte urlsafe-base64 Fernet key
    from ENCRYPTION_KEY or JWT_SECRET.
    """
    raw_secret = os.environ.get("ENCRYPTION_KEY") or os.environ.get("JWT_SECRET") or "erytmo_super_secret_jwt_key_change_in_production_2026"
    # Hash the secret to ensure it is exactly 32 bytes, then base64 encode for Fernet
    key_bytes = hashlib.sha256(raw_secret.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

def encrypt_secret(plaintext: str) -> str:
    """
    Encrypts a secret string at rest using AES-CBC/HMAC-SHA256 (Fernet).
    """
    if not plaintext:
        return ""
    # If already encrypted, return as is
    if plaintext.startswith("gAAAAA"):
        try:
            _get_fernet_instance().decrypt(plaintext.encode("utf-8"))
            return plaintext
        except Exception:
            pass
    fernet = _get_fernet_instance()
    encrypted_bytes = fernet.encrypt(plaintext.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def decrypt_secret(ciphertext: str) -> str:
    """
    Decrypts an encrypted string.
    Gracefully returns plaintext as fallback for backward compatibility
    with existing unencrypted records.
    """
    if not ciphertext:
        return ""
    if not ciphertext.startswith("gAAAAA"):
        # Not a Fernet token, assume existing plaintext
        return ciphertext
    try:
        fernet = _get_fernet_instance()
        decrypted_bytes = fernet.decrypt(ciphertext.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except (InvalidToken, Exception):
        # Fallback to original value if decryption fails
        return ciphertext
