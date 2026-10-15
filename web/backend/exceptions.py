class ScriptImportError(Exception):
    def __init__(self, title, message="", suggestion=""):
        self.title = title
        self.message = message
        self.suggestion = suggestion
        super().__init__(f"{title}: {message}")

class UnsupportedFormatError(ScriptImportError):
    pass

class EmptyFileError(ScriptImportError):
    pass

class FileAccessError(ScriptImportError):
    pass

class FileCorruptedError(ScriptImportError):
    pass

class NoTimecodesFoundError(ScriptImportError):
    pass

class MissingRequiredFieldsError(ScriptImportError):
    pass
