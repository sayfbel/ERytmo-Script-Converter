class ScriptImportError(Exception):
    """Base exception for all script import and parsing errors."""
    def __init__(self, user_title, user_message, suggestion=None, technical_details=None):
        super().__init__(user_message)
        self.user_title = user_title
        self.user_message = user_message
        self.suggestion = suggestion or "Please check your script format and try importing it again."
        self.technical_details = technical_details or ""

class UnsupportedFormatError(ScriptImportError):
    def __init__(self, extension):
        title = "Unsupported File Format"
        msg = f"The file extension '{extension}' is currently not supported."
        suggestion = "Please select a supported file format (.docx, .pdf, .txt, or .text)."
        super().__init__(title, msg, suggestion)

class EmptyFileError(ScriptImportError):
    def __init__(self, file_name):
        title = "Empty Script File"
        msg = f"The selected file '{file_name}' contains no content or data."
        suggestion = "Please select a valid script file containing dialogue cues and timecodes."
        super().__init__(title, msg, suggestion)

class FileAccessError(ScriptImportError):
    def __init__(self, file_name, original_error):
        title = "Unable to Read File"
        msg = f"Could not access or open '{file_name}'. The file may be in use by another application or corrupt."
        suggestion = "Please ensure the file is closed in Word or other apps, then try again."
        super().__init__(title, msg, suggestion, technical_details=str(original_error))

class FileCorruptedError(ScriptImportError):
    def __init__(self, file_name, original_error):
        title = "Corrupted Document Format"
        msg = f"The file '{file_name}' appears to be corrupted or damaged and cannot be parsed."
        suggestion = "Please open the file in Microsoft Word or a text editor, resave it, and import again."
        super().__init__(title, msg, suggestion, technical_details=str(original_error))

class NoTimecodesFoundError(ScriptImportError):
    def __init__(self, file_name):
        title = "No Timecodes Detected"
        msg = f"No valid timecodes (e.g. 05:00:00:00 or 05:00:00) were found in '{file_name}'."
        suggestion = (
            "Ensure your script contains timecodes in standard SMPTE format (HH:MM:SS:FF or HH:MM:SS) "
            "placed before character names and dialogue lines."
        )
        super().__init__(title, msg, suggestion)

class MissingRequiredFieldsError(ScriptImportError):
    def __init__(self, missing_fields):
        title = "Missing Required Script Fields"
        fields_str = ", ".join(missing_fields)
        msg = f"The script is missing required fields or columns: {fields_str}."
        suggestion = "Ensure your script includes timecodes, character names, and dialogue text."
        super().__init__(title, msg, suggestion)
