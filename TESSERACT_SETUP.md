# Resume Parser Setup

## Install Tesseract OCR

**Windows:**
1. Download Tesseract installer: https://github.com/UB-Mannheim/tesseract/wiki
2. Run installer (default location: `C:\Program Files\Tesseract-OCR\`)
3. Add to PATH or configure in code

**After installation, add this to `app/api/resume_parser.py` at the top:**

```python
# Windows Tesseract path (if not in PATH)
import platform
if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

## Quick Test
```bash
python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
```

## API Usage
```javascript
// Frontend
const formData = new FormData();
formData.append('file', resumeFile);
const response = await api.post('/parse-resume', formData);
```
